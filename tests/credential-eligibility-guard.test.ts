import { describe, expect, it } from "vitest";

import {
  assertCredentialEligibility,
  evaluateCredentialEligibility,
} from "../server/compliance/CredentialEligibilityGuard";

const now = new Date("2026-08-16T09:00:00.000Z");

function validCredential(overrides: Partial<Parameters<typeof evaluateCredentialEligibility>[0]["providerCredentials"][number]> = {}) {
  return {
    jurisdictionId: 34,
    credentialType: "trade_license",
    assuranceLevel: "A" as const,
    status: "verified" as const,
    expiresAt: new Date("2027-08-16T09:00:00.000Z"),
    verifiedAt: new Date("2026-08-01T09:00:00.000Z"),
    reviewedByUserId: 9,
    revocationStatus: "clear" as const,
    ruleVersion: "tr-2026.08",
    ...overrides,
  };
}

function decision(credentials = [validCredential()], overrides: Partial<Parameters<typeof evaluateCredentialEligibility>[0]> = {}) {
  return evaluateCredentialEligibility({
    jurisdictionId: 34,
    requiredCredentialType: "trade_license",
    minimumAssurance: "B",
    requiresHumanReview: true,
    compliancePackageVersion: "tr-2026.08",
    providerCredentials: credentials,
    now,
    ...overrides,
  });
}

describe("CredentialEligibilityGuard", () => {
  it("allows an exact, current, human-reviewed credential at or above the required assurance", () => {
    expect(decision()).toEqual({ allowed: true, code: "CREDENTIAL_ELIGIBLE" });
  });

  it("allows requests without a server-derived credential requirement", () => {
    expect(decision([], { requiredCredentialType: null })).toEqual({
      allowed: true,
      code: "CREDENTIAL_NOT_REQUIRED",
    });
  });

  it("fails closed for missing policy context, absent evidence, expiry, revocation and insufficient assurance", () => {
    expect(decision([], { compliancePackageVersion: null })).toEqual({
      allowed: false,
      code: "CREDENTIAL_CONTEXT_UNKNOWN",
    });
    expect(decision([])).toEqual({ allowed: false, code: "CREDENTIAL_NOT_VERIFIED" });
    expect(decision([validCredential({ expiresAt: new Date("2026-08-15T09:00:00.000Z") })])).toEqual({
      allowed: false,
      code: "CREDENTIAL_EXPIRED",
    });
    expect(decision([validCredential({ revocationStatus: "check_failed" })])).toEqual({
      allowed: false,
      code: "CREDENTIAL_REVOKED_OR_UNCHECKED",
    });
    expect(decision([validCredential({ assuranceLevel: "C" })])).toEqual({
      allowed: false,
      code: "CREDENTIAL_ASSURANCE_INSUFFICIENT",
    });
  });

  it("fails closed when human review or the exact compliance package version is missing", () => {
    expect(decision([validCredential({ reviewedByUserId: null })])).toEqual({
      allowed: false,
      code: "CREDENTIAL_HUMAN_REVIEW_REQUIRED",
    });
    expect(decision([validCredential({ ruleVersion: "tr-2026.07" })])).toEqual({
      allowed: false,
      code: "CREDENTIAL_POLICY_VERSION_MISMATCH",
    });
  });

  it("throws a stable provider-prefixed code for transition callers", () => {
    expect(() => assertCredentialEligibility({
      jurisdictionId: 34,
      requiredCredentialType: "trade_license",
      minimumAssurance: "A",
      requiresHumanReview: true,
      compliancePackageVersion: "tr-2026.08",
      providerCredentials: [],
      now,
    })).toThrow("PROVIDER_CREDENTIAL_NOT_VERIFIED");
  });
});
