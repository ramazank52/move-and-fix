import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const evidenceDirectory = join(process.cwd(), "docs/compliance/checkpoint-a-evidence");
const snapshotPath = join(evidenceDirectory, "DE_BERLIN_LIVE_CATALOG_SNAPSHOT.json");

type Snapshot = {
  snapshotUtc: string;
  services: Array<{ id: number; name: string; slug: string; isActive: number }>;
  subservices: Array<{ id: number; categoryId: number; name: string; slug: string; isActive: number }>;
  berlinPolicies: Array<Record<string, unknown>>;
};

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function csvCell(value: unknown) {
  const source = String(value ?? "");
  return /[",\r\n]/.test(source) ? `"${source.replace(/"/g, '""')}"` : source;
}

function csv(headers: string[], rows: Array<Record<string, unknown>>) {
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\n")}\n`;
}

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const sourceRows = [
  ["DE-HWO", "Handwerksordnung", "Federal Ministry of Justice / gesetze-im-internet", "https://www.gesetze-im-internet.de/hwo/", "Handwerksordnung", "Handwerksrolle §§ 6–17; Anlagen A/B — DISCOVERY_ONLY", "UNKNOWN", "UNKNOWN", "UNKNOWN", "NO_REQUIREMENT_BINDING_CREATED", "SOURCE_UNVERIFIED"],
  ["DE-NAV-13", "Verordnung über Allgemeine Bedingungen für den Netzanschluss und dessen Nutzung für die Elektrizitätsversorgung in Niederspannung", "Federal Ministry of Justice / gesetze-im-internet", "https://www.gesetze-im-internet.de/nav/BJNR247710006.html", "Niederspannungsanschlussverordnung (NAV)", "§ 13 Elektrische Anlage — DISCOVERY_ONLY", "01.11.2006 (displayed; unverified)", "08.11.2006 (text-reference start displayed; unverified)", "UNKNOWN", "NO_REQUIREMENT_BINDING_CREATED", "SOURCE_UNVERIFIED"],
  ["DE-AVBWASSERV-12", "Verordnung über Allgemeine Bedingungen für die Versorgung mit Wasser", "Federal Ministry of Justice / gesetze-im-internet", "https://www.gesetze-im-internet.de/avbwasserv/BJNR007500980.html", "AVBWasserV", "§ 12 — NOT_SEPARATELY_CAPTURED; DISCOVERY_ONLY", "20.06.1980 (displayed; unverified)", "UNKNOWN", "UNKNOWN", "NO_REQUIREMENT_BINDING_CREATED", "SOURCE_UNVERIFIED"],
  ["DE-NDAV-13", "Verordnung über Allgemeine Bedingungen für den Netzanschluss und dessen Nutzung für die Gasversorgung in Niederdruck", "Federal Ministry of Justice / gesetze-im-internet", "https://www.gesetze-im-internet.de/ndav/__13.html", "Niederdruckanschlussverordnung (NDAV)", "§ 13 Gasanlage; § 13(2) installer-directory wording observed — DISCOVERY_ONLY", "UNKNOWN", "UNKNOWN", "Berlin operator/zone and exception UNKNOWN", "NO_REQUIREMENT_BINDING_CREATED", "SOURCE_UNVERIFIED"],
  ["DE-CHEMKLIMASCHUTZV-2026", "Verordnung zum Schutz des Klimas vor Veränderungen durch den Eintrag bestimmter fluorierter Treibhausgase und zur Durchführung der Verordnung (EU) 2024/573", "Federal Ministry of Justice / gesetze-im-internet", "https://www.gesetze-im-internet.de/chemklimaschutzv_2026/", "Chemikalien-Klimaschutzverordnung", "§§ 5–8, § 10, § 17 listed on contents page — DISCOVERY_ONLY", "UNKNOWN", "UNKNOWN", "§ 17 transition text not interpreted", "NO_REQUIREMENT_BINDING_CREATED", "SOURCE_UNVERIFIED"],
  ["DE-BALM-GUETERVERKEHR", "Fragen und Antworten zum Güterkraftverkehr", "Federal Office for Logistics and Mobility (BALM)", "https://www.balm.bund.de/DE/Service/FragenAntwortenFAQ/FragenAntwortenGueterverkehr/fragenantwortengueterverkehr.html", "BALM Güterkraftverkehr information", "§ 7a(1) GüKG referenced by retrieved FAQ — DISCOVERY_ONLY", "UNKNOWN", "UNKNOWN", "Route/weight/cargo/operator exemption UNKNOWN", "NO_REQUIREMENT_BINDING_CREATED", "SOURCE_UNVERIFIED"],
  ["DE-POSTG-2024", "Postgesetz", "Federal Ministry of Justice / gesetze-im-internet", "https://www.gesetze-im-internet.de/postg_2024/BJNR0EC0B0024.html", "Postgesetz (PostG)", "§§ 4, 5, 7 listed on contents page — DISCOVERY_ONLY", "15.07.2024; BGBl. 2024 I Nr. 236 (displayed; unverified)", "19.07.2024 (displayed; unverified)", "Scope/exception for marketplace courier UNKNOWN", "NO_REQUIREMENT_BINDING_CREATED", "SOURCE_UNVERIFIED"],
  ["DE-BNETZA-POST-DIRECTORY", "Anbieterverzeichnis", "Bundesnetzagentur", "https://www.bundesnetzagentur.de/DE/Fachthemen/Post/Anbieterverzeichnis/artikel.html", "Bundesnetzagentur provider directory", "Directory landing page only — no API/field contract captured", "UNKNOWN", "UNKNOWN", "Application/transitional details require counsel review", "NO_REQUIREMENT_BINDING_CREATED", "SOURCE_UNVERIFIED"],
  ["DE-DVGW-INSTALLER-RESEARCH", "Der DVGW", "Deutscher Verein des Gas- und Wasserfaches e.V. (DVGW)", "https://www.dvgw.de/", "DVGW public discovery page", "No legal article/annex captured", "UNKNOWN", "UNKNOWN", "Network/operator and installer-list scope UNKNOWN", "NO_REQUIREMENT_BINDING_CREATED", "SOURCE_UNVERIFIED"],
  ["DE-VDE-TAB-RESEARCH", "VDE Association for Electrical, Electronic and Information Technologies", "VDE", "https://www.vde.com/", "VDE/TAB public discovery page", "No Berlin TAB, operator list or legal article/annex captured", "UNKNOWN", "UNKNOWN", "Network/operator and installer-list scope UNKNOWN", "NO_REQUIREMENT_BINDING_CREATED", "SOURCE_UNVERIFIED"],
] as const;

const sourceHeaders = [
  "source_id", "official_local_title", "authority", "official_url", "instrument_name", "exact_article_paragraph_annex", "official_publication_date", "effective_date", "transition_or_exemption", "supported_requirement_ids", "source_status", "accessed_at_utc", "source_content_hash_or_immutable_archive", "verifier_full_name", "verification_at", "approval_reference",
];

async function main() {
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as Snapshot;
  await mkdir(evidenceDirectory, { recursive: true });
  const servicesById = new Map(snapshot.services.map((service) => [service.id, service]));
  const subservicesById = new Map(snapshot.subservices.map((subservice) => [subservice.id, subservice]));

  const matrixRows = snapshot.berlinPolicies.map((policy) => {
    const categoryId = typeof policy.categoryId === "number" ? policy.categoryId : null;
    const subcategoryId = typeof policy.subcategoryId === "number" ? policy.subcategoryId : null;
    const service = categoryId === null ? undefined : servicesById.get(categoryId);
    const subservice = subcategoryId === null ? undefined : subservicesById.get(subcategoryId);
    return {
    requirement_id: `DE-BE-BERLIN-CAP-${policy.capabilityId}`,
    country: "DE",
    exact_jurisdiction: "DE-BE-BERLIN",
    service_id: categoryId ?? "UNKNOWN",
    service_slug: service?.slug ?? "UNMAPPED_SERVICE_BLOCKED",
    service_name: service?.name ?? "UNKNOWN",
    subservice_id: subcategoryId ?? "UNKNOWN",
    subservice_slug: subservice?.slug ?? "UNKNOWN",
    subservice_name: subservice?.name ?? "UNKNOWN",
    task_type: policy.capabilityKey ?? "UNKNOWN",
    provider_operating_model: "UNKNOWN",
    required_profile_conditions: "PROFILE_INCOMPLETE; provider role, business/person/vehicle/site subject, local operating scope and legal interpretation are UNKNOWN",
    residential_commercial_construction: "UNKNOWN",
    work_type: "UNKNOWN",
    required_credential_type: "UNKNOWN",
    credential_subject: "UNKNOWN",
    issuer_authority: "UNKNOWN",
    exact_scope_category: "UNKNOWN",
    validity_expiry_revocation: "UNKNOWN",
    exemption_transition: "UNKNOWN",
    source_id: "UNBOUND_SOURCE_UNVERIFIED",
    source_status: "SOURCE_UNVERIFIED",
    connector_id: "UNBOUND_CONNECTOR_PENDING",
    connector_status: "PENDING",
    risk_level: "UNKNOWN",
    current_enforcement_state: policy.enforcementState ?? "UNKNOWN",
    decision: policy.decision ?? "BLOCKED",
    decision_reason: "UNKNOWN_LEGAL_CREDENTIAL_SCOPE; PROFILE_INCOMPLETE; SOURCE_UNVERIFIED; CONNECTOR_PENDING; DRAFT_MACHINE; RELEASE_PENDING",
    canonical_capability_id: policy.capabilityId ?? "UNKNOWN",
    canonical_capability_key: policy.capabilityKey ?? "UNKNOWN",
    canonical_capability_display_name: policy.capabilityDisplayName ?? "UNKNOWN",
    canonical_capability_status: policy.catalogCapabilityStatus ?? "UNKNOWN",
    capability_definition_id: policy.capabilityDefinitionId ?? "UNKNOWN",
    blocked_by_default: policy.blockedByDefault ?? "UNKNOWN",
    mapping_state: policy.mappingState ?? "UNKNOWN",
    policy_source_state: policy.sourceState ?? "UNKNOWN",
    policy_legal_state: policy.legalState ?? "UNKNOWN",
    policy_connector_state: policy.connectorState ?? "UNKNOWN",
    policy_release_state: policy.releaseState ?? "UNKNOWN",
    policy_translation_state: policy.translationState ?? "UNKNOWN",
    policy_data_residency_state: policy.dataResidencyState ?? "UNKNOWN",
    policy_sanctions_state: policy.sanctionsState ?? "UNKNOWN",
    catalog_link_state: service && (subservice || subcategoryId === null) ? "LIVE_CATALOG_LINK_PRESENT" : "UNMAPPED_SERVICE_BLOCKED",
  };
  });
  const matrixHeaders = Object.keys(matrixRows[0] ?? {});
  const matrixJson = {
    evidenceFormat: "movefix.de-berlin.service-credential-matrix.v1",
    sourceSnapshotUtc: snapshot.snapshotUtc,
    legalOrReleaseAuthority: false,
    rowCount: matrixRows.length,
    rows: matrixRows,
  };

  const reviewRows = matrixRows.map((row) => ({
    requirement_id: row.requirement_id,
    country: row.country,
    exact_jurisdiction: row.exact_jurisdiction,
    canonical_capability_id: row.canonical_capability_id,
    canonical_capability_key: row.canonical_capability_key,
    source_text_matches_yes_no: "",
    requirement_interpretation_approved_yes_no: "",
    exemption_transition_approved_yes_no: "",
    jurisdiction_scope_approved_yes_no: "",
    required_correction: "",
    verifier_full_name: "",
    professional_role_bar_or_qualification: "",
    verifier_jurisdiction: "",
    signed_approval_reference: "",
    verification_date: "",
    expiry_review_date: "",
    decision_after_review: "BLOCKED_UNTIL_EXTERNAL_REVIEW",
  }));
  const sourceRegisterRows = sourceRows.map((source) => ({
    source_id: source[0],
    official_local_title: source[1],
    authority: source[2],
    official_url: source[3],
    instrument_name: source[4],
    exact_article_paragraph_annex: source[5],
    official_publication_date: source[6],
    effective_date: source[7],
    transition_or_exemption: source[8],
    supported_requirement_ids: source[9],
    source_status: source[10],
    accessed_at_utc: "2026-08-22 UTC; discovery retrieval only",
    // A package-manifest hash covers this immutable retrieval-note artifact.
    // It is deliberately not represented as a legal-source content hash.
    source_content_hash_or_immutable_archive: `ARCHIVE_REF:DE_BERLIN_OFFICIAL_SOURCE_FETCH_NOTES.md#${source[0]}; package manifest hash required`,
    verifier_full_name: "",
    verification_at: "",
    approval_reference: "",
  }));

  const writes: Array<[string, string]> = [
    ["DE_BERLIN_SERVICE_CREDENTIAL_MATRIX.csv", csv(matrixHeaders, matrixRows)],
    ["DE_BERLIN_SERVICE_CREDENTIAL_MATRIX.json", json(matrixJson)],
    ["DE_BERLIN_OFFICIAL_SOURCE_REGISTER.csv", csv(sourceHeaders, sourceRegisterRows)],
    ["DE_BERLIN_LEGAL_REVIEW_TEMPLATE.csv", csv(Object.keys(reviewRows[0] ?? {}), reviewRows)],
  ];
  for (const [name, contents] of writes) await writeFile(join(evidenceDirectory, name), contents, "utf8");

  const artifactHashes = Object.fromEntries(writes.map(([name, contents]) => [name, sha256(contents)]));
  await writeFile(join(evidenceDirectory, "DE_BERLIN_REVIEW_ARTIFACT_HASHES.json"), json({ artifactHashes }), "utf8");
  console.log(json({ matrixRowCount: matrixRows.length, sourceRowCount: sourceRegisterRows.length, hashes: artifactHashes }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
