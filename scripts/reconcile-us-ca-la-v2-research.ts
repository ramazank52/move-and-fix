import "./load-env.js";

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2";
import mysql from "mysql2/promise";

type ResearchBundle = {
  id: string;
  country: string;
  title: string;
  risk: string;
  trigger: string;
  required_evidence: string[];
  subject_types: string[];
  source_ids: string[];
  source_status: string;
  legal_status: string;
  decision_if_missing: string;
  verification: string;
  note?: string;
};

type ResearchSource = {
  id: string;
  country: string;
  authority: string;
  title: string;
  url: string;
  use: string;
  source_status: string;
  local_counsel_status: string;
  retrieved_at?: string;
};

type ResearchCoverage = {
  row_id: string;
  country_code: string;
  family_id: number;
  subservice: string;
  service_family: string;
  service_family_tr: string;
  subservice_tr: string;
  mandatory_bundle_ids: string[];
  conditional_bundle_ids: string[];
  conditional_trigger_summary: string;
  intake_questions: string[];
  source_ids: string[];
  source_urls: string[];
  source_status: string;
  local_counsel_status: string;
  connector_status: string;
  production_state: string;
  risk: string;
  missing_evidence_decision: string;
  official_verification_route: string;
  authoritative: boolean;
};

type ResearchSeed = {
  schema: string;
  version: string;
  research_cutoff: string;
  authority_notice: string;
  catalog: Array<{ id: string; slug: string; subs: Array<{ id: string; slug: string }> }>;
  bundles: ResearchBundle[];
  sources: ResearchSource[];
  coverage: ResearchCoverage[];
};

type LiveCategory = RowDataPacket & { id: number; slug: string; name: string; isActive: number };
type LiveSubcategory = RowDataPacket & { id: number; categoryId: number; slug: string; name: string; isActive: number };

const sourcePath = process.env.MF5_V2_RESEARCH_SEED_PATH
  ?? "/home/ubuntu/mf5v2_audit/MoveFix_5_Ulke_RulePack_Research_Seed_v2.json";
const outputPath = path.resolve("docs/compliance/us-ca-la-v2-research-reconciliation.json");

function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for read-only catalog reconciliation");
  const sourceBuffer = await readFile(sourcePath);
  const research = JSON.parse(sourceBuffer.toString("utf8")) as ResearchSeed;
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [categories] = await connection.query<LiveCategory[]>(
      "SELECT id, slug, name, isActive FROM service_categories WHERE isActive = 1 ORDER BY id",
    );
    const [subcategories] = await connection.query<LiveSubcategory[]>(
      "SELECT id, categoryId, slug, name, isActive FROM service_subcategories WHERE isActive = 1 ORDER BY categoryId, id",
    );

    const coverage = research.coverage.filter((row) => row.country_code === "US");
    const reconciled = coverage.map((row) => {
      const category = categories.find((candidate) => candidate.slug === row.service_family) ?? null;
      const subcategory = category
        ? subcategories.find((candidate) => candidate.categoryId === category.id && candidate.slug === row.subservice) ?? null
        : null;
      return {
        ...row,
        canonicalCategoryId: category?.id ?? null,
        canonicalCategorySlug: category?.slug ?? null,
        canonicalSubcategoryId: subcategory?.id ?? null,
        canonicalSubcategorySlug: subcategory?.slug ?? null,
        mappingState: category && subcategory ? "MAPPED_BLOCKED" : "UNMAPPED_SERVICE_BLOCKED",
      };
    });

    const referencedBundleIds = new Set(reconciled.flatMap((row) => [...row.mandatory_bundle_ids, ...row.conditional_bundle_ids]));
    const bundles = research.bundles.filter((bundle) => referencedBundleIds.has(bundle.id));
    const referencedSourceIds = new Set([
      ...reconciled.flatMap((row) => row.source_ids),
      ...bundles.flatMap((bundle) => bundle.source_ids),
    ]);
    const sources = research.sources.filter((source) => referencedSourceIds.has(source.id));
    const duplicateCoverageRows = reconciled.length - new Set(reconciled.map((row) => row.row_id)).size;

    const artifact = {
      schema: "movefix.us-ca-la.v2-research-reconciliation",
      generatedAt: new Date().toISOString(),
      researchPackage: {
        sourcePath: path.basename(sourcePath),
        seedSchema: research.schema,
        seedVersion: research.version,
        researchCutoff: research.research_cutoff,
        sourceSha256: sha256(sourceBuffer),
        authorityNotice: research.authority_notice,
      },
      liveCatalog: {
        activeCategoryCount: categories.length,
        activeSubcategoryCount: subcategories.length,
      },
      summary: {
        usCoverageRows: reconciled.length,
        mappedRows: reconciled.filter((row) => row.mappingState === "MAPPED_BLOCKED").length,
        unmappedRows: reconciled.filter((row) => row.mappingState === "UNMAPPED_SERVICE_BLOCKED").length,
        duplicateCoverageRows,
        referencedBundles: bundles.length,
        referencedSources: sources.length,
        sourceStatusCounts: Object.fromEntries(Object.entries(groupBy(sources, (source) => source.source_status)).map(([key, value]) => [key, value.length])),
      },
      coverage: reconciled,
      bundles,
      sources,
    };
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(artifact.summary));
  } finally {
    await connection.end();
  }
}

function groupBy<T>(items: T[], keyOf: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((result, item) => {
    const key = keyOf(item);
    (result[key] ??= []).push(item);
    return result;
  }, {});
}

void main();
