import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  configureProviderOnboarding: vi.fn(),
  getProviderOnboardingCatalog: vi.fn(),
  getProviderOnboardingStatus: vi.fn(),
}));

import * as providerDb from "../server/db";
import { appRouter } from "../server/routers";

function createContext(id = 71): TrpcContext {
  return {
    user: {
      id,
      openId: `provider-onboarding-${id}`,
      email: `provider-${id}@example.test`,
      phone: null,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      name: "Provider Test",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("provider onboarding router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects anonymous reads and canonical selection before database access", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });
    await expect(caller.provider.getOnboardingStatus()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.provider.getOnboardingCatalog()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.provider.configureOnboarding({ categoryId: 1, subcategoryId: null, capabilityId: 2, jurisdictionCode: "TR", serviceArea: { latitude: 41.0082, longitude: 28.9784, radiusKm: 20 } }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(providerDb.getProviderOnboardingStatus).not.toHaveBeenCalled();
    expect(providerDb.getProviderOnboardingCatalog).not.toHaveBeenCalled();
    expect(providerDb.configureProviderOnboarding).not.toHaveBeenCalled();
  });

  it("derives ownership only from the authenticated provider session", async () => {
    vi.mocked(providerDb.configureProviderOnboarding).mockResolvedValue({
      providerId: 7,
      catalog: { categoryId: 1, subcategoryId: null },
      capabilityId: 2,
      capabilityReviewState: "LEGAL_REVIEW_REQUIRED",
      jurisdictionBindingCount: 1,
      jurisdictionCode: "TR",
    } as never);
    vi.mocked(providerDb.getProviderOnboardingStatus).mockResolvedValue({ activation: "blocked" } as never);
    vi.mocked(providerDb.getProviderOnboardingCatalog).mockResolvedValue({
      categories: [{ id: 1, name: "Ev", slug: "ev" }], subcategories: [], capabilities: [],
    } as never);
    const caller = appRouter.createCaller(createContext(83));
    await expect(caller.provider.configureOnboarding({ categoryId: 1, subcategoryId: null, capabilityId: 2, jurisdictionCode: "tr", serviceArea: { latitude: 41.0082, longitude: 28.9784, radiusKm: 20 } }))
      .resolves.toMatchObject({ providerId: 7, capabilityReviewState: "LEGAL_REVIEW_REQUIRED" });
    await expect(caller.provider.getOnboardingStatus()).resolves.toEqual({ activation: "blocked" });
    await expect(caller.provider.getOnboardingCatalog()).resolves.toMatchObject({ categories: [{ id: 1 }] });
    expect(providerDb.configureProviderOnboarding).toHaveBeenCalledWith({
      userId: 83, categoryId: 1, subcategoryId: null, capabilityId: 2, jurisdictionCode: "tr", serviceArea: { latitude: 41.0082, longitude: 28.9784, radiusKm: 20 },
    });
    expect(providerDb.getProviderOnboardingStatus).toHaveBeenCalledWith(83);
    expect(providerDb.getProviderOnboardingCatalog).toHaveBeenCalledWith(83);
  });

  it("rejects invalid identifiers before configuring onboarding and maps unknown catalog scope to precondition failure", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.provider.configureOnboarding({ categoryId: 0, subcategoryId: null, capabilityId: 2, jurisdictionCode: "TR", serviceArea: { latitude: 41.0082, longitude: 28.9784, radiusKm: 20 } }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(providerDb.configureProviderOnboarding).not.toHaveBeenCalled();
    vi.mocked(providerDb.configureProviderOnboarding).mockRejectedValue(new Error("AMBIGUOUS_SERVICE_MAPPING"));
    await expect(caller.provider.configureOnboarding({ categoryId: 1, subcategoryId: null, capabilityId: 2, jurisdictionCode: "TR", serviceArea: { latitude: 41.0082, longitude: 28.9784, radiusKm: 20 } }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: "AMBIGUOUS_SERVICE_MAPPING" });
  });
});
