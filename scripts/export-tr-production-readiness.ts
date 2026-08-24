import "./load-env.js";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

import countryPack from "../server/compliance/approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Gold_Master_Country_Pack_v1.json";
import sourceRegistry from "../server/compliance/approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Official_Source_Registry_v1.json";
import { TR_GOLD_MASTER_SCOPE_TARGETS, goldMasterSourceScopeKey } from "../server/compliance/TrGoldMasterCatalogMapping";

type LiveSubservice = { categoryId: number; categorySlug: string; categoryName: string; subcategoryId: number; subcategorySlug: string; subcategoryName: string };
type Rule = (typeof countryPack.services)[number]["rules"][number];

const outputDirectory = resolve(process.cwd(), "docs/compliance/tr-production-evidence");
const approvedPackPath = resolve(process.cwd(), "server/compliance/approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Gold_Master_Country_Pack_v1.json");
const sourceRegistryPath = resolve(process.cwd(), "server/compliance/approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Official_Source_Registry_v1.json");

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function serializeCsv(rows: Record<string, unknown>[]) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n") + "\n";
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceAuthorityAndMethod(sourceIds: string[]) {
  const ids = sourceIds.join("|");
  if (/UAB/.test(ids)) return "UAB / izinli issuer veya kayıtlı yetkili manuel teyit; API/contract yok => PENDING";
  if (/MYK|MEB/.test(ids)) return "MYK/MEB issuer doğrulaması veya kullanıcı yetkili barkodlu belge; API/contract yok => PENDING";
  if (/EPDK/.test(ids)) return "EPDK / dağıtım şirketi sertifika issuer teyidi; API/contract yok => PENDING";
  if (/SERBIS/.test(ids)) return "SERBİS/üretici resmi kayıt teyidi; API/contract yok => PENDING";
  return "Yetkili kurum veya kayıtlı yetkili manuel teyit gerekli; connector NOT_CONFIGURED";
}

