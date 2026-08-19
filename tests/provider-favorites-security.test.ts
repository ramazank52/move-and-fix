import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  getFavoriteProviders: vi.fn(),
  isFavoriteProvider: vi.fn(),
  addFavoriteProvider: vi.fn(),
  removeFavoriteProvider: vi.fn(),
}));

import * as favoritesDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 55): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `favorites-user-${id}`,
    email: `favorites-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "Favorites Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("provider favorites router security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives favorite list ownership from the authenticated session", async () => {
    vi.mocked(favoritesDb.getFavoriteProviders).mockResolvedValue([]);
    const caller = appRouter.createCaller(createContext(55));

    await expect(caller.provider.favoriteList()).resolves.toEqual([]);
    expect(favoritesDb.getFavoriteProviders).toHaveBeenCalledWith(55);
  });

  it("uses the authenticated user for favorite status, add and remove", async () => {
    vi.mocked(favoritesDb.isFavoriteProvider).mockResolvedValue(true);
    vi.mocked(favoritesDb.addFavoriteProvider).mockResolvedValue({ success: true });
    vi.mocked(favoritesDb.removeFavoriteProvider).mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(createContext(77));

    await expect(caller.provider.favoriteStatus({ providerId: 9 })).resolves.toBe(true);
    await expect(caller.provider.favoriteAdd({ providerId: 9 })).resolves.toEqual({ success: true });
    await expect(caller.provider.favoriteRemove({ providerId: 9 })).resolves.toEqual({ success: true });

    expect(favoritesDb.isFavoriteProvider).toHaveBeenCalledWith(77, 9);
    expect(favoritesDb.addFavoriteProvider).toHaveBeenCalledWith(77, 9);
    expect(favoritesDb.removeFavoriteProvider).toHaveBeenCalledWith(77, 9);
  });

  it("rejects unauthenticated favorite access", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });

    await expect(caller.provider.favoriteList()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.provider.favoriteAdd({ providerId: 9 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(favoritesDb.getFavoriteProviders).not.toHaveBeenCalled();
    expect(favoritesDb.addFavoriteProvider).not.toHaveBeenCalled();
  });
});
