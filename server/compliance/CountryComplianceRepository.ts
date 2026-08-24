import { and, desc, eq, isNull } from "drizzle-orm";

import {
  countryCoveragePolicyDecisions,
  countryServiceCoverage,
  countryDeployments,
  countryMarketControls,
  jurisdictionNodes,
  jurisdictions,
  jurisdictionCompliancePackages,
  jurisdictionLaunchGates,
  officialComplianceSources,
  paymentProviderWatch,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { gatewayCheckoutService } from "../payments/GatewayCheckoutService";
import {
  createEmptyCountryLaunchChecklist,
  evaluateCountryLaunch,
  parseCountryLaunchChecklist,
  type CountryLaunchChecklist,
} from "./CountryLaunchGateService";
import { evaluateTurkeyPaymentLaunchReadiness } from "./TurkeyPaymentLaunchPolicy";
import {
  countryCoverageActivationBlockReasons,
  countryDeploymentTransitionBlockReason,
  type CountryDeploymentTransition,
} from "./CountryDeploymentPolicy";
import { countryMarketTransitionBlockReason } from "./CountryMarketControlPolicy";

export type CompliancePackageStatus = "draft" | "legal_review" | "approved" | "enabled" | "blocked" | "retired";
export type OfficialSourceStatus = "draft" | "verified" | "superseded" | "revoked";
export type CountryMarketplaceTransition =
  | "REQUEST_CREATION"
  | "PROVIDER_ACTIVATION"
  | "OPPORTUNITY_EXPOSURE"
  | "OFFER_SUBMIT"
  | "OFFER_ACCEPTANCE"
  | "PAYMENT_INITIATION"
  | "CAPABILITY_ACTIVATION"
  | "VERIFIED_BADGE"
  | "PAYOUT"
  | "CAMPAIGN"
  | "OPERATION_NOTIFICATION";

type CountryLaunchGateStatus = "blocked" | "review" | "ready" | "enabled" | "suspended" | null;

export function countryMarketplaceTransitionBlockReason(input: {
  countryCode: string | null | undefined;
  gateStatus: CountryLaunchGateStatus;
  paymentReady: boolean;
  transition: CountryMarketplaceTransition;
}) {
  const countryCode = input.countryCode?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return `COUNTRY_LAUNCH_GATE_BLOCKED:${input.transition}:COUNTRY_UNKNOWN`;
  }
  // `ready` is deliberately not sufficient. A legal/operational administrator
  // must explicitly enable the marketplace after the evidence checklist passes.
  if (input.gateStatus !== "enabled") {
    return `COUNTRY_LAUNCH_GATE_BLOCKED:${input.transition}:GATE_${input.gateStatus?.toUpperCase() ?? "UNKNOWN"}`;
  }
  if (!input.paymentReady) {
    return `COUNTRY_LAUNCH_GATE_BLOCKED:${input.transition}:PAYMENT_NOT_READY`;
  }
  return null;
}

/**
 * The sole runtime authority for new marketplace transitions. Historical data
 * readers intentionally do not call this function. Unknown country, missing
 * jurisdiction, missing gate, a non-enabled gate, or current payment
 * unavailability always blocks the transition.
 */
