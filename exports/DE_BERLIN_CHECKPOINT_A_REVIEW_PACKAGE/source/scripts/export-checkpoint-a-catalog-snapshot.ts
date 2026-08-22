import "./load-env.js";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { sql } from "drizzle-orm";

import { getDb } from "../server/db";

type UnknownRow = Record<string, unknown>;

const outputDirectory = join(process.cwd(), "docs/compliance/checkpoint-a-evidence");
const seedServiceKeys = [
  "cleaning",
  "plumbing",
  "electrical",
  "painting",
  "air_conditioning",
  "heating",
  "moving",
  "locksmith",
  "towing",
  "roadside_assistance",
  "courier",
  "furniture",
  "automotive",
] as const;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toRows(raw: unknown): UnknownRow[] {
  if (Array.isArray(raw) && Array.isArray(raw[0])) return raw[0] as UnknownRow[];
  if (Array.isArray(raw)) return raw as UnknownRow[];
  if (raw && typeof raw === "object" && "rows" in raw && Array.isArray((raw as { rows: unknown }).rows)) {
    return (raw as { rows: UnknownRow[] }).rows;
  }
  throw new Error("Unexpected query response shape while exporting catalog evidence");
}

async function queryRows(query: ReturnType<typeof sql>): Promise<UnknownRow[]> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE_FOR_READ_ONLY_CATALOG_SNAPSHOT");
  return toRows(await db.execute(query));
}

function orderedDigest(rows: UnknownRow[], fields: string[]): string {
  return sha256(
    rows
      .map((row) => fields.map((field) => String(row[field] ?? "")).join("|"))
      .join("\n"),
  );
}