function sourceMethodStatus(sourceIds: string[]) {
  return sourceIds.length === 0 ? "BLOCKED_EXTERNAL_INPUT" : "SOURCE_UNVERIFIED";
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED_FOR_READONLY_TR_EXPORT");
  const [packBytes, registryBytes] = await Promise.all([readFile(approvedPackPath), readFile(sourceRegistryPath)]);
  const packHash = sha256(packBytes);
  const registryHash = sha256(registryBytes);
  const client = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [liveRowsRaw] = await client.query(
      `SELECT c.id AS categoryId, c.slug AS categorySlug, c.name AS categoryName,
              s.id AS subcategoryId, s.slug AS subcategorySlug, s.name AS subcategoryName
       FROM service_categories c
       INNER JOIN service_subcategories s ON s.categoryId = c.id
       WHERE c.isActive = 1 AND s.isActive = 1
       ORDER BY c.id, s.id`,
    );
    const liveRows = liveRowsRaw as unknown as LiveSubservice[];

    const sourceById = new Map(sourceRegistry.sources.map((source) => [source.id, source]));
    const ruleByScope = new Map<string, { serviceKey: string; serviceName: string; rule: Rule }>();
    for (const service of countryPack.services) {
      service.rules.forEach((rule, index) => ruleByScope.set(goldMasterSourceScopeKey(service.key, index), { serviceKey: service.key, serviceName: service.name, rule }));
    }
    const scopesByTarget = new Map<string, string[]>();
    for (const [scope, target] of Object.entries(TR_GOLD_MASTER_SCOPE_TARGETS)) {
      if (!target) continue;
      const key = `${target.categorySlug}:${target.subcategorySlug}`;
      const current = scopesByTarget.get(key) ?? [];
      current.push(scope);
      scopesByTarget.set(key, current);
    }

    const matrixRows = liveRows.map((live) => {
      const scopes = scopesByTarget.get(`${live.categorySlug}:${live.subcategorySlug}`) ?? [];
      const ruleRecords = scopes.map((scope) => ({ scope, record: ruleByScope.get(scope) })).filter((entry): entry is { scope: string; record: { serviceKey: string; serviceName: string; rule: Rule } } => Boolean(entry.record));
      const sourceIds = Array.from(new Set(ruleRecords.flatMap(({ record }) => record.rule.sources ?? [])));
      const sourceUrls = sourceIds.map((id) => sourceById.get(id)?.url ?? `SOURCE_ID_NOT_IN_REGISTRY:${id}`);
      const requiredCredentials = ruleRecords.flatMap(({ record }) => record.rule.credentials ?? []);
      const mandatory = ruleRecords.some(({ record }) => /LEGAL_REQUIRED|DYNAMIC_LEGAL_MANDATORY|LOCAL_UTILITY/.test(record.rule.status)) ? "CONDITIONAL_OR_REQUIRED_COUNSEL_TO_CONFIRM" : "CONDITIONAL_OR_UNKNOWN_COUNSEL_TO_CONFIRM";
      const sourceStatus = ruleRecords.length === 0 ? "LEGAL_REVIEW_REQUIRED" : "SOURCE_UNVERIFIED";
      return {
        country_code: "TR",
        canonical_category_id: live.categoryId,
        canonical_category_slug: live.categorySlug,
        canonical_category_name: live.categoryName,
        canonical_subservice_id: live.subcategoryId,
        canonical_subservice_slug: live.subcategorySlug,
        canonical_subservice_name: live.subcategoryName,
        live_catalog_active: "true",
        gold_master_scope_keys: ruleRecords.map(({ scope }) => scope).join(" | ") || "UNMAPPED_LIVE_SUBSERVICE",
        gold_master_service_scopes: ruleRecords.map(({ record }) => `${record.serviceName} — ${record.rule.subservice}`).join(" | ") || "No exact Gold Master scope mapping",
        proposed_requirement_labels: Array.from(new Set(requiredCredentials)).join(" | ") || "UNKNOWN — counsel must determine",
        proposed_requirement_status: mandatory,
        source_reference_ids: sourceIds.join(" | ") || "NONE",
        source_urls: sourceUrls.join(" | ") || "NONE",
        source_archive_reference: `TR-GOLD-2026-08-13-v1.0; country pack sha256=${packHash}; registry sha256=${registryHash}; public retrieval notes=TR_PUBLIC_SOURCE_RETRIEVAL_NOTES.md`,
        source_archive_sha256: registryHash,
        regulation_name: "COUNSEL_REQUIRED — do not infer from research pack",
        article_annex_exception: "COUNSEL_REQUIRED",
        official_gazette_date_number: "COUNSEL_REQUIRED",
        effective_date: "COUNSEL_REQUIRED",
        source_status: sourceStatus,
        legal_review_status: "LEGAL_REVIEW_REQUIRED",
        authority_and_permitted_method: sourceAuthorityAndMethod(sourceIds),
        connector_status: sourceMethodStatus(sourceIds) === "SOURCE_UNVERIFIED" ? "PENDING_OFFICIAL_AUTHORIZATION" : "NOT_CONFIGURED",
        verification_subjects: "PERSON|BUSINESS|QUALIFIED_MANAGER|DRIVER|VEHICLE|OPERATOR|SITE|PROJECT — apply only when counsel marks applicable",
        automatic_authority_verification: "FALSE",
        capability_readiness: "BLOCKED_LEGAL_REVIEW",
        counsel_reviewer_name: "",
        counsel_reviewer_role: "",
        counsel_reviewed_at: "",
        counsel_decision: "",
        counsel_evidence_hash: "",
        counsel_notes: "",
      };
    });

    const sourceRows = sourceRegistry.sources.map((source) => ({
      source_id: source.id,
      authority: source.authority,
      title: source.title,
      official_url: source.url,
      source_archive_reference: `TR_Official_Source_Registry_v1.json:${source.id}; registry sha256=${registryHash}`,
      source_archive_sha256: registryHash,
      retrieval_status: "PUBLIC_DISCOVERY_RETRIEVED_OR_PACK_REFERENCE_ONLY",
      source_status: "SOURCE_UNVERIFIED",
      legal_approval_status: "LEGAL_REVIEW_REQUIRED",
      connector_status: "PENDING_OR_NOT_CONFIGURED",
      permitted_verification_method: sourceAuthorityAndMethod([source.id]),
      api_contract_or_authorization_evidence: "MISSING — do not invoke or scrape",
      counsel_decision: "",
      counsel_evidence_hash: "",
    }));

    const counselRows = matrixRows.map((row) => ({
      review_row_id: `TR-${row.canonical_category_id}-${row.canonical_subservice_id}`,
      canonical_category_id: row.canonical_category_id,
      canonical_subservice_id: row.canonical_subservice_id,
      canonical_subservice_name: row.canonical_subservice_name,
      source_reference_ids: row.source_reference_ids,
      regulation_name: row.regulation_name,
      article_annex_exception: row.article_annex_exception,
      official_gazette_date_number: row.official_gazette_date_number,
      effective_date: row.effective_date,
      legal_requirement_decision: "",
      required_or_conditional: "",
      applicable_subjects: "",
      local_jurisdiction_override: "",
      official_source_archive_sha256: "",
      counsel_name: "",
      counsel_role_and_authority: "",
      counsel_review_timestamp: "",
      counsel_signature_or_evidence_hash: "",
      approval_status: "LEGAL_REVIEW_REQUIRED",
      notes: "",
    }));

    const summary = {
      generatedAt: new Date().toISOString(),
      sourceOfTruth: "live canonical catalog + TR-GOLD-2026-08-13-v1.0 research/legal-review pack",
      liveCategoryCount: new Set(liveRows.map((row) => row.categoryId)).size,
      liveSubserviceCount: liveRows.length,
      mappedGoldMasterCoverageCount: matrixRows.filter((row) => row.gold_master_scope_keys !== "UNMAPPED_LIVE_SUBSERVICE").length,
      unmappedLiveSubserviceCount: matrixRows.filter((row) => row.gold_master_scope_keys === "UNMAPPED_LIVE_SUBSERVICE").length,
      sourceStatus: "SOURCE_UNVERIFIED",
      legalApprovalStatus: "LEGAL_REVIEW_REQUIRED",
      productionAllowlist: [],
      releaseState: "READINESS_BLOCKED",
      packHash,
      registryHash,
    };

    const [capabilitiesRaw] = await client.query(
      "SELECT id, `key`, displayName, status FROM service_capabilities ORDER BY id",
    );
    const capabilities = capabilitiesRaw as unknown as Array<{ id: number; key: string; displayName: string; status: string }>;
    const capabilityRows = capabilities.map((capability) => ({
      capability_id: capability.id,
      capability_key: capability.key,
      capability_name: capability.displayName,
      current_catalog_status: capability.status,
      readiness_classification: "BLOCKED_LEGAL_REVIEW",
      reason: "No valid local counsel/source/connector/physical-device evidence; production allowlist is empty",
      owner_release_eligible: "FALSE",
      country_effective_state: "READINESS_BLOCKED",
    }));

    await mkdir(outputDirectory, { recursive: true });
    await Promise.all([
      writeFile(resolve(outputDirectory, "TR_SERVICE_CREDENTIAL_MATRIX.csv"), serializeCsv(matrixRows), "utf8"),
      writeFile(resolve(outputDirectory, "TR_LEGAL_SOURCE_COUNSEL_REVIEW_TEMPLATE.csv"), serializeCsv(counselRows), "utf8"),
      writeFile(resolve(outputDirectory, "TR_OFFICIAL_SOURCE_REGISTER.csv"), serializeCsv(sourceRows), "utf8"),
      writeFile(resolve(outputDirectory, "TR_PRODUCTION_ALLOWLIST_AND_NOGO.csv"), serializeCsv(capabilityRows), "utf8"),
      writeFile(resolve(outputDirectory, "TR_READINESS_MATRIX_SUMMARY.json"), JSON.stringify(summary, null, 2) + "\n", "utf8"),
    ]);
    console.log(JSON.stringify(summary));
  } finally {
    await client.end();
  }
}

void main();
