import { describe, expect, it } from "vitest";

import {
  resolveCredentialRequirements,
  type CredentialRequirementSnapshot,
} from "../server/compliance/CredentialRequirementCatalog";

function requirement(overrides: Partial<CredentialRequirementSnapshot> = {}): CredentialRequirementSnapshot {
  return {
    requirementId: 41,
    jurisdictionId: 34,
    categoryId: 2,
    subcategoryId: 0,
    capabilityId: 71,
    providerType: "sole_trader",
    credentialType: "tr-gold-electrical-01",
    requirementState: "required",
    minimumAssurance: "A",
    requiresHumanReview: true,
    officialSourceId: 8,
    sourceReferenceIds: ["TR-GOLD-REF-01"],
    sourceVersion: "TR-GOLD-2026-08-13-v1.0",
    ruleVersion: "TR-GOLD-2026-08-13-v1.0",
    provenance: { source: "approved" },
    ...overrides,
  };
}

describe("CredentialRequirementCatalog", () => {
  it("resolves only exact provider-type keyed requirements while preserving every source-provenanced requirement", () => {
    const result = resolveCredentialRequirements({
      providerType: "sole_trader",
      requirements: [
        requirement(),
        requirement({ requirementId: 42, credentialType: "tr-gold-electrical-02", requirementState: "not_required" }),
        requirement({ requirementId: 43, providerType: "company_owner", credentialType: "tr-gold-company-01" }),
      ],
    });

    expect(result.status).toBe("RESOLVED");
    expect(result.requirements.map((item) => item.credentialType)).toEqual([
      "tr-gold-electrical-01",
      "tr-gold-electrical-02",
    ]);
  });

  it("fails closed when provider operating model is unresolved or no exact catalog row exists", () => {
    expect(resolveCredentialRequirements({ providerType: null, requirements: [requirement()] })).toEqual({
      status: "PROVIDER_TYPE_UNRESOLVED",
      requirements: [],
    });
    expect(resolveCredentialRequirements({
      providerType: "employee",
      requirements: [requirement()],
    })).toEqual({
      status: "MISSING_CREDENTIAL_REQUIREMENT_CATALOG",
      requirements: [],
    });
  });

  it("never reuses a same-category or same-provider-type record when the authoritative capability or jurisdiction differs", () => {
    const result = resolveCredentialRequirements({
      providerType: "sole_trader",
      scope: { jurisdictionId: 34, categoryId: 2, capabilityId: 71 },
      requirements: [
        requirement({ capabilityId: 70 }),
        requirement({ jurisdictionId: 35 }),
        requirement({ categoryId: 3 }),
      ],
    });
    expect(result).toEqual({ status: "MISSING_CREDENTIAL_REQUIREMENT_CATALOG", requirements: [] });
  });

  it("accepts only the exact capability-and-jurisdiction source row for the active provider model", () => {
    const exact = requirement();
    const result = resolveCredentialRequirements({
      providerType: "sole_trader",
      scope: { jurisdictionId: 34, categoryId: 2, capabilityId: 71 },
      requirements: [requirement({ capabilityId: 72 }), exact],
    });
    expect(result).toEqual({ status: "RESOLVED", requirements: [exact] });
  });

  it("blocks conditional, prohibited and unknown catalog rules instead of reducing them to a document checklist", () => {
    for (const requirementState of ["conditional", "prohibited", "unknown"] as const) {
      const result = resolveCredentialRequirements({
        providerType: "sole_trader",
        requirements: [requirement({ requirementState })],
      });
      expect(result.status).toBe("CREDENTIAL_REQUIREMENT_BLOCKED");
      expect(result.requirements).toHaveLength(1);
    }
  });
});
