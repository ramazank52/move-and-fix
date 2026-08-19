import type { Connection } from "mysql2/promise";

import countryPack from "./approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Gold_Master_Country_Pack_v1.json";
import sourceRegistry from "./approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Official_Source_Registry_v1.json";
import {
  goldMasterSourceScopeKey,
  resolveGoldMasterScopeMapping,
  type GoldMasterCatalogSnapshot,
} from "./TrGoldMasterCatalogMapping";
import { PROVIDER_REQUIREMENT_TYPES } from "./CredentialRequirementCatalog";

/**
 * This seed deliberately mirrors the approved source package rather than
 * translating it into new legal assertions. The package is not a launch
 * approval: all generated capability rules remain human-review gated.
 */
export const TR_GOLD_MASTER_VERSION = countryPack.pack_id;

type ApprovedSource = (typeof sourceRegistry.sources)[number];
type ApprovedService = (typeof countryPack.services)[number];
type ApprovedServiceRule = ApprovedService["rules"][number];

type CapabilityRuleSeed = {
  key: string;
  sourceScopeKey: string;
  displayName: string;
  credentialType: string | null;
  credentialLabels: string[];
  ruleStatus: "conditional" | "required";
  rationale: string;
  sourceReferenceIds: string[];
  scopeConstraints: Record<string, unknown>;
};

const TR_OFFICIAL_SOURCES = sourceRegistry.sources.map((source: ApprovedSource) => ({
  registryId: source.id,
  authorityName: source.authority,
  sourceUrl: source.url,
  sourceVersion: `${sourceRegistry.pack_id}:${source.id}`,
}));

function capabilityKey(service: ApprovedService, rule: ApprovedServiceRule, index: number) {
  const stableSubservice = rule.subservice
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `tr-gold-${service.key}-${index + 1}-${stableSubservice || "scope"}`.slice(0, 120);
}

function sourceDocumentType(scopeKey: string, credentialIndex: number) {
  return `tr-gold-${scopeKey}-credential-${credentialIndex + 1}`.slice(0, 160);
}

function isExplicitlyRequired(status: string) {
  return /(^|_)(LEGAL_REQUIRED|DYNAMIC_LEGAL_MANDATORY|LOCAL_UTILITY_AUTHORIZATION_REQUIRED)(_|$)/.test(status);
}

const approvedSourceIds = new Set(sourceRegistry.sources.map((source) => source.id));

const TR_CAPABILITY_RULES: readonly CapabilityRuleSeed[] = countryPack.services.flatMap((service: ApprovedService) =>
  service.rules.map((rule: ApprovedServiceRule, index: number) => {
    const sourceReferenceIds = (rule.sources ?? []).filter((sourceId) => approvedSourceIds.has(sourceId));
    return {
      key: capabilityKey(service, rule, index),
      sourceScopeKey: goldMasterSourceScopeKey(service.key, index),
      displayName: `${service.name} — ${rule.subservice}`,
      credentialType: rule.credentials?.[0] ?? null,
      credentialLabels: rule.credentials ?? [],
      // Only explicit package wording can produce "required". All remaining
      // source statuses stay conditional and human-review gated.
      ruleStatus: isExplicitlyRequired(rule.status) ? "required" : "conditional",
      sourceReferenceIds,
      rationale: rule.status,
      scopeConstraints: {
        countryCode: countryPack.country_code,
        approvedPackId: countryPack.pack_id,
        approvedPackStatus: countryPack.status,
        serviceKey: service.key,
        serviceName: service.name,
        catalogListed: service.catalog,
        subservice: rule.subservice,
        sourceDecisionStatus: rule.status,
        sourceCredentialLabels: rule.credentials,
        sourceReferenceIds,
        sourceScopeKey: goldMasterSourceScopeKey(service.key, index),
        sourceFailurePolicy: rule.failure ?? null,
        unknownPolicy: countryPack.verification_engine.unknown,
        decisionStates: countryPack.verification_engine.decision_states,
        requiresHumanReview: true,
        unmappedSourceReferencePolicy: sourceReferenceIds.length === 0 ? "LEGAL_REVIEW_REQUIRED" : null,
      },
    };
  }),
);

async function findOrCreateJurisdiction(connection: Connection) {
  const [existing] = await connection.execute<any[]>(
    "SELECT id FROM jurisdictions WHERE countryCode = ? AND regionCode IS NULL ORDER BY id ASC LIMIT 1",
    [countryPack.country_code],
  );
  if (existing[0]?.id) return Number(existing[0].id);

  await connection.execute(
    "INSERT INTO jurisdictions (countryCode, regionCode, displayName, status) VALUES (?, NULL, ?, 'draft')",
    [countryPack.country_code, countryPack.country],
  );
  const [created] = await connection.execute<any[]>(
    "SELECT id FROM jurisdictions WHERE countryCode = ? AND regionCode IS NULL ORDER BY id DESC LIMIT 1",
    [countryPack.country_code],
  );
  if (!created[0]?.id) throw new Error("TR_GOLD_MASTER_JURISDICTION_CREATE_FAILED");
  return Number(created[0].id);
}

