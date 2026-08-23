import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Coverage = {
  row_id: string;
  canonicalCategoryId: number;
  canonicalSubcategoryId: number;
  mappingState: "MAPPED_BLOCKED" | "UNMAPPED_SERVICE_BLOCKED";
  mandatory_bundle_ids: string[];
  conditional_bundle_ids: string[];
  conditional_trigger_summary: string;
  mandatory_evidence_after_profile_resolution: string[];
  intake_questions: string[];
  source_ids: string[];
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  missing_evidence_decision: string;
  source_status: string;
};

type Bundle = {
  id: string;
  title: string;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  decision_if_missing: string;
  trigger: string;
  verification: string;
  required_evidence: string[];
  subject_types: string[];
  source_ids: string[];
  note?: string;
};

type Source = {
  id: string;
  authority: string;
  title: string;
  url: string;
  use: string;
  retrieved_at?: string;
};

type Reconciliation = {
  researchPackage: { seedVersion: string; sourceSha256: string; researchCutoff: string };
  coverage: Coverage[];
  bundles: Bundle[];
  sources: Source[];
};

const reconciliationPath = path.resolve("docs/compliance/us-ca-la-v2-research-reconciliation.json");
const outputPath = path.resolve("drizzle/0087_us_ca_la_v2_default_off.sql");
const version = "2.0.0-research";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  const normalized = typeof value === "string" ? value : JSON.stringify(value);
  return `'${normalized.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

function sqlLines(values: string[]) {
  return values.length ? `${values.join("\n--> statement-breakpoint\n")}\n--> statement-breakpoint\n` : "";
}

function referencesForCoverage(coverage: Coverage, bundles: Map<string, Bundle>) {
  const sourceIds = new Set(coverage.source_ids);
  for (const bundleId of [...coverage.mandatory_bundle_ids, ...coverage.conditional_bundle_ids]) {
    for (const sourceId of bundles.get(bundleId)?.source_ids ?? []) sourceIds.add(sourceId);
  }
  return [...sourceIds].sort();
}

async function main() {
  const artifact = JSON.parse(await readFile(reconciliationPath, "utf8")) as Reconciliation;
  if (artifact.coverage.length !== 62 || artifact.coverage.some((row) => row.mappingState !== "MAPPED_BLOCKED")) {
    throw new Error("US V2 coverage must contain exactly 62 MAPPED_BLOCKED rows before seed generation");
  }
  const bundles = new Map(artifact.bundles.map((bundle) => [bundle.id, bundle]));
  const sources = new Map(artifact.sources.map((source) => [source.id, source]));
  const referencedBundles = new Set(artifact.coverage.flatMap((row) => [...row.mandatory_bundle_ids, ...row.conditional_bundle_ids]));
  const referencedSources = new Set(artifact.coverage.flatMap((row) => referencesForCoverage(row, bundles)));
  if (referencedBundles.size !== artifact.bundles.length || referencedSources.size !== artifact.sources.length) {
    throw new Error("Reconciliation artifact has an unexpected US bundle or source reference mismatch");
  }

  const ddl = `-- US-CA-LOS_ANGELES v2 research scaffold. All seed records are default-off.
