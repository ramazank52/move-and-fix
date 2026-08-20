import { describe, expect, it } from "vitest";
import { decideProviderOnboardingActivation } from "../server/compliance/ProviderOnboardingPolicy";

const complete = {
  profileComplete: true,
  canonicalServiceSelected: true,
  verifiedJurisdictionCount: 1,
  verifiedCapabilityCount: 1,
  dynamicCredentialsVerified: true,
  documentsApproved: true,
  countryLaunchEligible: true,
  serviceAreaConfigured: true,
} as const;

describe("provider onboarding activation policy", () => {
  it("permits activation only after every server-authoritative lifecycle step", () => {
    expect(decideProviderOnboardingActivation(complete)).toEqual({ status: "ELIGIBLE", blockers: [] });
  });

  it("blocks incomplete profile, unverified jurisdiction and missing canonical service independently", () => {
    expect(decideProviderOnboardingActivation({
      ...complete,
      profileComplete: false,
      canonicalServiceSelected: false,
      verifiedJurisdictionCount: 0,
    })).toEqual({
      status: "BLOCKED",
      blockers: ["PROFILE_INCOMPLETE", "CANONICAL_SERVICE_NOT_SELECTED", "JURISDICTION_NOT_VERIFIED"],
    });
  });

  it("never treats pending capability, documents, credentials or launch readiness as activation", () => {
    expect(decideProviderOnboardingActivation({
      ...complete,
      verifiedCapabilityCount: 0,
      dynamicCredentialsVerified: false,
      documentsApproved: false,
      countryLaunchEligible: false,
    })).toEqual({
      status: "BLOCKED",
      blockers: [
        "CAPABILITY_NOT_VERIFIED",
        "DYNAMIC_CREDENTIALS_NOT_VERIFIED",
        "DOCUMENTS_NOT_APPROVED",
        "COUNTRY_LAUNCH_NOT_ELIGIBLE",
      ],
    });
  });

  it("blocks activation when a provider has no configured service area", () => {
    expect(decideProviderOnboardingActivation({ ...complete, serviceAreaConfigured: false })).toEqual({
      status: "BLOCKED",
      blockers: ["SERVICE_AREA_NOT_CONFIGURED"],
    });
  });
});