export async function assertCountryMarketplaceTransition(input: {
  countryCode?: string | null;
  jurisdictionId?: number | null;
  transition: CountryMarketplaceTransition;
}) {
  const db = await getDb();
  if (!db) throw new Error(`COUNTRY_LAUNCH_GATE_BLOCKED:${input.transition}:DATABASE_UNAVAILABLE`);

  const countryCode = input.countryCode?.trim().toUpperCase() ?? "";
  const deploymentRows = /^[A-Z]{2}$/.test(countryCode)
    ? await db.select().from(countryDeployments).where(eq(countryDeployments.countryCode, countryCode)).limit(2)
    : [];
  const deployment = deploymentRows.length === 1 ? deploymentRows[0]! : null;
  if (deployment) {
    const marketControls = await db
      .select()
      .from(countryMarketControls)
      .where(eq(countryMarketControls.countryDeploymentId, deployment.id))
      .limit(2);
    const marketControl = marketControls.length === 1 ? marketControls[0]! : null;
    if (!marketControl) throw new Error(`COUNTRY_MARKET_BLOCKED:${input.transition}:MARKET_CONTROL_MISSING`);
    const marketReason = countryMarketTransitionBlockReason({
      countryCode: deployment.countryCode,
      effectiveState: marketControl.effectiveState,
      inAppProductionAllowlisted: marketControl.inAppProductionAllowlisted,
      transition: input.transition,
    });
    if (marketReason) throw new Error(marketReason);
    const deploymentReason = countryDeploymentTransitionBlockReason({
      deployment,
      transition: input.transition as CountryDeploymentTransition,
    });
    if (deploymentReason) throw new Error(deploymentReason);
  }
  let jurisdiction = null as (typeof jurisdictions.$inferSelect) | null;
  if (input.jurisdictionId != null) {
    const rows = await db.select().from(jurisdictions).where(eq(jurisdictions.id, input.jurisdictionId)).limit(1);
    jurisdiction = rows[0] ?? null;
  } else if (/^[A-Z]{2}$/.test(countryCode)) {
    const rows = await db
      .select()
      .from(jurisdictions)
      .where(and(eq(jurisdictions.countryCode, countryCode), isNull(jurisdictions.regionCode)))
      .limit(2);
    jurisdiction = rows.length === 1 ? rows[0]! : null;
  }

  const effectiveCountryCode = jurisdiction?.countryCode ?? countryCode;
  const gateRows = jurisdiction
    ? await db.select().from(jurisdictionLaunchGates).where(eq(jurisdictionLaunchGates.jurisdictionId, jurisdiction.id)).limit(2)
    : [];
  const gate = gateRows.length === 1 ? gateRows[0]! : null;
  const paymentReadiness = jurisdiction
    ? await getCountryPaymentLaunchReadiness(db, effectiveCountryCode)
    : { ready: false };
  const reason = countryMarketplaceTransitionBlockReason({
    countryCode: effectiveCountryCode,
    gateStatus: gate?.status ?? null,
    paymentReady: paymentReadiness.ready,
    transition: input.transition,
  });
  if (reason) throw new Error(reason);
  return {
    countryCode: effectiveCountryCode,
    jurisdictionId: jurisdiction!.id,
    transition: input.transition,
    gateStatus: "enabled" as const,
  };
}

/**
 * Reads a server-resolved jurisdiction node plus canonical service IDs before
 * invoking the existing country gate. This path is intentionally additive and
 * read-only: provider/client input cannot write source, connector, approval or
 * coverage decision state.
 */
export async function assertCountryCoverageTransition(input: {
  countryCode: string;
  resolvedJurisdictionNodeCode: string;
  canonicalCategoryId: number;
  canonicalSubcategoryId: number;
  transition: CountryMarketplaceTransition;
}) {
  const db = await getDb();
  if (!db) throw new Error(`COUNTRY_COVERAGE_BLOCKED:${input.transition}:DATABASE_UNAVAILABLE`);

  const countryCode = input.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error(`COUNTRY_COVERAGE_BLOCKED:${input.transition}:COUNTRY_UNKNOWN`);
  const coverageRows = await db
    .select({ coverage: countryServiceCoverage, decision: countryCoveragePolicyDecisions })
    .from(countryServiceCoverage)
    .innerJoin(jurisdictionNodes, eq(jurisdictionNodes.id, countryServiceCoverage.jurisdictionNodeId))
    .leftJoin(countryCoveragePolicyDecisions, eq(countryCoveragePolicyDecisions.coverageId, countryServiceCoverage.id))
    .innerJoin(countryDeployments, eq(countryDeployments.id, countryServiceCoverage.countryDeploymentId))
    .where(and(
      eq(countryDeployments.countryCode, countryCode),
      eq(jurisdictionNodes.nodeCode, input.resolvedJurisdictionNodeCode),
      eq(countryServiceCoverage.canonicalCategoryId, input.canonicalCategoryId),
      eq(countryServiceCoverage.canonicalSubcategoryId, input.canonicalSubcategoryId),
    ))
    .limit(2);
  if (coverageRows.length !== 1 || !coverageRows[0]?.decision) {
    throw new Error(`COUNTRY_COVERAGE_BLOCKED:${input.transition}:COVERAGE_UNKNOWN_OR_INCOMPLETE`);
  }

  const { coverage, decision } = coverageRows[0];
  const coverageResult = countryCoverageActivationBlockReasons({
    mappingState: coverage.mappingState,
    productionState: coverage.productionState,
    sourceState: coverage.sourceState,
    legalState: coverage.legalState,
    connectorState: coverage.connectorState,
    decision: decision.decision,
    assuranceLevel: decision.assuranceLevel,
    legalApprovalState: decision.legalApprovalState,
    productReleaseState: decision.productReleaseState,
  });
  if (!coverageResult.allowed) {
    throw new Error(`COUNTRY_COVERAGE_BLOCKED:${input.transition}:${coverageResult.blockers.join(",")}`);
  }
  return assertCountryMarketplaceTransition({ countryCode, transition: input.transition });
}

