import { describe, expect, it } from "vitest";
import { buildOpportunityNotificationIntent } from "../server/matching/OpportunityNotificationPolicy";

describe("OpportunityNotificationPolicy", () => {
  it("builds an idempotent, PII-minimised protected deep-link", () => {
    expect(buildOpportunityNotificationIntent({
      requestId: 42,
      providerId: 7,
      type: "opportunity_available",
      reasonCode: "ELIGIBLE_MATCH",
    })).toEqual({
      requestId: 42,
      providerId: 7,
      type: "opportunity_available",
      reasonCode: "ELIGIBLE_MATCH",
      idempotencyKey: "opportunity:opportunity_available:42:7",
      deepLink: "/provider-opportunities?requestId=42",
    });
  });

  it("rejects invalid identifiers and empty reasons", () => {
    expect(() => buildOpportunityNotificationIntent({ requestId: 0, providerId: 1, type: "opportunity_available", reasonCode: "x" }))
      .toThrow("OPPORTUNITY_REQUEST_ID_INVALID");
    expect(() => buildOpportunityNotificationIntent({ requestId: 1, providerId: 1, type: "opportunity_revoked", reasonCode: " " }))
      .toThrow("OPPORTUNITY_REASON_REQUIRED");
  });
});
