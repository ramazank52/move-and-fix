import { describe, expect, it } from "vitest";

import { TR_GOLD_MASTER_VERSION, turkeyGoldMasterSeed } from "../server/compliance/TrGoldMasterSeed";

describe("approved TR Gold Master seed", () => {
  it("uses the supplied approved package version and never treats it as a launch approval", () => {
    expect(TR_GOLD_MASTER_VERSION).toBe("TR-GOLD-2026-08-13-v1.0");
    expect(turkeyGoldMasterSeed.countryPack.country_code).toBe("TR");
    expect(turkeyGoldMasterSeed.countryPack.status).not.toBe("enabled");
    expect(turkeyGoldMasterSeed.countryPack.verification_engine.unknown).toMatch(/BLOCK|LEGAL_REVIEW_REQUIRED/);
  });

  it("creates a deterministic rule for every approved source-service rule", () => {
    const approvedRuleCount = turkeyGoldMasterSeed.countryPack.services.reduce(
      (total, service) => total + service.rules.length,
      0,
    );

    expect(turkeyGoldMasterSeed.rules).toHaveLength(approvedRuleCount);
    expect(new Set(turkeyGoldMasterSeed.rules.map((rule) => rule.key)).size).toBe(approvedRuleCount);
  });

  it("retains only registry-listed citations and marks an absent citation for legal review", () => {
    const registryIds = new Set(turkeyGoldMasterSeed.sources.map((source) => source.registryId));

    for (const rule of turkeyGoldMasterSeed.rules) {
      expect(rule.scopeConstraints.approvedPackId).toBe(TR_GOLD_MASTER_VERSION);
      expect(rule.scopeConstraints.requiresHumanReview).toBe(true);
      expect(rule.sourceReferenceIds.every((sourceId) => registryIds.has(sourceId))).toBe(true);
      if (rule.sourceReferenceIds.length === 0) {
        expect(rule.scopeConstraints.unmappedSourceReferencePolicy).toBe("LEGAL_REVIEW_REQUIRED");
      }
    }
  });
});
