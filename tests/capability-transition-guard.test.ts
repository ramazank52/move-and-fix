import { describe, expect, it } from "vitest";

import {
  assertCapabilityTransition,
  evaluateCapabilityTransition,
  evaluateServiceRequestCapabilityContext,
} from "../server/compliance/CapabilityTransitionGuard";

describe("capability transition guard", () => {
  it("fails closed for absent or blocked requirement state even when a legacy rollout flag is disabled", () => {
    expect(evaluateCapabilityTransition({
      enforcementEnabled: false,
      requiredCapabilityId: 1,
      jurisdictionId: null,
      providerCapabilityDecision: null,
    })).toEqual({ allowed: false, code: "COMPLIANCE_REQUIREMENT_STATE_BLOCKED" });

    expect(evaluateCapabilityTransition({
      enforcementEnabled: false,
      complianceRequirementState: "blocked",
      requiredCapabilityId: 1,
      jurisdictionId: 34,
      providerCapabilityDecision: "VERIFIED",
    })).toEqual({ allowed: false, code: "COMPLIANCE_REQUIREMENT_STATE_BLOCKED" });
  });

  it("fails closed when a required service has no authoritative jurisdiction or capability", () => {
    expect(() => assertCapabilityTransition({
      enforcementEnabled: true,
      complianceRequirementState: "required",
      requiredCapabilityId: 1,
      jurisdictionId: null,
      providerCapabilityDecision: null,
    })).toThrow("COMPLIANCE_CONTEXT_NOT_CONFIGURED");
  });

  it("blocks legal-review-required services at request creation and provider transition", () => {
    expect(evaluateServiceRequestCapabilityContext({
      enforcementEnabled: true,
      complianceRequirementState: "legal_review_required",
      requiredCapabilityId: null,
      jurisdictionId: 34,
    })).toEqual({ allowed: false, code: "LEGAL_REVIEW_REQUIRED" });

    expect(evaluateCapabilityTransition({
      enforcementEnabled: true,
      complianceRequirementState: "legal_review_required",
      requiredCapabilityId: null,
      jurisdictionId: 34,
      providerCapabilityDecision: null,
    })).toEqual({ allowed: false, code: "LEGAL_REVIEW_REQUIRED" });
  });

  it("fails closed for every non-authorizing explicit P13 requirement state", () => {
    for (const state of ["CONDITIONAL", "PROHIBITED", "UNKNOWN", "LEGAL_REVIEW_REQUIRED", "JURISDICTION_UNRESOLVED", "CAPABILITY_UNMAPPED"] as const) {
      expect(evaluateServiceRequestCapabilityContext({
        enforcementEnabled: true,
        requirementState: state,
        requiredCapabilityId: null,
        jurisdictionId: null,
      })).toEqual({ allowed: false, code: state });

      expect(evaluateCapabilityTransition({
        enforcementEnabled: true,
        requirementState: state,
        requiredCapabilityId: null,
        jurisdictionId: null,
        providerCapabilityDecision: null,
      })).toEqual({ allowed: false, code: state });
    }
  });

  it("preserves the strict required-state contract under the explicit P13 model", () => {
    expect(evaluateServiceRequestCapabilityContext({
      enforcementEnabled: true,
      requirementState: "REQUIRED",
      requiredCapabilityId: 99,
      jurisdictionId: 34,
    })).toEqual({ allowed: true, reason: "COMPLIANCE_CONTEXT_BOUND" });

    expect(evaluateCapabilityTransition({
      enforcementEnabled: true,
      requirementState: "REQUIRED",
      requiredCapabilityId: 99,
      jurisdictionId: 34,
      providerCapabilityDecision: "VERIFIED",
    })).toEqual({ allowed: true, reason: "VERIFIED" });
  });

  it("permits an explicit not-required decision without a provider capability", () => {
    expect(evaluateServiceRequestCapabilityContext({
      enforcementEnabled: true,
      complianceRequirementState: "not_required",
      requiredCapabilityId: null,
      jurisdictionId: 34,
    })).toEqual({ allowed: true, reason: "NOT_REQUIRED" });

    expect(evaluateCapabilityTransition({
      enforcementEnabled: true,
      complianceRequirementState: "not_required",
      requiredCapabilityId: null,
      jurisdictionId: 34,
      providerCapabilityDecision: null,
    })).toEqual({ allowed: true, reason: "NOT_REQUIRED" });
  });

  it("accepts only verified capability statuses and rejects expired proof", () => {
    expect(evaluateCapabilityTransition({
      enforcementEnabled: true,
      complianceRequirementState: "required",
      requiredCapabilityId: 1,
      jurisdictionId: 34,
      providerCapabilityDecision: "VERIFIED",
    })).toEqual({ allowed: true, reason: "VERIFIED" });

    expect(() => assertCapabilityTransition({
      enforcementEnabled: true,
      complianceRequirementState: "required",
      requiredCapabilityId: 1,
      jurisdictionId: 34,
      providerCapabilityDecision: "VERIFIED_LIMITED_SCOPE",
      providerCapabilityExpiresAt: new Date("2020-01-01"),
    })).toThrow("PROVIDER_CAPABILITY_EXPIRED");
  });

  it("fails closed for a limited-scope capability without a machine-readable matching constraint", () => {
    expect(() => assertCapabilityTransition({
      enforcementEnabled: true,
      complianceRequirementState: "required",
      requiredCapabilityId: 1,
      jurisdictionId: 34,
      providerCapabilityDecision: "VERIFIED_LIMITED_SCOPE",
      scopeContext: { jurisdictionCode: "TR", categoryId: 5, serviceKey: "heating" },
    })).toThrow("PROVIDER_CAPABILITY_SCOPE_NOT_ELIGIBLE");

    expect(evaluateCapabilityTransition({
      enforcementEnabled: true,
      complianceRequirementState: "required",
      requiredCapabilityId: 1,
      jurisdictionId: 34,
      providerCapabilityDecision: "VERIFIED_LIMITED_SCOPE",
      providerScopeConstraintsJson: { jurisdictionCodes: ["TR"], categoryIds: [5], serviceKeys: ["heating"] },
      scopeContext: { jurisdictionCode: "TR", categoryId: 5, serviceKey: "heating" },
    })).toEqual({ allowed: true, reason: "VERIFIED_LIMITED_SCOPE" });

    expect(() => assertCapabilityTransition({
      enforcementEnabled: true,
      complianceRequirementState: "required",
      requiredCapabilityId: 1,
      jurisdictionId: 34,
      providerCapabilityDecision: "VERIFIED_LIMITED_SCOPE",
      providerScopeConstraintsJson: { jurisdictionCodes: ["TR"], categoryIds: [5], serviceKeys: ["heating"] },
      scopeContext: { jurisdictionCode: "TR", categoryId: 8, serviceKey: "heating" },
    })).toThrow("PROVIDER_CAPABILITY_SCOPE_NOT_ELIGIBLE");
  });
});