async function getTurkeyPaymentLaunchReadiness(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const records = await db
    .select()
    .from(paymentProviderWatch)
    .where(and(eq(paymentProviderWatch.countryCode, "TR"), eq(paymentProviderWatch.currency, "TRY")));
  return evaluateTurkeyPaymentLaunchReadiness({
    countryCode: "TR",
    currency: "TRY",
    candidates: records.map((record) => ({
      ...record,
      configured: gatewayCheckoutService.isConfigured(record.provider),
    })),
  });
}

async function getCountryPaymentLaunchReadiness(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  countryCode: string,
) {
  return countryCode.trim().toUpperCase() === "TR"
    ? getTurkeyPaymentLaunchReadiness(db)
    : {
        ready: false,
        eligibleProviders: [],
        blockers: ["COUNTRY_PAYMENT_PROVIDER_NOT_CONFIGURED"],
      };
}

export async function listCountryComplianceOverviews() {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_COMPLIANCE_DATABASE_UNAVAILABLE");
  const [jurisdictionRows, packageRows, sourceRows, gateRows, providerRows] = await Promise.all([
    db.select().from(jurisdictions).orderBy(jurisdictions.countryCode, jurisdictions.regionCode),
    db.select().from(jurisdictionCompliancePackages).orderBy(desc(jurisdictionCompliancePackages.updatedAt)),
    db.select().from(officialComplianceSources).orderBy(desc(officialComplianceSources.updatedAt)),
    db.select().from(jurisdictionLaunchGates).orderBy(desc(jurisdictionLaunchGates.updatedAt)),
    db.select().from(paymentProviderWatch),
  ]);

  return jurisdictionRows.map((jurisdiction) => {
    const currentPackage = packageRows.find((item) => item.jurisdictionId === jurisdiction.id && (item.status === "approved" || item.status === "enabled"))
      ?? packageRows.find((item) => item.jurisdictionId === jurisdiction.id)
      ?? null;
    const sourceCount = sourceRows.filter((item) => item.jurisdictionId === jurisdiction.id).length;
    const verifiedSourceCount = sourceRows.filter((item) => item.jurisdictionId === jurisdiction.id && item.status === "verified").length;
    const gate = gateRows.find((item) => item.jurisdictionId === jurisdiction.id) ?? null;
    const checklist = parseCountryLaunchChecklist(gate?.checklistJson);
    const countryPaymentRows = providerRows.filter((record) => record.countryCode === jurisdiction.countryCode);
    const paymentReadiness = jurisdiction.countryCode === "TR"
      ? evaluateTurkeyPaymentLaunchReadiness({
          countryCode: "TR",
          currency: "TRY",
          candidates: countryPaymentRows.map((record) => ({
            ...record,
            configured: gatewayCheckoutService.isConfigured(record.provider),
          })),
        })
      : { ready: false, eligibleProviders: [], blockers: ["COUNTRY_PAYMENT_PROVIDER_NOT_CONFIGURED"] };
    const evaluation = evaluateCountryLaunch({
      checklist,
      compliancePackageStatus: currentPackage?.status ?? null,
      hasVerifiedOfficialSource: verifiedSourceCount > 0,
      countryCode: jurisdiction.countryCode,
      hasOperationalPaymentProvider: paymentReadiness.ready,
    });
    return { jurisdiction, currentPackage, sourceCount, verifiedSourceCount, gate, checklist, evaluation, paymentReadiness };
  });
}

/**
 * Public/mobile-safe projection of the operational country launch state.
 * Locale, currency and seed data never imply a selectable country.
 */
