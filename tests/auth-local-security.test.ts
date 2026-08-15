import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    createLocalUser: vi.fn(),
    getUserByEmailNormalized: vi.fn(),
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

  it("requires a signed-in session for verification and refuses phone verification without a stored phone", async () => {
    const anonymous = appRouter.createCaller(createContext({ user: null }));
    await expect(anonymous.auth.verifyCode({ purpose: "verify_email", code: "123456" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const signedInWithoutPhone = appRouter.createCaller(createContext({ phone: null }));
    await expect(signedInWithoutPhone.auth.requestVerification({ purpose: "verify_phone" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