-- This migration does not alter Turkey, Berlin, provider profiles, users, or production feature flags.
CREATE TABLE \`country_rule_pack_versions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`countryDeploymentId\` int NOT NULL,
  \`jurisdictionNodeId\` int NOT NULL,
  \`version\` varchar(80) NOT NULL,
  \`researchSeedHash\` varchar(128) NOT NULL,
  \`state\` enum('AI_RESEARCHED_UNVERIFIED','SOURCE_REVIEW','LEGAL_REVIEW','APPROVED','REVOKED') NOT NULL DEFAULT 'AI_RESEARCHED_UNVERIFIED',
  \`legalApprovalLedgerId\` int NULL,
  \`activatedAt\` timestamp NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`country_rule_pack_versions_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`country_rule_pack_versions_scope_unique\` UNIQUE(\`countryDeploymentId\`,\`jurisdictionNodeId\`,\`version\`)
);
--> statement-breakpoint
CREATE TABLE \`country_service_coverage\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`countryDeploymentId\` int NOT NULL,
  \`jurisdictionNodeId\` int NOT NULL,
  \`canonicalCategoryId\` int NOT NULL,
  \`canonicalSubcategoryId\` int NOT NULL,
  \`researchRowId\` varchar(240) NOT NULL,
  \`researchRulePackVersion\` varchar(80) NOT NULL,
  \`researchRowHash\` varchar(128) NOT NULL,
  \`mappingState\` enum('MAPPED_BLOCKED','UNMAPPED_SERVICE_BLOCKED') NOT NULL DEFAULT 'UNMAPPED_SERVICE_BLOCKED',
  \`sourceState\` enum('AI_RESEARCHED_UNVERIFIED','SOURCE_UNVERIFIED','SOURCE_VERIFIED') NOT NULL DEFAULT 'AI_RESEARCHED_UNVERIFIED',
  \`legalState\` enum('NOT_REVIEWED','PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'NOT_REVIEWED',
  \`connectorState\` enum('NOT_IMPLEMENTED_OR_NOT_AUTHORIZED','PENDING','AUTHORIZED','OPERATIONAL','REVOKED') NOT NULL DEFAULT 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED',
  \`productionState\` enum('BLOCKED_PENDING_GATES','NO_GO','POLICY_ELIGIBLE','ACTIVE') NOT NULL DEFAULT 'BLOCKED_PENDING_GATES',
  \`riskLevel\` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  \`mandatoryEvidenceJson\` json NOT NULL,
  \`intakeQuestionsJson\` json NOT NULL,
  \`sourceIdsJson\` json NOT NULL,
  \`conditionalTriggerSummary\` text NULL,
  \`missingEvidenceDecision\` varchar(120) NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`country_service_coverage_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`country_service_coverage_scope_subservice_unique\` UNIQUE(\`countryDeploymentId\`,\`jurisdictionNodeId\`,\`canonicalSubcategoryId\`),
  CONSTRAINT \`country_service_coverage_research_row_unique\` UNIQUE(\`countryDeploymentId\`,\`researchRowId\`,\`researchRulePackVersion\`)
);
--> statement-breakpoint
CREATE TABLE \`country_requirement_bundles\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`countryDeploymentId\` int NOT NULL,
  \`rulePackVersionId\` int NOT NULL,
  \`bundleKey\` varchar(160) NOT NULL,
  \`title\` varchar(320) NOT NULL,
  \`riskLevel\` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  \`sourceState\` enum('AI_RESEARCHED_UNVERIFIED','SOURCE_UNVERIFIED','SOURCE_VERIFIED') NOT NULL DEFAULT 'AI_RESEARCHED_UNVERIFIED',
  \`legalState\` enum('NOT_REVIEWED','PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'NOT_REVIEWED',
  \`decisionIfMissing\` varchar(120) NOT NULL,
  \`triggerDescription\` text NOT NULL,
  \`verificationDescription\` text NOT NULL,
  \`requiredEvidenceJson\` json NOT NULL,
  \`subjectTypesJson\` json NOT NULL,
  \`note\` text NULL,
  \`researchHash\` varchar(128) NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`country_requirement_bundles_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`country_requirement_bundles_scope_unique\` UNIQUE(\`countryDeploymentId\`,\`rulePackVersionId\`,\`bundleKey\`)
);
--> statement-breakpoint
CREATE TABLE \`country_coverage_bundle_bindings\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`coverageId\` int NOT NULL,
  \`bundleId\` int NOT NULL,
  \`bindingKind\` enum('MANDATORY','CONDITIONAL') NOT NULL,
  \`conditionSummary\` text NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`country_coverage_bundle_bindings_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`country_coverage_bundle_binding_unique\` UNIQUE(\`coverageId\`,\`bundleId\`,\`bindingKind\`)
);
--> statement-breakpoint
CREATE TABLE \`country_requirement_subject_bindings\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`bundleId\` int NOT NULL,
  \`subjectType\` enum('PERSON','BUSINESS','QUALIFIED_MANAGER','DRIVER','VEHICLE','SITE','OPERATOR','PROJECT','CUSTOMER_AUTHORITY','POLICY','QUALIFIER') NOT NULL,
  \`required\` int NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`country_requirement_subject_bindings_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`country_requirement_subject_binding_unique\` UNIQUE(\`bundleId\`,\`subjectType\`)
);
--> statement-breakpoint
CREATE TABLE \`country_source_archives\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`officialSourceId\` int NOT NULL,
  \`retrievalHash\` varchar(128) NOT NULL,
  \`archiveReference\` varchar(512) NOT NULL,
  \`sectionReference\` varchar(320) NULL,
  \`effectiveDateText\` varchar(160) NULL,
  \`exceptionText\` text NULL,
  \`researchState\` enum('AI_RESEARCHED_UNVERIFIED','SOURCE_UNVERIFIED','SOURCE_VERIFIED','SUPERSEDED') NOT NULL DEFAULT 'AI_RESEARCHED_UNVERIFIED',
  \`retrievedAt\` timestamp NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`country_source_archives_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`country_source_archives_source_hash_unique\` UNIQUE(\`officialSourceId\`,\`retrievalHash\`)
);
--> statement-breakpoint
CREATE TABLE \`country_requirement_source_bindings\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`bundleId\` int NOT NULL,
  \`officialSourceId\` int NOT NULL,
  \`sourceArchiveId\` int NOT NULL,
  \`requirementReference\` varchar(320) NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`country_requirement_source_bindings_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`country_requirement_source_binding_unique\` UNIQUE(\`bundleId\`,\`officialSourceId\`)
);
--> statement-breakpoint
CREATE TABLE \`country_coverage_policy_decisions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`coverageId\` int NOT NULL,
  \`rulePackVersionId\` int NOT NULL,
  \`decision\` enum('BLOCKED','PROFILE_INCOMPLETE','LEGAL_REVIEW_REQUIRED','PENDING_OFFICIAL_VERIFICATION','AUTHORITY_VERIFIED','POLICY_ELIGIBLE','VERIFIED_LIMITED_SCOPE','REJECTED','EXPIRED_OR_SUSPENDED','NO_GO') NOT NULL DEFAULT 'BLOCKED',
  \`assuranceLevel\` enum('SELF_ASSERTED','DOCUMENT_UPLOADED','DOCUMENT_EXTRACTED','ISSUER_SIGNATURE_VERIFIED','REGISTRY_MATCHED','REGISTRY_STATUS_ACTIVE','REVOCATION_MONITORED') NOT NULL DEFAULT 'SELF_ASSERTED',
  \`sourceState\` enum('AI_RESEARCHED_UNVERIFIED','SOURCE_UNVERIFIED','SOURCE_VERIFIED') NOT NULL DEFAULT 'AI_RESEARCHED_UNVERIFIED',
  \`connectorState\` enum('NOT_IMPLEMENTED_OR_NOT_AUTHORIZED','PENDING','AUTHORIZED','OPERATIONAL','REVOKED') NOT NULL DEFAULT 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED',
  \`legalApprovalState\` enum('NOT_REVIEWED','PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'NOT_REVIEWED',
  \`productReleaseState\` enum('PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  \`stateVersion\` int NOT NULL DEFAULT 1,
  \`reasonCodesJson\` json NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`country_coverage_policy_decisions_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`country_coverage_policy_decisions_coverage_unique\` UNIQUE(\`coverageId\`)
);
--> statement-breakpoint
CREATE TABLE \`country_coverage_policy_events\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`coveragePolicyDecisionId\` int NOT NULL,
  \`eventType\` enum('SEEDED','REVIEW_REQUESTED','SUSPENDED','REVOKED','EVIDENCE_REJECTED') NOT NULL,
  \`actorUserId\` int NULL,
  \`reasonCode\` varchar(160) NOT NULL,
  \`evidenceHash\` varchar(128) NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`country_coverage_policy_events_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE TABLE \`country_active_provider_transitions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`coverageId\` int NOT NULL,
  \`providerId\` int NOT NULL,
  \`state\` enum('NOT_APPLICABLE','PENDING_OWNER_APPROVAL','WINDOW_APPROVED','NOTIFIED','BLOCKED','EXPIRED_OR_SUSPENDED') NOT NULL DEFAULT 'NOT_APPLICABLE',
  \`transitionWindowEndsAt\` timestamp NULL,
  \`ownerApprovalLedgerId\` int NULL,
  \`notificationEvidenceHash\` varchar(128) NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`country_active_provider_transitions_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`country_active_provider_transition_unique\` UNIQUE(\`coverageId\`,\`providerId\`)
);
--> statement-breakpoint
`;

  const alter = `ALTER TABLE \`country_rule_pack_versions\` ADD CONSTRAINT \`fk_country_rule_pack_deployment\` FOREIGN KEY (\`countryDeploymentId\`) REFERENCES \`country_deployments\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_rule_pack_versions\` ADD CONSTRAINT \`fk_country_rule_pack_jurisdiction\` FOREIGN KEY (\`jurisdictionNodeId\`) REFERENCES \`jurisdiction_nodes\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_rule_pack_versions\` ADD CONSTRAINT \`fk_country_rule_pack_legal_ledger\` FOREIGN KEY (\`legalApprovalLedgerId\`) REFERENCES \`approval_ledger\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_service_coverage\` ADD CONSTRAINT \`fk_country_service_coverage_deployment\` FOREIGN KEY (\`countryDeploymentId\`) REFERENCES \`country_deployments\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_service_coverage\` ADD CONSTRAINT \`fk_country_service_coverage_jurisdiction\` FOREIGN KEY (\`jurisdictionNodeId\`) REFERENCES \`jurisdiction_nodes\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_service_coverage\` ADD CONSTRAINT \`fk_country_service_coverage_category\` FOREIGN KEY (\`canonicalCategoryId\`) REFERENCES \`service_categories\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_service_coverage\` ADD CONSTRAINT \`fk_country_service_coverage_subcategory\` FOREIGN KEY (\`canonicalSubcategoryId\`) REFERENCES \`service_subcategories\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_requirement_bundles\` ADD CONSTRAINT \`fk_country_requirement_bundle_deployment\` FOREIGN KEY (\`countryDeploymentId\`) REFERENCES \`country_deployments\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_requirement_bundles\` ADD CONSTRAINT \`fk_country_requirement_bundle_rule_pack\` FOREIGN KEY (\`rulePackVersionId\`) REFERENCES \`country_rule_pack_versions\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_coverage_bundle_bindings\` ADD CONSTRAINT \`fk_country_coverage_bundle_coverage\` FOREIGN KEY (\`coverageId\`) REFERENCES \`country_service_coverage\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_coverage_bundle_bindings\` ADD CONSTRAINT \`fk_country_coverage_bundle_bundle\` FOREIGN KEY (\`bundleId\`) REFERENCES \`country_requirement_bundles\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_requirement_subject_bindings\` ADD CONSTRAINT \`fk_country_requirement_subject_bundle\` FOREIGN KEY (\`bundleId\`) REFERENCES \`country_requirement_bundles\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_source_archives\` ADD CONSTRAINT \`fk_country_source_archive_source\` FOREIGN KEY (\`officialSourceId\`) REFERENCES \`official_sources\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_requirement_source_bindings\` ADD CONSTRAINT \`fk_country_requirement_source_bundle\` FOREIGN KEY (\`bundleId\`) REFERENCES \`country_requirement_bundles\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_requirement_source_bindings\` ADD CONSTRAINT \`fk_country_requirement_source_source\` FOREIGN KEY (\`officialSourceId\`) REFERENCES \`official_sources\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_requirement_source_bindings\` ADD CONSTRAINT \`fk_country_requirement_source_archive\` FOREIGN KEY (\`sourceArchiveId\`) REFERENCES \`country_source_archives\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_coverage_policy_decisions\` ADD CONSTRAINT \`fk_country_coverage_policy_coverage\` FOREIGN KEY (\`coverageId\`) REFERENCES \`country_service_coverage\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_coverage_policy_decisions\` ADD CONSTRAINT \`fk_country_coverage_policy_rule_pack\` FOREIGN KEY (\`rulePackVersionId\`) REFERENCES \`country_rule_pack_versions\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_coverage_policy_events\` ADD CONSTRAINT \`fk_country_coverage_policy_event_decision\` FOREIGN KEY (\`coveragePolicyDecisionId\`) REFERENCES \`country_coverage_policy_decisions\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_coverage_policy_events\` ADD CONSTRAINT \`fk_country_coverage_policy_event_actor\` FOREIGN KEY (\`actorUserId\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_active_provider_transitions\` ADD CONSTRAINT \`fk_country_active_provider_transition_coverage\` FOREIGN KEY (\`coverageId\`) REFERENCES \`country_service_coverage\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_active_provider_transitions\` ADD CONSTRAINT \`fk_country_active_provider_transition_provider\` FOREIGN KEY (\`providerId\`) REFERENCES \`providers\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE \`country_active_provider_transitions\` ADD CONSTRAINT \`fk_country_active_provider_transition_ledger\` FOREIGN KEY (\`ownerApprovalLedgerId\`) REFERENCES \`approval_ledger\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
CREATE INDEX \`country_service_coverage_policy_idx\` ON \`country_service_coverage\` (\`countryDeploymentId\`,\`productionState\`,\`mappingState\`);
--> statement-breakpoint
CREATE INDEX \`country_requirement_bundles_state_idx\` ON \`country_requirement_bundles\` (\`countryDeploymentId\`,\`sourceState\`,\`legalState\`);
--> statement-breakpoint
CREATE INDEX \`country_coverage_policy_decisions_decision_idx\` ON \`country_coverage_policy_decisions\` (\`decision\`,\`sourceState\`,\`connectorState\`);
--> statement-breakpoint
CREATE INDEX \`country_coverage_policy_events_decision_idx\` ON \`country_coverage_policy_events\` (\`coveragePolicyDecisionId\`,\`createdAt\`);
--> statement-breakpoint
`;

  const seed: string[] = [
    `INSERT INTO jurisdiction_nodes (countryDeploymentId,parentId,nodeCode,displayName,nodeType,state,locale,currency,timeZone,addressProfile)
SELECT deployment.id, root.id, 'US-CA-CALIFORNIA', 'California', 'state', 'SCAFFOLD_ONLY', 'en-US', 'USD', 'America/Los_Angeles', 'UNKNOWN'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes root ON root.countryDeploymentId = deployment.id AND root.nodeCode = 'US'
WHERE deployment.countryCode = 'US';`,
    `INSERT INTO jurisdiction_nodes (countryDeploymentId,parentId,nodeCode,displayName,nodeType,state,locale,currency,timeZone,addressProfile)
SELECT deployment.id, california.id, 'US-CA-LOS_ANGELES', 'Los Angeles', 'city', 'SCAFFOLD_ONLY', 'en-US', 'USD', 'America/Los_Angeles', 'UNKNOWN'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes california ON california.countryDeploymentId = deployment.id AND california.nodeCode = 'US-CA-CALIFORNIA'
WHERE deployment.countryCode = 'US';`,
    `INSERT INTO country_rule_pack_versions (countryDeploymentId,jurisdictionNodeId,version,researchSeedHash,state)
SELECT deployment.id, los_angeles.id, ${literal(version)}, ${literal(artifact.researchPackage.sourceSha256)}, 'AI_RESEARCHED_UNVERIFIED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';`,
  ];

  for (const sourceId of [...referencedSources].sort()) {
    const source = sources.get(sourceId)!;
    const sourceHash = sha256(JSON.stringify(source));
    seed.push(`INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, ${literal(source.id)}, ${literal(source.authority)}, ${literal(source.url)}, ${literal(`v2-research-${artifact.researchPackage.researchCutoff}`)}, ${literal(sourceHash)}, 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';`);
    seed.push(`INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, ${literal(sourceHash)}, ${literal(`mf5-v2-research:${source.id}:${sourceHash}`)}, ${literal(`Research source: ${source.title}`)}, NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = ${literal(source.id)} AND source.sourceVersion = ${literal(`v2-research-${artifact.researchPackage.researchCutoff}`)};`);
    seed.push(`INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, ${literal(`US_V2_CANDIDATE_${source.id}`)}, ${literal(`Research candidate — ${source.authority}`)}, 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = ${literal(source.id)}
WHERE deployment.countryCode = 'US';`);
  }

  for (const bundleId of [...referencedBundles].sort()) {
    const bundle = bundles.get(bundleId)!;
    seed.push(`INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, ${literal(bundle.id)}, ${literal(bundle.title)}, ${literal(bundle.risk)}, 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', ${literal(bundle.decision_if_missing)}, ${literal(bundle.trigger)}, ${literal(bundle.verification)}, ${literal(bundle.required_evidence)}, ${literal(bundle.subject_types)}, ${literal(bundle.note ?? null)}, ${literal(sha256(JSON.stringify(bundle)))}
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = ${literal(version)}
WHERE deployment.countryCode = 'US';`);
    seed.push(`INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, ${literal(`US-CA-LA:${bundle.id}`)}, ${literal(version)}, 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, ${literal(`AI_RESEARCHED_UNVERIFIED bundle: ${bundle.id}`)}, 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = ${literal(bundle.source_ids[0] ?? "")}
WHERE deployment.countryCode = 'US';`);
    for (const subjectType of bundle.subject_types) {
      seed.push(`INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, ${literal(subjectType)}, 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = ${literal(bundle.id)};`);
    }
    for (const sourceId of bundle.source_ids) {
      seed.push(`INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, ${literal(`Bundle research source: ${sourceId}`)}
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = ${literal(sourceId)}
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = ${literal(bundle.id)};`);
    }
  }

  for (const coverage of artifact.coverage) {
    seed.push(`INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, ${coverage.canonicalCategoryId}, ${coverage.canonicalSubcategoryId}, ${literal(coverage.row_id)}, ${literal(version)}, ${literal(sha256(JSON.stringify(coverage)))}, 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', ${literal(coverage.risk)}, ${literal(coverage.mandatory_evidence_after_profile_resolution)}, ${literal(coverage.intake_questions)}, ${literal(referencesForCoverage(coverage, bundles))}, ${literal(coverage.conditional_trigger_summary)}, ${literal(coverage.missing_evidence_decision)}
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';`);
    for (const [bundleId, bindingKind] of [...coverage.mandatory_bundle_ids.map((id) => [id, "MANDATORY"] as const), ...coverage.conditional_bundle_ids.map((id) => [id, "CONDITIONAL"] as const)]) {
      const bundle = bundles.get(bundleId)!;
      seed.push(`INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, ${literal(bindingKind)}, ${literal(bindingKind === "CONDITIONAL" ? coverage.conditional_trigger_summary : null)}
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = ${literal(bundle.id)}
WHERE coverage.researchRowId = ${literal(coverage.row_id)};`);
    }
    seed.push(`INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, ${literal(["COUNTRY_SCAFFOLD_ONLY", "AI_RESEARCHED_UNVERIFIED", "LOCAL_COUNSEL_NOT_REVIEWED", "CONNECTOR_NOT_AUTHORIZED", "PRODUCT_RELEASE_PENDING"])}
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = ${literal(version)}
WHERE coverage.researchRowId = ${literal(coverage.row_id)};`);
    seed.push(`INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', ${literal(sha256(coverage.row_id))}
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = ${literal(coverage.row_id)};`);
  }

  const legalSurfaces = ["consumer_terms", "provider_agreement", "privacy_notice", "cookie_notice", "appeal_notice", "incident_notice"];
  for (const surface of legalSurfaces) {
    const key = `US-CA-LA-${surface.toUpperCase()}`;
    seed.push(`INSERT INTO legal_documents (countryDeploymentId,documentKey,documentVersion,documentSurface,legalApprovalState)
SELECT deployment.id, ${literal(key)}, ${literal(`${version}-draft-machine`)}, ${literal(surface)}, 'PENDING' FROM country_deployments deployment WHERE deployment.countryCode = 'US';`);
    for (const locale of ["en-US", "es-US"]) {
      seed.push(`INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, ${literal(locale)}, 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = ${literal(key)} AND document.documentVersion = ${literal(`${version}-draft-machine`)};`);
    }
  }

  const content = `${ddl}${alter}--> statement-breakpoint\n${sqlLines(seed)}`;
  await writeFile(outputPath, content, "utf8");
  console.log(JSON.stringify({ outputPath, coverageRows: artifact.coverage.length, bundles: referencedBundles.size, sources: referencedSources.size, sha256: sha256(content) }));
}

void main();
