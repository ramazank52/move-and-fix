import { describe, expect, it } from "vitest";

import { assertCapabilityTransition, evaluateCapabilityTransition } from "../server/compliance/CapabilityTransitionGuard";

describe("capability transition guard", () => {
  it("permits legacy requests only while the explicit rollout gate is disabled", () => {
    expect(evaluateCapabilityTransition({ enforcementEnabled: false, requiredCapabilityId: 1, jurisdictionId: null, providerCapabilityDecision: null }))
      .toEqual({ allowed: true, reason: "LEGACY_ROLLOUT_DISABLED" });
  });

  it("fails closed when enforcement is enabled without authoritative context", () => {
    expect(() => assertCapabilityTransition({ enforcementEnabled: true, requiredCapabilityId: 1, jurisdictionId: null, providerCapabilityDecision: null }))
      .toThrow("COMPLIANCE_CONTEXT_NOT_CONFIGURED");
  });

  it("accepts only verified capability statuses and rejects expired proof", () => {
    expect(evaluateCapabilityTransition({ enforcementEnabled: true, requiredCapabilityId: 1, jurisdictionId: 34, providerCapabilityDecision: "VERIFIED" }))
      .toEqual({ allowed: true, reason: "VERIFIED" });
    expect(() => assertCapabilityTransition({ enforcementEnabled: true, requiredCapabilityId: 1, jurisdictionId: 34, providerCapabilityDecision: "VERIFIED_LIMITED_SCOPE", providerCapabilityExpiresAt: new Date("2020-01-01") }))
      .toThrow("PROVIDER_CAPABILITY_EXPIRED");
  });
});
