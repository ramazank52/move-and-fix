import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({ updateProviderAvailability: vi.fn() }));

import * as providerDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 55): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `availability-user-${id}`,
    email: `availability-${id}@example.com`,
    name: "Availability Test User",
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

describe("provider availability router security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated availability changes", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });
    await expect(caller.providers.updateAvailability({ isAvailable: false })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(providerDb.updateProviderAvailability).not.toHaveBeenCalled();
  });

  it("derives provider ownership only from the authenticated session", async () => {
    vi.mocked(providerDb.updateProviderAvailability).mockResolvedValue({ isAvailable: false });
    const caller = appRouter.createCaller(createContext(77));
    await expect(caller.providers.updateAvailability({ isAvailable: false })).resolves.toEqual({ isAvailable: false });
    expect(providerDb.updateProviderAvailability).toHaveBeenCalledWith(77, false);
  });

  it("rejects invalid payloads before reaching the database", async () => {
    const caller = appRouter.createCaller(createContext(77));
    await expect(caller.providers.updateAvailability({ isAvailable: "yes" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(providerDb.updateProviderAvailability).not.toHaveBeenCalled();
  });

  it("maps a missing provider profile to a fail-closed response", async () => {
    vi.mocked(providerDb.updateProviderAvailability).mockRejectedValue(new Error("PROVIDER_NOT_FOUND"));
    const caller = appRouter.createCaller(createContext(99));
    await expect(caller.providers.updateAvailability({ isAvailable: true })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
