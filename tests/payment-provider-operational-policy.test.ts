import { describe, expect, it } from "vitest";

import { decidePaymentProviderOperationalStatus } from "../server/payments/ProviderOperationalPolicy";

const now = new Date("2026-08-15T12:00:00.000Z");

describe("payment provider operational policy", () => {
  it("missing or incomplete regulatory state fails closed", () => {
    expect(decidePaymentProviderOperationalStatus(null, now)).toMatchObject({
      allowed: false,
      status: "not_configured",
    });
    expect(decidePaymentProviderOperationalStatus({
      provider: "iyzico",
      countryCode: "TR",
      currency: "TRY",
      status: "operational",
      configVersion: "v1",
      healthCheckedAt: now,
      regulatoryReviewedAt: null,
      nextReviewAt: null,
      blockingReason: null,
    }, now)).toMatchObject({ allowed: false, status: "regulatory_review" });
  });

  it("allows only an active and unexpired reviewed provider scope", () => {
    expect(decidePaymentProviderOperationalStatus({
      provider: "iyzico",
      countryCode: "TR",
      currency: "TRY",
      status: "operational",
      configVersion: "v1",
      healthCheckedAt: new Date("2026-08-15T11:00:00.000Z"),
      regulatoryReviewedAt: new Date("2026-08-15T11:00:00.000Z"),
      nextReviewAt: new Date("2026-09-01T00:00:00.000Z"),
      blockingReason: null,
    }, now)).toMatchObject({ allowed: true, status: "operational" });
  });

  it("blocks expired reviews and operator suspensions", () => {
    expect(decidePaymentProviderOperationalStatus({
      provider: "stripe",
      countryCode: "TR",
      currency: "TRY",
      status: "operational",
      configVersion: "v1",
      healthCheckedAt: now,
      regulatoryReviewedAt: now,
      nextReviewAt: now,
      blockingReason: null,
    }, now)).toMatchObject({ allowed: false, status: "regulatory_review" });
  });
});
