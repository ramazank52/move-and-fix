import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    createLocalUser: vi.fn(),
    getUserByEmailNormalized: vi.fn(),
    listLocalAuthSessions: vi.fn(),
    revokeLocalAuthSession: vi.fn(),
    revokeOtherLocalAuthSessions: vi.fn(),
    revokeAdminMfaGrantsForUser: vi.fn(),
    getActiveAuthChallenge: vi.fn(),
    getLatestActiveAuthChallenge: vi.fn(),
    updateLocalCredentialPassword: vi.fn(),
    markAuthChallengeUsed: vi.fn(),
  };
});

import * as authDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(options: { id?: number; phone?: string | null; user?: AuthenticatedUser | null } = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: options.id ?? 71,
    openId: `local-auth-${options.id ?? 71}`,
    email: `local-auth-${options.id ?? 71}@example.com`,
    phone: options.phone ?? null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "Yerel Auth Testi",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user: options.user === undefined ? user : options.user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("local authentication security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed registration payloads before any account is created", async () => {
    const caller = appRouter.createCaller(createContext({ user: null }));

    await expect(caller.auth.register({
      name: "A",
      email: "not-an-email",
      password: "short",
      accountType: "customer",
      nativeSession: true,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(authDb.createLocalUser).not.toHaveBeenCalled();
  });

  it("does not disclose whether an unknown local account exists during login", async () => {
    vi.mocked(authDb.getUserByEmailNormalized).mockResolvedValue(null);
    const caller = appRouter.createCaller(createContext({ user: null }));

    await expect(caller.auth.login({ identifier: "missing@example.com", password: "NotTheRealPassword1", nativeSession: true }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED", message: "E-posta veya parola hatalı" });
    expect(authDb.getUserByEmailNormalized).toHaveBeenCalledWith("missing@example.com");
  });

  it("keeps password-reset account enumeration fail-closed", async () => {
    vi.mocked(authDb.getUserByEmailNormalized).mockResolvedValue(null);
    const caller = appRouter.createCaller(createContext({ user: null }));

    await expect(caller.auth.requestPasswordReset({ email: "missing@example.com" })).resolves.toEqual({ accepted: true });
  });

  it("revokes every local session and active admin MFA grant after a successful password reset", async () => {
    const local = {
      user: { ...createContext().user!, id: 71 },
      credential: { userId: 71 },
    };
    vi.mocked(authDb.getUserByEmailNormalized).mockResolvedValue(local as never);
    vi.mocked(authDb.getActiveAuthChallenge).mockResolvedValue({ id: 901 } as never);
    vi.mocked(authDb.updateLocalCredentialPassword).mockResolvedValue(undefined);
    vi.mocked(authDb.revokeOtherLocalAuthSessions).mockResolvedValue(3);
    vi.mocked(authDb.revokeAdminMfaGrantsForUser).mockResolvedValue(2);
    vi.mocked(authDb.markAuthChallengeUsed).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createContext({ user: null }));
    await expect(caller.auth.resetPassword({
      email: "local-auth-71@example.com",
      code: "123456",
      password: "NewSecurePassword123",
    })).resolves.toEqual({ success: true, revokedSessions: 3 });

    expect(authDb.revokeOtherLocalAuthSessions).toHaveBeenCalledWith({
      userId: 71,
      currentSessionId: null,
      reason: "password_reset",
    });
    expect(authDb.revokeAdminMfaGrantsForUser).toHaveBeenCalledWith(71);
  });

  it("requires a signed-in session for verification and refuses phone verification without a stored phone", async () => {
    const anonymous = appRouter.createCaller(createContext({ user: null }));
    await expect(anonymous.auth.verifyCode({ purpose: "verify_email", code: "123456" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const signedInWithoutPhone = appRouter.createCaller(createContext({ phone: null }));
    await expect(signedInWithoutPhone.auth.requestVerification({ purpose: "verify_phone" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("lists only the caller-owned server-side local sessions and exposes the current session marker", async () => {
    const context = { ...createContext(), localSessionId: "8d2ec052-919e-443f-9eeb-a35a2f9b8d11" };
    vi.mocked(authDb.listLocalAuthSessions).mockResolvedValue([
      {
        id: context.localSessionId,
        userAgent: "Move&Fix/1.0",
        createdAt: new Date(),
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        revokeReason: null,
      },
    ]);

    await expect(appRouter.createCaller(context).auth.sessions()).resolves.toMatchObject({
      currentSessionId: context.localSessionId,
      sessions: [{ id: context.localSessionId }],
    });
    expect(authDb.listLocalAuthSessions).toHaveBeenCalledWith(71);
  });

  it("revokes only a caller-owned session and clears the cookie when the current session is revoked", async () => {
    const context = { ...createContext(), localSessionId: "0a5170df-e5c8-43b8-a89c-914bd99850f8" };
    vi.mocked(authDb.revokeLocalAuthSession).mockResolvedValue(true);

    await expect(appRouter.createCaller(context).auth.revokeSession({ sessionId: context.localSessionId })).resolves.toEqual({ revoked: true });
    expect(authDb.revokeLocalAuthSession).toHaveBeenCalledWith({
      userId: 71,
      sessionId: context.localSessionId,
      reason: "user_revoked",
    });
    expect(context.res.clearCookie).toHaveBeenCalled();
  });

  it("refuses a session identifier that is not active and owned by the caller", async () => {
    vi.mocked(authDb.revokeLocalAuthSession).mockResolvedValue(false);

    await expect(appRouter.createCaller(createContext()).auth.revokeSession({
      sessionId: "5f7d5d9e-35dd-4140-a5cc-938c98ce7c30",
      })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("revokes all other server-side sessions only for the authenticated owner", async () => {
    const context = { ...createContext(), localSessionId: "0a5170df-e5c8-43b8-a89c-914bd99850f8" };
    vi.mocked(authDb.revokeOtherLocalAuthSessions).mockResolvedValue(2);

    await expect(appRouter.createCaller(context).auth.revokeOtherSessions()).resolves.toEqual({ revokedCount: 2 });
    expect(authDb.revokeOtherLocalAuthSessions).toHaveBeenCalledWith({
      userId: 71,
      currentSessionId: context.localSessionId,
      reason: "user_revoked_others",
    });
  });
});