async function main(): Promise<void> {
  const [services, subservices, aliases, capabilities, berlinPolicies, integrityRows] = await Promise.all([
    queryRows(sql`SELECT id, name, slug, pricingType, isActive, sortOrder FROM service_categories ORDER BY id`),
    queryRows(sql`SELECT id, categoryId, name, slug, description, isActive, sortOrder FROM service_subcategories ORDER BY id`),
    queryRows(sql`SELECT id, namespace, alias, categoryId, subcategoryId, isActive FROM service_catalog_aliases ORDER BY id`),
    queryRows(sql`SELECT id, \`key\`, displayName, categoryId, subcategoryId, status FROM service_capabilities ORDER BY id`),
    queryRows(sql`
      SELECT p.id AS capabilityId, p.\`key\` AS capabilityKey, p.displayName AS capabilityDisplayName,
             p.categoryId, p.subcategoryId, p.status AS catalogCapabilityStatus,
             d.id AS capabilityDefinitionId, d.canonicalServiceKey, d.blockedByDefault, d.mappingState,
             decision.id AS berlinDecisionId, decision.decision, decision.sourceState, decision.legalState,
             decision.connectorState, decision.releaseState, decision.enforcementState,
             decision.translationState, decision.dataResidencyState, decision.sanctionsState
      FROM service_capabilities p
      LEFT JOIN service_capability_definitions d ON d.canonicalCapabilityId = p.id
      LEFT JOIN country_deployments deployment ON deployment.countryCode = 'DE'
      LEFT JOIN jurisdiction_nodes berlin ON berlin.countryDeploymentId = deployment.id AND berlin.nodeCode = 'DE-BE-BERLIN'
      LEFT JOIN capability_policy_decisions decision ON decision.countryDeploymentId = deployment.id
        AND decision.jurisdictionNodeId = berlin.id AND decision.capabilityDefinitionId = d.id
      ORDER BY p.id
    `),
    queryRows(sql`
      SELECT
        (SELECT COUNT(*) FROM service_capabilities p WHERE NOT EXISTS (SELECT 1 FROM service_capability_definitions d WHERE d.canonicalCapabilityId = p.id)) AS unmappedCapabilityCount,
        (SELECT COUNT(*) FROM service_capabilities p INNER JOIN service_capability_definitions d ON d.canonicalCapabilityId = p.id) AS mappedCapabilityCount,
        (SELECT COUNT(*) FROM capability_policy_decisions decision INNER JOIN country_deployments deployment ON deployment.id = decision.countryDeploymentId INNER JOIN jurisdiction_nodes berlin ON berlin.id = decision.jurisdictionNodeId WHERE deployment.countryCode = 'DE' AND berlin.nodeCode = 'DE-BE-BERLIN' AND decision.decision = 'BLOCKED') AS berlinBlockedCount,
        (SELECT COUNT(*) FROM (SELECT p.\`key\` FROM service_capabilities p GROUP BY p.\`key\` HAVING COUNT(*) > 1) duplicate_keys) AS duplicateCapabilityKeyCount,
        (SELECT COUNT(*) FROM service_capabilities p LEFT JOIN service_categories c ON c.id = p.categoryId LEFT JOIN service_subcategories s ON s.id = p.subcategoryId WHERE (p.categoryId IS NOT NULL AND c.id IS NULL) OR (p.subcategoryId IS NOT NULL AND (s.id IS NULL OR s.categoryId <> p.categoryId))) AS orphanCapabilityCount,
        (SELECT COUNT(*) FROM service_catalog_aliases a LEFT JOIN service_categories c ON c.id = a.categoryId LEFT JOIN service_subcategories s ON s.id = a.subcategoryId WHERE c.id IS NULL OR (a.subcategoryId <> 0 AND (s.id IS NULL OR s.categoryId <> a.categoryId))) AS orphanAliasCount,
        (SELECT COUNT(*) FROM (SELECT namespace, alias FROM service_catalog_aliases WHERE isActive = 1 GROUP BY namespace, alias HAVING COUNT(DISTINCT CONCAT(categoryId, ':', subcategoryId)) > 1) alias_collisions) AS activeAliasCollisionCount
    `),
  ]);

  const serviceTokens = services.map((service) => ({
    level: "service",
    id: service.id,
    slug: String(service.slug),
    name: String(service.name),
  }));
  const subserviceTokens = subservices.map((subservice) => ({
    level: "subservice",
    id: subservice.id,
    slug: String(subservice.slug),
    name: String(subservice.name),
  }));

  const seedCoverage = seedServiceKeys.map((seedKey) => {
    const normalizedSeed = normalize(seedKey);
    const candidates = [...serviceTokens, ...subserviceTokens].filter((candidate) =>
      [normalize(candidate.slug), normalize(candidate.name)].includes(normalizedSeed),
    );
    return {
      seedServiceKey: seedKey,
      exactNormalizedMatchCount: candidates.length,
      status: candidates.length === 1 ? "MAPPED" : "UNMAPPED_SERVICE_BLOCKED",
      candidates,
    };
  });

  const snapshot = {
    evidenceFormat: "movefix.checkpoint-a.live-catalog-snapshot.v1",
    snapshotUtc: new Date().toISOString(),
    source: "managed TiDB read-only query via scripts/export-checkpoint-a-catalog-snapshot.ts",
    legalOrReleaseAuthority: false,
    services,
    subservices,
    aliases,
    capabilities,
    berlinPolicies,
    seedCoverage,
    integrity: integrityRows[0],
    deterministicDigests: {
      services: orderedDigest(services, ["id", "slug", "name", "pricingType", "isActive", "sortOrder"]),
      subservices: orderedDigest(subservices, ["id", "categoryId", "slug", "name", "isActive", "sortOrder"]),
      aliases: orderedDigest(aliases, ["id", "namespace", "alias", "categoryId", "subcategoryId", "isActive"]),
      capabilities: orderedDigest(capabilities, ["id", "key", "displayName", "categoryId", "subcategoryId", "status"]),
      berlinPolicies: orderedDigest(berlinPolicies, ["capabilityId", "capabilityDefinitionId", "berlinDecisionId", "decision", "sourceState", "legalState", "connectorState", "releaseState"]),
    },
  };

  const snapshotText = canonicalJson(snapshot);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "DE_BERLIN_LIVE_CATALOG_SNAPSHOT.json"), snapshotText, "utf8");
  await writeFile(
    join(outputDirectory, "DE_BERLIN_LIVE_CATALOG_SNAPSHOT.sha256"),
    `${sha256(snapshotText)}  DE_BERLIN_LIVE_CATALOG_SNAPSHOT.json\n`,
    "utf8",
  );

  console.log(JSON.stringify({
    output: "docs/compliance/checkpoint-a-evidence/DE_BERLIN_LIVE_CATALOG_SNAPSHOT.json",
    snapshotSha256: sha256(snapshotText),
    serviceCount: services.length,
    subserviceCount: subservices.length,
    aliasCount: aliases.length,
    capabilityCount: capabilities.length,
    berlinPolicyCount: berlinPolicies.length,
    seedMappedCount: seedCoverage.filter((item) => item.status === "MAPPED").length,
    seedUnmappedBlockedCount: seedCoverage.filter((item) => item.status !== "MAPPED").length,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
