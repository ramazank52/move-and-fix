import { and, desc, eq, sql } from "drizzle-orm";

import {
  countryDeployments,
  countryMarketControlEvents,
  countryMarketControls,
  countryMarketReleaseRuns,
} from "../../drizzle/schema";
import { getDb, logOperationEvent } from "../db";
import {
  countryMarketGateSnapshotHash,
  deriveCountryMarketEffectiveState,
  type CountryMarketDesiredState,
} from "./CountryMarketControlPolicy";

export async function listCountryMarketControlOverviews(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_MARKET_CONTROL_DATABASE_UNAVAILABLE");
  return db
    .select({ deployment: countryDeployments, control: countryMarketControls })
    .from(countryMarketControls)
    .innerJoin(countryDeployments, eq(countryDeployments.id, countryMarketControls.countryDeploymentId))
    .orderBy(countryDeployments.countryCode)
    .limit(Math.min(Math.max(limit, 1), 50));
}

/**
 * All readiness inputs are derived server-side. This initial control surface is
 * intentionally conservative: it cannot manufacture legal, connector, locale,
 * payment, scanner, test, device or release proof from a client mutation.
 */
async function buildServerDerivedGateSnapshot(countryCode: string) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_MARKET_CONTROL_DATABASE_UNAVAILABLE");
  const nonTrRows = await db
    .select({ countryCode: countryDeployments.countryCode, state: countryMarketControls.effectiveState, allowlisted: countryMarketControls.inAppProductionAllowlisted })
    .from(countryMarketControls)
    .innerJoin(countryDeployments, eq(countryDeployments.id, countryMarketControls.countryDeploymentId));
  const nonTrMarketsClosed = nonTrRows
    .filter((row) => row.countryCode !== "TR")
    .every((row) => row.allowlisted === 0 && row.state !== "ACTIVE");
  return {
    countryCode,
    legacyCountryGateEnabled: false,
    legacyRuntimeFlagsEnabled: false,
    allCoveredCapabilitiesActive: false,
    localLegalApproved: false,
    officialSourceVerified: false,
    operationalConnectorPresent: false,
    legalLocaleApproved: false,
    paymentAndExternalCredentialsReady: false,
    scannerReady: false,
    securityAndRegressionReady: false,
    physicalDeviceE2eReady: false,
    monitoringBackupRollbackReady: false,
    ownerReleaseApprovalLedgerValid: false,
    nonTrMarketsClosed,
  } as const;
}

export async function requestCountryMarketDesiredState(input: {
  countryCode: string;
  desiredState: CountryMarketDesiredState;
  reason: string;
  actorUserId: number;
  mfaGrantId: string;
  expectedStateVersion: number;
  correlationId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_MARKET_CONTROL_DATABASE_UNAVAILABLE");
  const countryCode = input.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error("COUNTRY_MARKET_CONTROL_COUNTRY_INVALID");
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 1200) throw new Error("COUNTRY_MARKET_CONTROL_REASON_INVALID");
  const rows = await db
    .select({ deployment: countryDeployments, control: countryMarketControls })
    .from(countryMarketControls)
    .innerJoin(countryDeployments, eq(countryDeployments.id, countryMarketControls.countryDeploymentId))
    .where(eq(countryDeployments.countryCode, countryCode))
    .limit(2);
  if (rows.length !== 1) throw new Error("COUNTRY_MARKET_CONTROL_NOT_FOUND");
  const current = rows[0]!;
  if (current.control.stateVersion !== input.expectedStateVersion) throw new Error("COUNTRY_MARKET_CONTROL_STALE_WRITE");
  const snapshot = await buildServerDerivedGateSnapshot(countryCode);
  const evaluation = deriveCountryMarketEffectiveState({ countryCode, desiredState: input.desiredState, snapshot });
  const snapshotHash = countryMarketGateSnapshotHash(snapshot);
  const eventType = input.desiredState === "EMERGENCY_DISABLED" ? "EMERGENCY_DISABLED" : "DESIRED_STATE_REQUESTED" as const;

  const updated = await db.transaction(async (tx) => {
    const result = await tx.update(countryMarketControls).set({
      desiredState: input.desiredState,
      effectiveState: evaluation.effectiveState,
      requiresRevalidation: evaluation.effectiveState === "ACTIVE" ? 0 : 1,
      lastOwnerReason: reason,
      lastChangedByUserId: input.actorUserId,
      lastMfaGrantId: input.mfaGrantId,
      lastGateSnapshotHash: snapshotHash,
      stateVersion: sql`${countryMarketControls.stateVersion} + 1`,
      updatedAt: new Date(),
    }).where(and(eq(countryMarketControls.id, current.control.id), eq(countryMarketControls.stateVersion, current.control.stateVersion)));
    if ((result[0]?.affectedRows ?? 0) !== 1) throw new Error("COUNTRY_MARKET_CONTROL_STALE_WRITE");
    await tx.insert(countryMarketControlEvents).values({
      countryMarketControlId: current.control.id,
      eventType,
      previousDesiredState: current.control.desiredState,
      nextDesiredState: input.desiredState,
      previousEffectiveState: current.control.effectiveState,
      nextEffectiveState: evaluation.effectiveState,
      actorUserId: input.actorUserId,
      mfaGrantId: input.mfaGrantId,
      reason,
      gateSnapshotHash: snapshotHash,
      correlationId: input.correlationId,
    });
    if (input.desiredState === "ACTIVE" && evaluation.effectiveState !== "ACTIVE") {
      await tx.insert(countryMarketReleaseRuns).values({
        countryMarketControlId: current.control.id,
        requestedDesiredState: "ACTIVE",
        result: "BLOCKED",
        stage: "PRECHECK",
        blockersJson: evaluation.blockers,
        gateSnapshotHash: snapshotHash,
        actorUserId: input.actorUserId,
        mfaGrantId: input.mfaGrantId,
      });
    }
    const next = await tx.select().from(countryMarketControls).where(eq(countryMarketControls.id, current.control.id)).limit(1);
    return next[0]!;
  });
  await logOperationEvent({ eventType: "country_market_control.requested", subjectId: updated.id, actorId: input.actorUserId, severity: evaluation.effectiveState === "ACTIVE" ? "warning" : "info", payload: { countryCode, desiredState: input.desiredState, effectiveState: evaluation.effectiveState, blockers: evaluation.blockers, snapshotHash } });
  return { control: updated, effectiveState: evaluation.effectiveState, blockers: evaluation.blockers, snapshotHash };
}

export async function listCountryMarketControlEvents(countryCode: string, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("COUNTRY_MARKET_CONTROL_DATABASE_UNAVAILABLE");
  return db.select({ event: countryMarketControlEvents }).from(countryMarketControlEvents)
    .innerJoin(countryMarketControls, eq(countryMarketControls.id, countryMarketControlEvents.countryMarketControlId))
    .innerJoin(countryDeployments, eq(countryDeployments.id, countryMarketControls.countryDeploymentId))
    .where(eq(countryDeployments.countryCode, countryCode.trim().toUpperCase()))
    .orderBy(desc(countryMarketControlEvents.createdAt)).limit(Math.min(Math.max(limit, 1), 100));
}
