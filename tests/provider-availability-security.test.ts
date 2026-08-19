import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({ updateProviderAvailability: vi.fn(), getProviderBusinessCockpit: vi.fn() }));

import * as providerDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 55): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `availability-user-${id}`,
    email: `availability-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
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
    await expect(caller.provider.updateAvailability({ isAvailable: false })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(providerDb.updateProviderAvailability).not.toHaveBeenCalled();
  });

  it("derives provider ownership only from the authenticated session", async () => {
    vi.mocked(providerDb.updateProviderAvailability).mockResolvedValue({ isAvailable: false });
    const caller = appRouter.createCaller(createContext(77));
    await expect(caller.provider.updateAvailability({ isAvailable: false })).resolves.toEqual({ isAvailable: false });
    expect(providerDb.updateProviderAvailability).toHaveBeenCalledWith(77, false);
  });

  it("rejects invalid payloads before reaching the database", async () => {
    const caller = appRouter.createCaller(createContext(77));
    await expect(caller.provider.updateAvailability({ isAvailable: "yes" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(providerDb.updateProviderAvailability).not.toHaveBeenCalled();
  });

  it("maps a missing provider profile to a fail-closed response", async () => {
    vi.mocked(providerDb.updateProviderAvailability).mockRejectedValue(new Error("PROVIDER_NOT_FOUND"));
    const caller = appRouter.createCaller(createContext(99));
    await expect(caller.provider.updateAvailability({ isAvailable: true })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("derives Business Cockpit ownership from the authenticated provider session", async () => {
    vi.mocked(providerDb.getProviderBusinessCockpit).mockResolvedValue({
      availability: true,
      activeJobs: 2,
      scheduledJobs: null,
      completedJobs: 7,
      cancellationRate: 0,
      averageRating: 4.8,
      recentReviewCount: 5,
      earnings: { totalEarnings: 1200, todayEarnings: 300, pendingPayments: 50, completedJobs: 7 },
    });
    const caller = appRouter.createCaller(createContext(77));

    await expect(caller.provider.businessCockpit()).resolves.toMatchObject({ activeJobs: 2, averageRating: 4.8 });
    expect(providerDb.getProviderBusinessCockpit).toHaveBeenCalledWith(77);
  });

  it("rejects unauthenticated Business Cockpit access", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });
    await expect(caller.provider.businessCockpit()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(providerDb.getProviderBusinessCockpit).not.toHaveBeenCalled();
  });
});
