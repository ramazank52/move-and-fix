import "./load-env.js";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2";
import mysql from "mysql2/promise";

type CoverageRow = RowDataPacket & {
  researchRowId: string;
  categoryId: number;
  categorySlug: string;
  subcategoryId: number;
  subcategorySlug: string;
  mappingState: string;
  sourceState: string;
  legalState: string;
  connectorState: string;
  productionState: string;
  riskLevel: string;
  decision: string;
  assuranceLevel: string;
  legalApprovalState: string;
  productReleaseState: string;
  mandatoryBundles: string | null;
  conditionalBundles: string | null;
  sourceIdsJson: string;
  missingEvidenceDecision: string;
};

type NamedCount = RowDataPacket & { key: string; count: number };

const outputDirectory = path.resolve("docs/compliance/us-ca-la-v2-evidence");
const csvEscape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for read-only US evidence export");
  await mkdir(outputDirectory, { recursive: true });
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [coverageRows] = await connection.query<CoverageRow[]>(`
      SELECT
        coverage.researchRowId,
        category.id AS categoryId,
        category.slug AS categorySlug,
        subcategory.id AS subcategoryId,
        subcategory.slug AS subcategorySlug,
        coverage.mappingState,
        coverage.sourceState,
        coverage.legalState,
        coverage.connectorState,
        coverage.productionState,
        coverage.riskLevel,
        decision.decision,
        decision.assuranceLevel,
        decision.legalApprovalState,
        decision.productReleaseState,
        coverage.sourceIdsJson,
        coverage.missingEvidenceDecision,
        GROUP_CONCAT(DISTINCT CASE WHEN binding.bindingKind = 'MANDATORY' THEN bundle.bundleKey END ORDER BY bundle.bundleKey SEPARATOR '|') AS mandatoryBundles,
        GROUP_CONCAT(DISTINCT CASE WHEN binding.bindingKind = 'CONDITIONAL' THEN bundle.bundleKey END ORDER BY bundle.bundleKey SEPARATOR '|') AS conditionalBundles
      FROM country_service_coverage coverage
      INNER JOIN country_deployments deployment ON deployment.id = coverage.countryDeploymentId
      INNER JOIN service_categories category ON category.id = coverage.canonicalCategoryId
      INNER JOIN service_subcategories subcategory ON subcategory.id = coverage.canonicalSubcategoryId
      INNER JOIN country_coverage_policy_decisions decision ON decision.coverageId = coverage.id
      LEFT JOIN country_coverage_bundle_bindings binding ON binding.coverageId = coverage.id
      LEFT JOIN country_requirement_bundles bundle ON bundle.id = binding.bundleId
      WHERE deployment.countryCode = 'US'
      GROUP BY coverage.id, decision.id, category.id, subcategory.id
      ORDER BY category.id, subcategory.id
    `);
    const [sources] = await connection.query<NamedCount[]>(`
      SELECT CONCAT(source.sourceKey, '|', source.authorityName, '|', source.sourceUrl, '|', source.sourceStatus) AS \`key\`, 1 AS count
      FROM official_sources source
      INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
      WHERE deployment.countryCode = 'US'
      ORDER BY source.sourceKey
    `);
    const [connectors] = await connection.query<NamedCount[]>(`
      SELECT CONCAT(connector.connectorKey, '|', connector.status, '|', connector.assuranceLevel, '|', connector.forbiddenScraping) AS \`key\`, 1 AS count
      FROM verification_connectors connector
      INNER JOIN country_deployments deployment ON deployment.id = connector.countryDeploymentId
      WHERE deployment.countryCode = 'US'
      ORDER BY connector.connectorKey
    `);
    const [locales] = await connection.query<NamedCount[]>(`
      SELECT CONCAT(document.documentKey, '|', localized.locale, '|', localized.localizationState, '|', localized.runtimeSelectable) AS \`key\`, 1 AS count
      FROM localized_legal_versions localized
      INNER JOIN legal_documents document ON document.id = localized.legalDocumentId
      INNER JOIN country_deployments deployment ON deployment.id = document.countryDeploymentId
      WHERE deployment.countryCode = 'US'
      ORDER BY document.documentKey, localized.locale
    `);

    const headers = [
      "research_row_id", "canonical_category_id", "canonical_category_slug", "canonical_subcategory_id", "canonical_subcategory_slug",
      "mapping_state", "risk_level", "mandatory_bundles", "conditional_bundles", "source_ids_json", "source_state", "legal_state",
      "connector_state", "policy_decision", "assurance_level", "legal_approval_state", "product_release_state", "production_state", "missing_evidence_decision",
    ];
    const csv = [headers.join(","), ...coverageRows.map((row) => [
      row.researchRowId, row.categoryId, row.categorySlug, row.subcategoryId, row.subcategorySlug,
      row.mappingState, row.riskLevel, row.mandatoryBundles, row.conditionalBundles, row.sourceIdsJson, row.sourceState, row.legalState,
      row.connectorState, row.decision, row.assuranceLevel, row.legalApprovalState, row.productReleaseState, row.productionState, row.missingEvidenceDecision,
    ].map(csvEscape).join(","))].join("\n") + "\n";
    const sourcesCsv = ["source_key|authority|url|source_status", ...sources.map((row) => row.key)].join("\n") + "\n";
    const connectorsCsv = ["connector_key|status|assurance_level|forbidden_scraping", ...connectors.map((row) => row.key)].join("\n") + "\n";
    const localesCsv = ["document_key|locale|localization_state|runtime_selectable", ...locales.map((row) => row.key)].join("\n") + "\n";
    const summary = {
      schema: "movefix.us-ca-la.checkpoint-a.evidence.v1",
      generatedAt: new Date().toISOString(),
      scope: "US-CA-LOS_ANGELES; read-only; no provider or personal data",
      coverage: {
        rows: coverageRows.length,
        mappedBlocked: coverageRows.filter((row) => row.mappingState === "MAPPED_BLOCKED").length,
        blockedPendingGates: coverageRows.filter((row) => row.productionState === "BLOCKED_PENDING_GATES").length,
        sourceUnverified: coverageRows.filter((row) => row.sourceState !== "SOURCE_VERIFIED").length,
        legalNotApproved: coverageRows.filter((row) => row.legalApprovalState !== "APPROVED").length,
        connectorNotOperational: coverageRows.filter((row) => row.connectorState !== "OPERATIONAL").length,
      },
      sourceRows: sources.length,
      connectorRows: connectors.length,
      localeRows: locales.length,
      fileHashes: {
        coverageMatrix: sha256(csv),
        sourceRegistry: sha256(sourcesCsv),
        connectorRegistry: sha256(connectorsCsv),
        localeRegistry: sha256(localesCsv),
      },
    };
    await Promise.all([
      writeFile(path.join(outputDirectory, "US_CA_LA_COVERAGE_MATRIX.csv"), csv),
      writeFile(path.join(outputDirectory, "US_CA_LA_SOURCE_REGISTRY.txt"), sourcesCsv),
      writeFile(path.join(outputDirectory, "US_CA_LA_CONNECTOR_REGISTRY.txt"), connectorsCsv),
      writeFile(path.join(outputDirectory, "US_CA_LA_LOCALE_REGISTRY.txt"), localesCsv),
      writeFile(path.join(outputDirectory, "US_CA_LA_EVIDENCE_SUMMARY.json"), JSON.stringify(summary, null, 2) + "\n"),
    ]);
    console.log(JSON.stringify(summary));
  } finally {
    await connection.end();
  }
}

void main();
