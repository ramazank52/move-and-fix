import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  getPriceGuarantee: vi.fn(),
  createPriceIntelligenceAssessment: vi.fn(),
}));

import * as db from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 41): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `price-guarantee-${id}`,
    email: `price-guarantee-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "Price Guarantee Test User",
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

describe("No Surprise Price router security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives price guarantee access from the authenticated job participant", async () => {
    vi.mocked(db.getPriceGuarantee).mockResolvedValue({
      id: 81,
      requestId: 21,
      agreementId: 61,
      currency: "TRY",
      guaranteedAmount: 850,
      maximumAmount: 850,
      status: "active",
      policyVersion: "no_surprise_price_v1",
      acceptedAt: new Date(),
      supersededAt: null,
    });
    const caller = appRouter.createCaller(createContext(41));

    await expect(caller.priceIntelligence.guarantee({ requestId: 21 })).resolves.toMatchObject({
      id: 81,
      maximumAmount: 850,
      status: "active",
    });
    expect(db.getPriceGuarantee).toHaveBeenCalledWith({ requestId: 21, userId: 41 });
  });

  it("rejects unauthenticated and malformed guarantee requests before data access", async () => {
    const anonymous = appRouter.createCaller({ ...createContext(), user: null });
    const authenticated = appRouter.createCaller(createContext());

    await expect(anonymous.priceIntelligence.guarantee({ requestId: 21 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(authenticated.priceIntelligence.guarantee({ requestId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.getPriceGuarantee).not.toHaveBeenCalled();
  });

  it("maps a non-participant guarantee read to FORBIDDEN", async () => {
    vi.mocked(db.getPriceGuarantee).mockRejectedValue(new Error("SERVICE_REQUEST_PARTICIPANT_FORBIDDEN"));
    const caller = appRouter.createCaller(createContext(99));

    await expect(caller.priceIntelligence.guarantee({ requestId: 21 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("records a non-binding price assessment under the authenticated requester only", async () => {
    vi.mocked(db.createPriceIntelligenceAssessment).mockResolvedValue({
      id: 82,
      status: "available",
      sampleSize: 8,
      medianAmount: 900,
      lowAmount: 750,
      highAmount: 1100,
      explanationJson: {
        method: "completed_released_agreement_percentiles_v1",
        nonBinding: true,
        sampleThreshold: 5,
        sampleSize: 8,
        excluded: "pending, held, refunded, cancelled, external quotes",
      },
      currency: "TRY",
      countryCode: "TR",
      dataWindowStartedAt: new Date(),
      dataWindowEndedAt: new Date(),
    });
    const caller = appRouter.createCaller(createContext(41));

    await expect(caller.priceIntelligence.estimate({ categoryId: 6, requestId: 21, currency: "TRY", countryCode: "tr" }))
      .resolves.toMatchObject({ status: "available", medianAmount: 900 });
    expect(db.createPriceIntelligenceAssessment).toHaveBeenCalledWith({
      categoryId: 6,
      requestId: 21,
      currency: "TRY",
      countryCode: "tr",
      requestedByUserId: 41,
    });
  });

  it("rejects anonymous or malformed price assessments before any data access", async () => {
    const anonymous = appRouter.createCaller({ ...createContext(), user: null });
    const authenticated = appRouter.createCaller(createContext());

    await expect(anonymous.priceIntelligence.estimate({ categoryId: 6 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(authenticated.priceIntelligence.estimate({ categoryId: 0 } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    vi.mocked(db.createPriceIntelligenceAssessment).mockRejectedValue(new Error("PRICE_INTELLIGENCE_CURRENCY_NOT_SUPPORTED"));
    await expect(authenticated.priceIntelligence.estimate({ categoryId: 6, currency: "EUR" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("maps a non-participant assessment to FORBIDDEN instead of estimating a price", async () => {
    vi.mocked(db.createPriceIntelligenceAssessment).mockRejectedValue(new Error("SERVICE_REQUEST_PARTICIPANT_FORBIDDEN"));
    const caller = appRouter.createCaller(createContext(99));
    await expect(caller.priceIntelligence.estimate({ categoryId: 6, requestId: 21 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