export async function listPublicCountryLaunchOptions() {
  const overviews = await listCountryComplianceOverviews();
  return overviews
    .filter(({ jurisdiction }) => jurisdiction.regionCode === null)
    .map(({ jurisdiction, gate, paymentReadiness }) => {
      const selectable = gate?.status === "enabled" && paymentReadiness.ready;
      return {
        countryCode: jurisdiction.countryCode,
        displayName: jurisdiction.displayName,
        selectable,
        availability: selectable
          ? "AVAILABLE" as const
          : gate?.status === "ready" || gate?.status === "review"
            ? "COMING_SOON" as const
            : "BLOCKED" as const,
      };
    });
}

/**
 * Resolves transaction currency only after the country launch gate authorizes
 * the requested transition. The client never supplies a trusted currency.
 */
export async function resolveCountryPaymentContext(input: {
  countryCode: string;
  transition: CountryMarketplaceTransition;
}) {
  const transition = await assertCountryMarketplaceTransition(input);
  if (transition.countryCode !== "TR") {
    // Every currently non-TR country is blocked by the launch/payment gate;
    // keep this explicit guard so a future gate cannot silently invent a
    // transaction currency before a reviewed resolver is introduced.
    throw new Error(`COUNTRY_CURRENCY_CONTEXT_UNRESOLVED:${transition.countryCode}`);
  }
  return { countryCode: transition.countryCode, currency: "TRY" as const };
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
  const [jurisdiction] = await db.select().from(jurisdictions).where(eq(jurisdictions.id, input.jurisdictionId)).limit(1);
  if (!jurisdiction) throw new Error("COUNTRY_JURISDICTION_NOT_FOUND");
  const paymentReadiness = await getCountryPaymentLaunchReadiness(db, jurisdiction.countryCode);
  const evaluation = evaluateCountryLaunch({
    checklist: input.checklist,
    compliancePackageStatus: compliancePackage?.status ?? null,
    hasVerifiedOfficialSource: sources.some((item) => item.status === "verified"),
    countryCode: jurisdiction.countryCode,
    hasOperationalPaymentProvider: paymentReadiness.ready,
  });
  const values = {
    jurisdictionId: input.jurisdictionId,
    packageId: compliancePackage?.id ?? null,
    status: evaluation.status,
    checklistJson: JSON.stringify(input.checklist),
    blockingReason: evaluation.ready ? null : `Eksik veya doğrulanmamış kapı kalemleri: ${[...evaluation.missing, ...paymentReadiness.blockers].join(", ")}`,
    evaluatedByUserId: input.evaluatedByUserId,
    evaluatedAt: new Date(),
  } as const;
  await db.insert(jurisdictionLaunchGates).values(values).onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  return { ...evaluation, checklist: input.checklist, paymentReadiness };
}

export async function enableCountryProfessionalMarketplace(input: { jurisdictionId: number; enabledByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_COMPLIANCE_DATABASE_UNAVAILABLE");
  const gateRows = await db.select().from(jurisdictionLaunchGates).where(eq(jurisdictionLaunchGates.jurisdictionId, input.jurisdictionId)).limit(1);
  const gate = gateRows[0];
  if (!gate || gate.status !== "ready") throw new Error("COUNTRY_PROFESSIONAL_MARKETPLACE_BLOCKED");
  const [jurisdiction] = await db.select().from(jurisdictions).where(eq(jurisdictions.id, input.jurisdictionId)).limit(1);
  if (!jurisdiction) throw new Error("COUNTRY_JURISDICTION_NOT_FOUND");
  const paymentReadiness = await getCountryPaymentLaunchReadiness(db, jurisdiction.countryCode);
  if (!paymentReadiness.ready) throw new Error("COUNTRY_PAYMENT_PROVIDER_NOT_READY");
  const updated = await db.update(jurisdictionLaunchGates).set({ status: "enabled", evaluatedByUserId: input.enabledByUserId, evaluatedAt: new Date() }).where(eq(jurisdictionLaunchGates.id, gate.id));
  if ((updated[0]?.affectedRows ?? 0) !== 1) throw new Error("COUNTRY_LAUNCH_GATE_NOT_FOUND");
  return { jurisdictionId: input.jurisdictionId, status: "enabled" as const };
}

export { createEmptyCountryLaunchChecklist };
