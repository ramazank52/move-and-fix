import "./load-env.js";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const outputDir = path.resolve("exports/us-ca-la-checkpoint-a-audit");
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value ?? []);

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for read-only audit export");
  await mkdir(outputDir, { recursive: true });
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [[deployment]] = await connection.query(`SELECT id FROM country_deployments WHERE countryCode = 'US' LIMIT 1`);
    if (!deployment) throw new Error("US country deployment not found");
    const deploymentId = deployment.id;

    const [coverageRows] = await connection.query(`
      SELECT coverage.id, coverage.researchRowId, coverage.researchRulePackVersion, coverage.researchRowHash,
             category.id AS canonicalCategoryId, category.slug AS canonicalCategorySlug,
             subcategory.id AS canonicalSubcategoryId, subcategory.slug AS canonicalSubcategorySlug,
             coverage.mappingState, coverage.riskLevel, coverage.mandatoryEvidenceJson, coverage.intakeQuestionsJson,
             coverage.sourceIdsJson, coverage.conditionalTriggerSummary, coverage.missingEvidenceDecision,
             coverage.sourceState, coverage.legalState, coverage.connectorState, coverage.productionState,
             decision.decision AS policyDecision, decision.assuranceLevel, decision.legalApprovalState,
             decision.productReleaseState, decision.reasonCodesJson
      FROM country_service_coverage coverage
      INNER JOIN service_categories category ON category.id = coverage.canonicalCategoryId
      INNER JOIN service_subcategories subcategory ON subcategory.id = coverage.canonicalSubcategoryId
      INNER JOIN country_coverage_policy_decisions decision ON decision.coverageId = coverage.id
      WHERE coverage.countryDeploymentId = ?
      ORDER BY category.id, subcategory.id
    `, [deploymentId]);
    const [bundleRows] = await connection.query(`
      SELECT id, bundleKey, title, riskLevel, sourceState, legalState, decisionIfMissing,
             triggerDescription, verificationDescription, requiredEvidenceJson, subjectTypesJson, note, researchHash
      FROM country_requirement_bundles WHERE countryDeploymentId = ? ORDER BY bundleKey
    `, [deploymentId]);
    const [bindingRows] = await connection.query(`
      SELECT coverageId, bundleId, bindingKind, conditionSummary
      FROM country_coverage_bundle_bindings
      WHERE coverageId IN (SELECT id FROM country_service_coverage WHERE countryDeploymentId = ?)
      ORDER BY coverageId, bundleId, bindingKind
    `, [deploymentId]);
    const [subjectRows] = await connection.query(`
      SELECT subject.bundleId, subject.subjectType, subject.required
      FROM country_requirement_subject_bindings subject
      INNER JOIN country_requirement_bundles bundle ON bundle.id = subject.bundleId
      WHERE bundle.countryDeploymentId = ? ORDER BY subject.bundleId, subject.subjectType
    `, [deploymentId]);
    const [sourceRows] = await connection.query(`
      SELECT source.id, source.sourceKey, source.authorityName, source.sourceUrl, source.sourceVersion,
             source.sourceHash, source.sourceStatus, source.retrievalMethod,
             archive.retrievalHash, archive.archiveReference, archive.sectionReference,
             archive.effectiveDateText, archive.exceptionText, archive.researchState, archive.retrievedAt
      FROM official_sources source
      LEFT JOIN country_source_archives archive ON archive.officialSourceId = source.id
      WHERE source.countryDeploymentId = ? ORDER BY source.sourceKey
    `, [deploymentId]);
    const [sourceBindings] = await connection.query(`
      SELECT binding.bundleId, binding.officialSourceId, binding.sourceArchiveId, binding.requirementReference
      FROM country_requirement_source_bindings binding
      INNER JOIN country_requirement_bundles bundle ON bundle.id = binding.bundleId
      WHERE bundle.countryDeploymentId = ? ORDER BY binding.bundleId, binding.officialSourceId
    `, [deploymentId]);
    const [connectorRows] = await connection.query(`
      SELECT connector.connectorKey, connector.displayName, connector.status, connector.assuranceLevel,
             connector.forbiddenScraping, connector.authorizationEvidenceHash, source.sourceKey AS officialSourceKey,
             source.authorityName, source.sourceUrl
      FROM verification_connectors connector
      LEFT JOIN official_sources source ON source.id = connector.officialSourceId
      WHERE connector.countryDeploymentId = ? ORDER BY connector.connectorKey
    `, [deploymentId]);
    const [localeRows] = await connection.query(`
      SELECT document.documentKey, document.documentVersion, document.documentSurface, document.legalApprovalState,
             locale.locale, locale.localizationState, locale.contentHash, locale.contentStorageKey, locale.runtimeSelectable
      FROM legal_documents document
      INNER JOIN localized_legal_versions locale ON locale.legalDocumentId = document.id
      WHERE document.countryDeploymentId = ? ORDER BY document.documentKey, locale.locale
    `, [deploymentId]);
    const [constraintRows] = await connection.query(`
      SELECT table_name AS tableName, constraint_name AS constraintName, constraint_type AS constraintType
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name IN ('country_service_coverage','country_rule_pack_versions','country_requirement_bundles','country_coverage_bundle_bindings','country_requirement_subject_bindings','country_source_archives','country_requirement_source_bindings','country_coverage_policy_decisions','country_coverage_policy_events','country_active_provider_transitions')
      ORDER BY table_name, constraint_type, constraint_name
    `);
    const [[providerImpact]] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM country_active_provider_transitions transition_row
         INNER JOIN country_service_coverage coverage ON coverage.id = transition_row.coverageId
         WHERE coverage.countryDeploymentId = ?) AS usActiveProviderTransitionRows,
        (SELECT COUNT(*) FROM country_service_coverage coverage
         WHERE coverage.countryDeploymentId = ? AND coverage.productionState IN ('POLICY_ELIGIBLE', 'ACTIVE')) AS usEligibleOrActiveCoverageRows,
        (SELECT COUNT(*) FROM provider_capability_profiles profile WHERE profile.jurisdictionCode = 'US') AS usProviderCapabilityProfiles,
        (SELECT COUNT(*) FROM providers WHERE isAvailable = 1) AS totalAvailableProviders
    `, [deploymentId, deploymentId]);

    const bundlesById = new Map(bundleRows.map((bundle) => [bundle.id, { ...bundle, subjectBindings: [], sourceBindings: [], coverageBindings: [] }]));
    for (const subject of subjectRows) bundlesById.get(subject.bundleId)?.subjectBindings.push({ subjectType: subject.subjectType, required: Boolean(subject.required) });
    for (const sourceBinding of sourceBindings) bundlesById.get(sourceBinding.bundleId)?.sourceBindings.push(sourceBinding);
    const coverageBindings = new Map();
    for (const binding of bindingRows) {
      const enriched = { ...binding, bundle: bundlesById.get(binding.bundleId) ?? null };
      const list = coverageBindings.get(binding.coverageId) ?? [];
      list.push(enriched);
      coverageBindings.set(binding.coverageId, list);
      bundlesById.get(binding.bundleId)?.coverageBindings.push(binding);
    }
    const coverage = coverageRows.map((row) => ({
      ...row,
      exactTaskProfile: `${row.canonicalCategorySlug}/${row.canonicalSubcategorySlug}`,
      mandatoryRequirementBundles: (coverageBindings.get(row.id) ?? []).filter((binding) => binding.bindingKind === "MANDATORY"),
      conditionalRequirementBundles: (coverageBindings.get(row.id) ?? []).filter((binding) => binding.bindingKind === "CONDITIONAL"),
      existingNoGoReason: row.reasonCodesJson,
    }));
    const sourceToBundleIds = new Map();
    for (const binding of sourceBindings) {
      const bundleIds = sourceToBundleIds.get(binding.officialSourceId) ?? new Set();
      bundleIds.add(binding.bundleId);
      sourceToBundleIds.set(binding.officialSourceId, bundleIds);
    }
    const sourceRegister = sourceRows.map((source) => {
      const bundleIds = [...(sourceToBundleIds.get(source.id) ?? new Set())];
      const coverageIds = [...new Set(bundleIds.flatMap((bundleId) => (bundlesById.get(bundleId)?.coverageBindings ?? []).map((binding) => binding.coverageId)))];
      const coverageRowIds = coverageIds.map((coverageId) => coverageRows.find((row) => row.id === coverageId)?.researchRowId).filter(Boolean);
      return {
        ...source,
        lawOrRegulationTitleAsCaptured: source.sourceKey,
        boundRequirementBundles: bundleIds.map((bundleId) => bundlesById.get(bundleId)?.bundleKey),
        boundCoverageRows: coverageRowIds,
        sourceUnverifiedReason: "No external California/Los Angeles counsel signed row-level approval or immutable SOURCE_VERIFICATION ledger event exists.",
        localCounselQuestion: "Confirm exact legal title, section/classification/exception, effective date, jurisdiction applicability and whether this source is authoritative for each bound requirement before approval.",
      };
    });
    const connectorInventory = connectorRows.map((connector) => ({
      ...connector,
      targetRegistryOrApi: connector.officialSourceKey ?? "UNKNOWN_NOT_CONFIGURED",
      accessPermissionRequirement: connector.authorizationEvidenceHash ? "AUTHORIZATION_EVIDENCE_PRESENT_REVIEW_REQUIRED" : "NO_AUTHORIZATION_EVIDENCE",
      returnedFields: "NOT_CONFIGURED",
      expirySuspensionRevocationCheck: "NOT_CONFIGURED",
      noGoReason: "Connector is not authorized/operational; public webpage and OCR/AI output are not authority verification.",
    }));
    const bundleManifest = [...bundlesById.values()].map((bundle) => ({
      ...bundle,
      boundCoverageRows: [...new Set(bundle.coverageBindings.map((binding) => coverageRows.find((row) => row.id === binding.coverageId)?.researchRowId).filter(Boolean))],
      orphan: bundle.coverageBindings.length === 0,
      ambiguousAlias: false,
    }));
    const audit = {
      schema: "movefix.us-ca-la.checkpoint-a.readonly-audit.v1",
      generatedAt: new Date().toISOString(),
      scope: "read-only; US-CA-LOS_ANGELES; no personal data",
      counts: {
        coverageRows: coverage.length,
        requirementBundles: bundleManifest.length,
        sourceRows: sourceRegister.length,
        connectorRows: connectorInventory.length,
        localeRows: localeRows.length,
        unboundBundles: bundleManifest.filter((bundle) => bundle.orphan).length,
        ambiguousAliases: bundleManifest.filter((bundle) => bundle.ambiguousAlias).length,
      },
      providerImpact,
      constraints: constraintRows,
      coverage,
      requirementBundles: bundleManifest,
      sourceRegister,
      connectorInventory,
      locales: localeRows,
    };
    const matrixHeaders = ["research_row_id","canonical_family_id","canonical_family_slug","canonical_subservice_id","canonical_subservice_slug","exact_task_profile","risk_level","conditional_trigger_summary","mandatory_bundles","conditional_bundles","subject_bindings","missing_evidence_decision","policy_decision","reason_codes","source_state","legal_state","connector_state","assurance_level","product_release_state","production_state"];
    const matrixCsv = [matrixHeaders.join(","), ...coverage.map((row) => [
      row.researchRowId, row.canonicalCategoryId, row.canonicalCategorySlug, row.canonicalSubcategoryId, row.canonicalSubcategorySlug,
      row.exactTaskProfile, row.riskLevel, row.conditionalTriggerSummary,
      json(row.mandatoryRequirementBundles.map((binding) => ({ key: binding.bundle?.bundleKey, trigger: binding.bundle?.triggerDescription }))),
      json(row.conditionalRequirementBundles.map((binding) => ({ key: binding.bundle?.bundleKey, trigger: binding.bundle?.triggerDescription, condition: binding.conditionSummary }))),
      json((coverageBindings.get(row.id) ?? []).flatMap((binding) => binding.bundle?.subjectBindings ?? [])),
      row.missingEvidenceDecision, row.policyDecision, row.reasonCodesJson, row.sourceState, row.legalState, row.connectorState,
      row.assuranceLevel, row.productReleaseState, row.productionState,
    ].map(csvEscape).join(","))].join("\n") + "\n";
    const sourceHeaders = ["source_key","authority_issuer","law_or_regulation_title_as_captured","section_article_class_exception","effective_date_text","research_retrieved_at","official_url","archive_reference","archive_file_sha256","source_status","bound_requirement_bundles","bound_coverage_rows","source_unverified_reason","local_counsel_question"];
    const sourceCsv = [sourceHeaders.join(","), ...sourceRegister.map((source) => [
      source.sourceKey, source.authorityName, source.lawOrRegulationTitleAsCaptured,
      [source.sectionReference, source.exceptionText].filter(Boolean).join(" | "), source.effectiveDateText, source.retrievedAt,
      source.sourceUrl, source.archiveReference, source.retrievalHash, source.sourceStatus,
      json(source.boundRequirementBundles), json(source.boundCoverageRows), source.sourceUnverifiedReason, source.localCounselQuestion,
    ].map(csvEscape).join(","))].join("\n") + "\n";
    const fileContents = {
      "US_CA_LA_AUDIT.json": JSON.stringify(audit, null, 2) + "\n",
      "US_CA_LA_SERVICE_CREDENTIAL_MATRIX.csv": matrixCsv,
      "US_CA_LA_SOURCE_REGISTER.csv": sourceCsv,
      "US_CA_LA_REQUIREMENT_BUNDLE_MANIFEST.json": JSON.stringify(bundleManifest, null, 2) + "\n",
      "US_CA_LA_CONNECTOR_INVENTORY.json": JSON.stringify(connectorInventory, null, 2) + "\n",
      "US_CA_LA_LOCALE_REGISTER.json": JSON.stringify(localeRows, null, 2) + "\n",
      "US_CA_LA_PROVIDER_IMPACT.json": JSON.stringify(providerImpact, null, 2) + "\n",
      "US_CA_LA_CONSTRAINTS.json": JSON.stringify(constraintRows, null, 2) + "\n",
    };
    for (const [file, content] of Object.entries(fileContents)) await writeFile(path.join(outputDir, file), content);
    const manifest = Object.entries(fileContents).map(([file, content]) => ({ file, sha256: sha256(content), bytes: Buffer.byteLength(content) }));
    await writeFile(path.join(outputDir, "US_CA_LA_AUDIT_ARTIFACT_MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");
    console.log(JSON.stringify({ outputDir, counts: audit.counts, providerImpact, manifest }, null, 2));
  } finally {
    await connection.end();
  }
}

void main();
