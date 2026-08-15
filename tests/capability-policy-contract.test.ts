import { describe, expect, it } from "vitest";
import { canProviderAppeal, evaluateCapability, type CapabilityRuleInput, type CredentialInput } from "../server/compliance/CapabilityPolicyService";

const rule: CapabilityRuleInput = {
  packageStatus: "enabled",
  ruleStatus: "required",
  minimumAssurance: "C",
  requiresHumanReview: true,
  sourceVerified: true,
};
const credential: CredentialInput = {
  status: "verified",
  assuranceLevel: "B",
  humanReviewed: true,
};

describe("capability policy contract", () => {
  it("blocks unknown legal requirements instead of enabling a capability", () => {
    expect(evaluateCapability({ ...rule, ruleStatus: "unknown" }, credential)).toMatchObject({
      decision: "LEGAL_REVIEW_REQUIRED", eligible: false,
    });
  });

  it("never verifies an F-assurance document image", () => {
    expect(evaluateCapability(rule, { ...credential, assuranceLevel: "F" })).toMatchObject({
      decision: "MANUAL_REVIEW", eligible: false,
    });
  });

  it("expires only the scoped capability when its credential has expired", () => {
    expect(evaluateCapability(rule, { ...credential, expiresAt: new Date("2020-01-01") }, new Date("2026-01-01"))).toMatchObject({
      decision: "EXPIRED_OR_SUSPENDED", eligible: false,
    });
  });

  it("requires an enabled package and verified official source before allowing work", () => {
    expect(evaluateCapability({ ...rule, packageStatus: "approved" }, credential).eligible).toBe(false);
    expect(evaluateCapability({ ...rule, sourceVerified: false }, credential).eligible).toBe(false);
  });

  it("allows only the owner to appeal an appealable decision", () => {
    expect(canProviderAppeal(3, 3, "REJECTED")).toBe(true);
    expect(canProviderAppeal(4, 3, "REJECTED")).toBe(false);
    expect(canProviderAppeal(3, 3, "VERIFIED")).toBe(false);
  });
});
