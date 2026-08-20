import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return { ...actual, updateOwnUserProfile: vi.fn() };
});

import * as authDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user: AuthenticatedUser | null = {
  id: 71,
  openId: "profile-owner-71",
  email: "owner@example.com",
  phone: "+905551112233",
  emailVerifiedAt: new Date(),
  phoneVerifiedAt: new Date(),
  name: "Profil Sahibi",
  loginMethod: "local",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
}): TrpcContext {
  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("auth.updateProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires the caller's authenticated session before any profile write", async () => {
    await expect(appRouter.createCaller(createContext(null)).auth.updateProfile({
      name: "Yetkisiz Kullanıcı", email: "unauthorized@example.com", phone: null,
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(authDb.updateOwnUserProfile).not.toHaveBeenCalled();
  });

  it("validates a self-service contact profile before persisting it", async () => {
    await expect(appRouter.createCaller(createContext()).auth.updateProfile({
      name: "A", email: "not-an-email", phone: null,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(authDb.updateOwnUserProfile).not.toHaveBeenCalled();
  });

  it("writes only the authenticated user's normalized name and never overwrites an unchanged primary contact", async () => {
    const user = createContext().user!;
    vi.mocked(authDb.updateOwnUserProfile).mockResolvedValue({ user } as never);

    await expect(appRouter.createCaller(createContext()).auth.updateProfile({
      name: "  Yeni Profil  ", email: "OWNER@EXAMPLE.COM", phone: "+905551112233",
    })).resolves.toMatchObject({
      user: { id: 71, email: "owner@example.com" },
      emailVerificationRequired: false,
      phoneVerificationRequired: false,
    });
    expect(authDb.updateOwnUserProfile).toHaveBeenCalledWith({
      userId: 71, name: "Yeni Profil",
    });
  });

  it("maps an already claimed email to a conflict without exposing another account", async () => {
    vi.mocked(authDb.updateOwnUserProfile).mockRejectedValue(new Error("PROFILE_EMAIL_IN_USE"));
    await expect(appRouter.createCaller(createContext()).auth.updateProfile({
      name: "Profil Sahibi", email: "used@example.com", phone: null,
    })).rejects.toMatchObject({ code: "CONFLICT", message: "Bu e-posta başka bir hesap tarafından kullanılıyor" });
  });
});
