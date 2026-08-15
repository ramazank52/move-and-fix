import { and, desc, eq, isNull } from "drizzle-orm";

import {
  jurisdictions,
  jurisdictionCompliancePackages,
  jurisdictionLaunchGates,
  officialComplianceSources,
} from "../../drizzle/schema";
import { getDb } from "../db";
import {
  createEmptyCountryLaunchChecklist,
  evaluateCountryLaunch,
  parseCountryLaunchChecklist,
  type CountryLaunchChecklist,
} from "./CountryLaunchGateService";

export type CompliancePackageStatus = "draft" | "legal_review" | "approved" | "enabled" | "blocked" | "retired";
export type OfficialSourceStatus = "draft" | "verified" | "superseded" | "revoked";

export async function listCountryComplianceOverviews() {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_COMPLIANCE_DATABASE_UNAVAILABLE");
  const [jurisdictionRows, packageRows, sourceRows, gateRows] = await Promise.all([
    db.select().from(jurisdictions).orderBy(jurisdictions.countryCode, jurisdictions.regionCode),
    db.select().from(jurisdictionCompliancePackages).orderBy(desc(jurisdictionCompliancePackages.updatedAt)),
    db.select().from(officialComplianceSources).orderBy(desc(officialComplianceSources.updatedAt)),
    db.select().from(jurisdictionLaunchGates).orderBy(desc(jurisdictionLaunchGates.updatedAt)),
  ]);

  return jurisdictionRows.map((jurisdiction) => {
    const currentPackage = packageRows.find((item) => item.jurisdictionId === jurisdiction.id && (item.status === "approved" || item.status === "enabled"))
      ?? packageRows.find((item) => item.jurisdictionId === jurisdiction.id)
      ?? null;
    const sourceCount = sourceRows.filter((item) => item.jurisdictionId === jurisdiction.id).length;
    const verifiedSourceCount = sourceRows.filter((item) => item.jurisdictionId === jurisdiction.id && item.status === "verified").length;
    const gate = gateRows.find((item) => item.jurisdictionId === jurisdiction.id) ?? null;
    const checklist = parseCountryLaunchChecklist(gate?.checklistJson);
    const evaluation = evaluateCountryLaunch({
      checklist,
      compliancePackageStatus: currentPackage?.status ?? null,
      hasVerifiedOfficialSource: verifiedSourceCount > 0,
    });
    return { jurisdiction, currentPackage, sourceCount, verifiedSourceCount, gate, checklist, evaluation };
  });
}