async function loadCanonicalCatalog(connection: Connection): Promise<GoldMasterCatalogSnapshot> {
  const [categories] = await connection.execute<any[]>(
    "SELECT id, slug, isActive FROM service_categories",
  );
  const [subcategories] = await connection.execute<any[]>(
    "SELECT id, categoryId, slug, isActive FROM service_subcategories",
  );
  return {
    categories: categories.map((row) => ({ id: Number(row.id), slug: String(row.slug), isActive: Number(row.isActive) })),
    subcategories: subcategories.map((row) => ({
      id: Number(row.id),
      categoryId: Number(row.categoryId),
      slug: String(row.slug),
      isActive: Number(row.isActive),
    })),
  };
}

/** Runs only with a real internal actor id; it never enables a country or payment provider. */
export async function applyTurkeyGoldMasterSeed(connection: Connection, actorUserId: number) {
  if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
    throw new Error("TR_GOLD_MASTER_ACTOR_REQUIRED");
  }

  const jurisdictionId = await findOrCreateJurisdiction(connection);
  const canonicalCatalog = await loadCanonicalCatalog(connection);
  const sourceIdByRegistryId = new Map<string, number>();
  for (const source of TR_OFFICIAL_SOURCES) {
    await connection.execute(
      `INSERT INTO official_compliance_sources
        (jurisdictionId, authorityName, sourceUrl, sourceVersion, status, reviewedByUserId, reviewedAt)
       VALUES (?, ?, ?, ?, 'verified', ?, NOW())
       ON DUPLICATE KEY UPDATE sourceVersion=VALUES(sourceVersion), status='verified', reviewedByUserId=VALUES(reviewedByUserId), reviewedAt=NOW()`,
      [jurisdictionId, source.authorityName, source.sourceUrl, source.sourceVersion, actorUserId],
    );
    const [rows] = await connection.execute<any[]>(
      "SELECT id FROM official_compliance_sources WHERE jurisdictionId = ? AND sourceUrl = ? ORDER BY id DESC LIMIT 1",
      [jurisdictionId, source.sourceUrl],
    );
    if (!rows[0]?.id) throw new Error("TR_GOLD_MASTER_SOURCE_LOOKUP_FAILED");
    sourceIdByRegistryId.set(source.registryId, Number(rows[0].id));
  }

  await connection.execute(
    `INSERT INTO jurisdiction_compliance_packages
      (jurisdictionId, version, status, summary, createdByUserId)
     VALUES (?, ?, 'legal_review', ?, ?)
     ON DUPLICATE KEY UPDATE status='legal_review', summary=VALUES(summary)`,
    [
      jurisdictionId,
      TR_GOLD_MASTER_VERSION,
      `${countryPack.country} Gold Master ${countryPack.pack_id}: onaylı kaynak paketi kaydedildi; hukuk onayı, ödeme readiness ve country launch gate tamamlanmadan kullanıma açılamaz.`,
      actorUserId,
    ],
  );
  const [packages] = await connection.execute<any[]>(
    "SELECT id FROM jurisdiction_compliance_packages WHERE jurisdictionId = ? AND version = ? LIMIT 1",
    [jurisdictionId, TR_GOLD_MASTER_VERSION],
  );
  const packageId = Number(packages[0]?.id);
  if (!packageId) throw new Error("TR_GOLD_MASTER_PACKAGE_LOOKUP_FAILED");

  for (const rule of TR_CAPABILITY_RULES) {
    const catalogMapping = resolveGoldMasterScopeMapping(canonicalCatalog, rule.sourceScopeKey);
    const mappedCategoryId = catalogMapping.status === "RESOLVED" ? catalogMapping.value.categoryId : null;
    const mappedSubcategoryId = catalogMapping.status === "RESOLVED" ? catalogMapping.value.subcategoryId : null;
    const seededRuleStatus = catalogMapping.status === "RESOLVED" ? rule.ruleStatus : "unknown";
    const seededConditionalStatus = catalogMapping.status === "RESOLVED" ? "conditional" : "blocked";
    const scopeConstraints = {
      ...rule.scopeConstraints,
      canonicalCatalogMapping: catalogMapping.status === "RESOLVED"
        ? { status: catalogMapping.status, ...catalogMapping.value }
        : { status: catalogMapping.status, reason: catalogMapping.reason },
      unmappedCatalogPolicy: catalogMapping.status === "RESOLVED" ? null : "LEGAL_REVIEW_REQUIRED",
    };
    await connection.execute(
      `INSERT INTO service_capabilities (\`key\`, displayName, categoryId, subcategoryId, status)
       VALUES (?, ?, ?, ?, 'draft')
       ON DUPLICATE KEY UPDATE displayName=VALUES(displayName), categoryId=VALUES(categoryId),
         subcategoryId=VALUES(subcategoryId), status='draft'`,
      [rule.key, rule.displayName, mappedCategoryId, mappedSubcategoryId],
    );
    const [capabilities] = await connection.execute<any[]>(
      "SELECT id FROM service_capabilities WHERE `key` = ? LIMIT 1",
      [rule.key],
    );
    const capabilityId = Number(capabilities[0]?.id);
    if (!capabilityId) throw new Error("TR_GOLD_MASTER_CAPABILITY_LOOKUP_FAILED");

    // A package rule without a listed registry source remains source-unlinked
    // and blocked for legal review. It must never inherit an arbitrary source
    // citation from a different rule.
    const primarySourceId = rule.sourceReferenceIds
      .map((referenceId) => sourceIdByRegistryId.get(referenceId))
      .find((sourceId): sourceId is number => Boolean(sourceId)) ?? null;

    await connection.execute(
      `INSERT INTO capability_jurisdiction_rules
        (packageId, capabilityId, sourceId, requiredCredentialType, requiresHumanReview, ruleStatus, scopeConstraintsJson, conditionalStatus, rationale)
       VALUES (?, ?, ?, ?, 1, ?, CAST(? AS JSON), ?, ?)
       ON DUPLICATE KEY UPDATE requiredCredentialType=VALUES(requiredCredentialType), requiresHumanReview=1,
         ruleStatus=VALUES(ruleStatus), scopeConstraintsJson=VALUES(scopeConstraintsJson), conditionalStatus=VALUES(conditionalStatus), rationale=VALUES(rationale)`,
      [
        packageId,
        capabilityId,
        primarySourceId,
        rule.credentialType,
        seededRuleStatus,
        JSON.stringify(scopeConstraints),
        seededConditionalStatus,
        rule.rationale,
      ],
    );

    // The approved package does not distinguish provider operating models. Keep
    // that fact explicit by emitting identical source-derived rows per reviewed
    // model instead of inventing model-specific legal requirements. Unmapped or
    // source-unlinked scopes have no usable catalog row and runtime blocks.
    if (catalogMapping.status === "RESOLVED" && primarySourceId !== null) {
      for (const [credentialIndex, sourceLabel] of rule.credentialLabels.entries()) {
        for (const providerType of PROVIDER_REQUIREMENT_TYPES) {
          await connection.execute(
            `INSERT INTO credential_requirement_catalog
              (jurisdictionId, categoryId, subcategoryId, capabilityId, providerType, credentialType, requirementState,
               minimumAssurance, requiresHumanReview, officialSourceId, sourceReferenceIdsJson, sourceVersion, ruleVersion, provenanceJson, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'F', 1, ?, CAST(? AS JSON), ?, ?, CAST(? AS JSON), 1)
             ON DUPLICATE KEY UPDATE requirementState=VALUES(requirementState), minimumAssurance='F', requiresHumanReview=1,
               officialSourceId=VALUES(officialSourceId), sourceReferenceIdsJson=VALUES(sourceReferenceIdsJson),
               sourceVersion=VALUES(sourceVersion), provenanceJson=VALUES(provenanceJson), isActive=1`,
            [
              jurisdictionId,
              mappedCategoryId,
              mappedSubcategoryId,
              capabilityId,
              providerType,
              sourceDocumentType(rule.sourceScopeKey, credentialIndex),
              seededRuleStatus,
              primarySourceId,
              JSON.stringify(rule.sourceReferenceIds),
              `${countryPack.pack_id}:${sourceLabel}`,
              TR_GOLD_MASTER_VERSION,
              JSON.stringify({
                approvedPackId: countryPack.pack_id,
                sourceScopeKey: rule.sourceScopeKey,
                sourceCredentialLabel: sourceLabel,
                sourceReferenceIds: rule.sourceReferenceIds,
                sourceDecisionStatus: rule.rationale,
                providerType,
              }),
            ],
          );
        }
      }
    }
  }

  return { jurisdictionId, packageId, version: TR_GOLD_MASTER_VERSION, status: "legal_review" as const };
}

export const turkeyGoldMasterSeed = {
  version: TR_GOLD_MASTER_VERSION,
  countryPack,
  sources: TR_OFFICIAL_SOURCES,
  rules: TR_CAPABILITY_RULES,
};
