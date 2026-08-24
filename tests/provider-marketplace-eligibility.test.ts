import { describe, expect, it } from "vitest";
import {
  assertProviderMarketplaceEligibility,
  decideProviderMarketplaceEligibility,
  type ProviderMarketplaceEligibilityInput,
} from "../server/matching/ProviderEligibilityService";

const eligible: ProviderMarketplaceEligibilityInput = {
  transition: "OFFER_CREATE",
  countryTransitionAllowed: true,
  requestIsOpenAndUnassigned: true,
  providerIsVerified: true,
  providerIsAvailable: true,
  providerEnforcementClear: true,
  providerCapacityAvailable: true,
  capabilityAllowed: true,
  credentialAllowed: true,
  scopeAllowed: true,
  serviceAreaAllowed: true,
  safetyAllowed: true,
};

describe("ProviderMarketplaceEligibilityService", () => {
  it("allows only a fully server-eligible provider", () => {
    expect(decideProviderMarketplaceEligibility(eligible)).toEqual({
      allowed: true,
      transition: "OFFER_CREATE",
      blockers: [],
    });
  });

  it("fails closed across stale, suspended, out-of-area and safety states", () => {
    const decision = decideProviderMarketplaceEligibility({
      ...eligible,
      providerEnforcementClear: false,
      capabilityAllowed: false,
      serviceAreaAllowed: false,
      safetyAllowed: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.blockers).toEqual([
      "PROVIDER_ENFORCEMENT_BLOCKED",
      "CAPABILITY_NOT_ELIGIBLE",
      "SERVICE_AREA_MISMATCH",
      "JOB_SAFETY_BLOCKED",
    ]);
    expect(() => assertProviderMarketplaceEligibility({ ...eligible, credentialAllowed: false }))
      .toThrow("CREDENTIAL_NOT_ELIGIBLE");
  });

  it("does not accept an assigned or closed request for exposure/offer transitions", () => {
    expect(decideProviderMarketplaceEligibility({ ...eligible, requestIsOpenAndUnassigned: false }).blockers)
      .toContain("REQUEST_NOT_OPEN_OR_ALREADY_ASSIGNED");
  });
});