export async function createCountryJurisdiction(input: {
  countryCode: string;
  regionCode?: string | null;
  displayName: string;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_COMPLIANCE_DATABASE_UNAVAILABLE");
  const countryCode = input.countryCode.trim().toUpperCase();
  const regionCode = input.regionCode?.trim().toUpperCase() || null;
  await db
    .insert(jurisdictions)
    .values({ countryCode, regionCode, displayName: input.displayName.trim(), status: "draft" })
    .onDuplicateKeyUpdate({ set: { displayName: input.displayName.trim(), updatedAt: new Date() } });
  const predicate = regionCode === null
    ? and(eq(jurisdictions.countryCode, countryCode), isNull(jurisdictions.regionCode))
    : and(eq(jurisdictions.countryCode, countryCode), eq(jurisdictions.regionCode, regionCode));
  const rows = await db.select().from(jurisdictions).where(predicate).limit(1);
  if (!rows[0]) throw new Error("COUNTRY_JURISDICTION_CREATE_FAILED");
  return rows[0];
}

export async function createCountryCompliancePackage(input: {
  jurisdictionId: number;
  version: string;
  summary?: string;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_COMPLIANCE_DATABASE_UNAVAILABLE");
  const created = await db.insert(jurisdictionCompliancePackages).values({
    jurisdictionId: input.jurisdictionId,
    version: input.version.trim(),
    summary: input.summary?.trim() || null,
    createdByUserId: input.createdByUserId,
    status: "draft",
  });
  const rows = await db.select().from(jurisdictionCompliancePackages).where(eq(jurisdictionCompliancePackages.id, Number(created[0].insertId))).limit(1);
  if (!rows[0]) throw new Error("COUNTRY_COMPLIANCE_PACKAGE_CREATE_FAILED");
  return rows[0];
}

export async function transitionCountryCompliancePackage(input: {
  packageId: number;
  status: CompliancePackageStatus;
  reviewerUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_COMPLIANCE_DATABASE_UNAVAILABLE");
  const legalApproval = input.status === "approved" || input.status === "enabled";
  const updated = await db.update(jurisdictionCompliancePackages).set({
    status: input.status,
    ...(legalApproval ? { legalApprovedByUserId: input.reviewerUserId, legalApprovedAt: new Date() } : {}),
  }).where(eq(jurisdictionCompliancePackages.id, input.packageId));
  if ((updated[0]?.affectedRows ?? 0) !== 1) throw new Error("COUNTRY_COMPLIANCE_PACKAGE_NOT_FOUND");
}

export async function registerOfficialComplianceSource(input: {
  jurisdictionId: number;
  authorityName: string;
  sourceUrl: string;
  sourceVersion: string;
  status: OfficialSourceStatus;
  reviewedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_COMPLIANCE_DATABASE_UNAVAILABLE");
  const verified = input.status === "verified";
  const created = await db.insert(officialComplianceSources).values({
    jurisdictionId: input.jurisdictionId,
    authorityName: input.authorityName.trim(),
    sourceUrl: input.sourceUrl.trim(),
    sourceVersion: input.sourceVersion.trim(),
    status: input.status,
    ...(verified ? { reviewedByUserId: input.reviewedByUserId, reviewedAt: new Date() } : {}),
  });
  const rows = await db.select().from(officialComplianceSources).where(eq(officialComplianceSources.id, Number(created[0].insertId))).limit(1);
  if (!rows[0]) throw new Error("OFFICIAL_COMPLIANCE_SOURCE_CREATE_FAILED");
  return rows[0];
}

export async function saveCountryLaunchChecklist(input: {
  jurisdictionId: number;
  packageId?: number;
  checklist: CountryLaunchChecklist;
  evaluatedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_COMPLIANCE_DATABASE_UNAVAILABLE");
  const packages = await db.select().from(jurisdictionCompliancePackages).where(eq(jurisdictionCompliancePackages.jurisdictionId, input.jurisdictionId)).orderBy(desc(jurisdictionCompliancePackages.updatedAt));
  const compliancePackage = input.packageId ? packages.find((item) => item.id === input.packageId) ?? null : packages[0] ?? null;
  const sources = await db.select().from(officialComplianceSources).where(eq(officialComplianceSources.jurisdictionId, input.jurisdictionId));
  const evaluation = evaluateCountryLaunch({
    checklist: input.checklist,
    compliancePackageStatus: compliancePackage?.status ?? null,
    hasVerifiedOfficialSource: sources.some((item) => item.status === "verified"),
  });
  const values = {
    jurisdictionId: input.jurisdictionId,
    packageId: compliancePackage?.id ?? null,
    status: evaluation.status,
    checklistJson: JSON.stringify(input.checklist),
    blockingReason: evaluation.ready ? null : `Eksik veya doğrulanmamış kapı kalemleri: ${evaluation.missing.join(", ")}`,
    evaluatedByUserId: input.evaluatedByUserId,
    evaluatedAt: new Date(),
  } as const;
  await db.insert(jurisdictionLaunchGates).values(values).onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  return { ...evaluation, checklist: input.checklist };
}

export async function enableCountryProfessionalMarketplace(input: { jurisdictionId: number; enabledByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_COMPLIANCE_DATABASE_UNAVAILABLE");
  const gateRows = await db.select().from(jurisdictionLaunchGates).where(eq(jurisdictionLaunchGates.jurisdictionId, input.jurisdictionId)).limit(1);
  const gate = gateRows[0];
  if (!gate || gate.status !== "ready") throw new Error("COUNTRY_PROFESSIONAL_MARKETPLACE_BLOCKED");
  const updated = await db.update(jurisdictionLaunchGates).set({ status: "enabled", evaluatedByUserId: input.enabledByUserId, evaluatedAt: new Date() }).where(eq(jurisdictionLaunchGates.id, gate.id));
  if ((updated[0]?.affectedRows ?? 0) !== 1) throw new Error("COUNTRY_LAUNCH_GATE_NOT_FOUND");
  return { jurisdictionId: input.jurisdictionId, status: "enabled" as const };
}

export { createEmptyCountryLaunchChecklist };
