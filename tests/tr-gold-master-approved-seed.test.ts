import { describe, expect, it } from "vitest";

import { TR_GOLD_MASTER_VERSION, turkeyGoldMasterSeed } from "../server/compliance/TrGoldMasterSeed";
import {
  TR_GOLD_MASTER_SCOPE_TARGETS,
  goldMasterSourceScopeKey,
  resolveGoldMasterScopeMapping,
} from "../server/compliance/TrGoldMasterCatalogMapping";

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
    expect(Object.keys(TR_GOLD_MASTER_SCOPE_TARGETS)).toHaveLength(approvedRuleCount);
    for (const service of turkeyGoldMasterSeed.countryPack.services) {
      service.rules.forEach((_rule, index) => {
        expect(TR_GOLD_MASTER_SCOPE_TARGETS).toHaveProperty(goldMasterSourceScopeKey(service.key, index));
      });
    }
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

  it("resolves only explicit stable catalog targets and blocks unmapped or inactive targets", () => {
    const snapshot = {
      categories: [
        { id: 4, slug: "hvac", isActive: 1 },
        { id: 13, slug: "towing", isActive: 1 },
        { id: 60003, slug: "automotive", isActive: 0 },
      ],
      subcategories: [
        { id: 5, categoryId: 4, slug: "ac-installation", isActive: 1 },
        { id: 22, categoryId: 13, slug: "breakdown-tow", isActive: 1 },
        { id: 13, categoryId: 60003, slug: "tire-service", isActive: 1 },
      ],
    };

    expect(resolveGoldMasterScopeMapping(snapshot, "air_conditioning:2")).toMatchObject({
      status: "RESOLVED",
      value: { categoryId: 4, subcategoryId: 5 },
    });
    expect(resolveGoldMasterScopeMapping(snapshot, "roadside_assistance:4")).toMatchObject({
      status: "RESOLVED",
      value: { categoryId: 13, subcategoryId: 22 },
    });
    expect(resolveGoldMasterScopeMapping(snapshot, "automotive:3")).toMatchObject({
      status: "MISSING_SERVICE_CATALOG_MAPPING",
      reason: "CANONICAL_TARGET_INACTIVE",
    });
    expect(resolveGoldMasterScopeMapping(snapshot, "automotive:2")).toMatchObject({
      status: "MISSING_SERVICE_CATALOG_MAPPING",
      reason: "SCOPE_NOT_APPROVED_FOR_CATALOG",
    });
  });

  it("keeps each unresolved source scope explicit instead of inferring a catalog target", () => {
    const unresolved = Object.entries(TR_GOLD_MASTER_SCOPE_TARGETS)
      .filter(([, target]) => target === null)
      .map(([scopeKey]) => scopeKey);

    expect(unresolved).toContain("plumbing:3");
    expect(unresolved).toContain("automotive:5");
    expect(unresolved.length).toBeGreaterThan(0);
  });
});
