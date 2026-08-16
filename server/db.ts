import { and, desc, eq, gt, gte, inArray, isNotNull, isNull, like, lte, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { getRequiredRegistrationConsentDocuments } from "../lib/data/legal";
import {
  InsertUser,
  users,
  consentEvents,
  userCredentials,
  authChallenges,
  localAuthSessions,
  adminMfaGrants,
  providerDocuments,
  providerCredentials,
  walletAccounts,
  walletTransactions,
  walletWithdrawals,
  operationalFeatureFlags,
  operationalEvents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getApmConfigurationStatus } from "./_core/observability";
import {
  assertPaymentStatusTransition,
  calculateCancellationSettlementPlan,
  calculatePaymentBreakdown,
  commissionRateForProvider,
  type EscrowPaymentStatus,
} from "./payments/policy";
import { trustRestrictionForReviewedRisk } from "./trust/policy";
import {
  buildCancellationPartialRefundLedgerEntry,
  buildCancellationProviderSettlementLedgerEntry,
  buildEscrowReleasedLedgerEntry,
  buildPaymentHeldLedgerEntry,
  buildRefundLedgerEntry,
  postFinancialLedgerEntry,
} from "./payments/FinancialLedgerService";
import { rankServiceOpportunitiesByLocation } from "./matching/location";
import { buildJobCompletionTimelineEvent } from "./jobs/JobCapsuleLifecycle";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Local credentials and verification challenges
// Passwords and one-time codes must arrive here as hashes; plaintext values
// are never persisted in the database.
export type AuthChallengePurpose = "verify_email" | "verify_phone" | "password_reset" | "sensitive_transaction" | "admin_mfa";
export type AuthChallengeChannel = "email" | "sms";

export async function getUserByEmailNormalized(emailNormalized: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ user: users, credential: userCredentials })
    .from(userCredentials)
    .innerJoin(users, eq(users.id, userCredentials.userId))
    .where(eq(userCredentials.emailNormalized, emailNormalized))
    .limit(1);
  return rows[0] ?? null;
}

export async function createLocalUser(data: {
  openId: string;
  name: string;
  email: string;
  phone?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({
    ...data,
    loginMethod: "local",
    role: "user",
    lastSignedIn: new Date(),
  });
  const rows = await db.select().from(users).where(eq(users.id, result[0].insertId)).limit(1);
  if (!rows[0]) throw new Error("LOCAL_USER_CREATE_FAILED");
  return rows[0];
}

/** Persists immutable, server-validated consent evidence. Never update these rows. */
export async function recordConsentEvents(data: Array<{
  userId: number;
  consentKey: string;
  documentVersion: string;
  purpose: "legal" | "marketing" | "transactional";
  action: "granted" | "withdrawn";
  source: string;
}>) {
  if (data.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(consentEvents).values(data);
}

/** Returns only legal consents whose latest immutable evidence is not the catalog's current granted version. */
export async function getOutstandingRequiredLegalConsents(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const history = await db
    .select({
      consentKey: consentEvents.consentKey,
      documentVersion: consentEvents.documentVersion,
      action: consentEvents.action,
      createdAt: consentEvents.createdAt,
      id: consentEvents.id,
    })
    .from(consentEvents)
    .where(eq(consentEvents.userId, userId))
    .orderBy(desc(consentEvents.createdAt), desc(consentEvents.id));

  const latestByConsentKey = new Map<string, (typeof history)[number]>();
  for (const event of history) {
    if (!latestByConsentKey.has(event.consentKey)) latestByConsentKey.set(event.consentKey, event);
  }

  return getRequiredRegistrationConsentDocuments().filter((required) => {
    const latest = latestByConsentKey.get(required.consentKey);
    return !latest || latest.action !== "granted" || latest.documentVersion !== required.documentVersion;
  });
}

/** Creates the minimal profile required before a locally registered provider can upload documents. */
export async function createLocalProviderProfile(data: { userId: number; displayName: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(providers).values({
    userId: data.userId,
    displayName: data.displayName,
    verificationStatus: "unsubmitted",
    isAvailable: 1,
  });
  const rows = await db.select().from(providers).where(eq(providers.id, result[0].insertId)).limit(1);
  if (!rows[0]) throw new Error("LOCAL_PROVIDER_CREATE_FAILED");
  return rows[0];
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

export async function updateUserVerification(data: {
  userId: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  await db
    .update(users)
    .set({
      ...(data.emailVerified ? { emailVerifiedAt: now } : {}),
      ...(data.phoneVerified ? { phoneVerifiedAt: now } : {}),
    })
    .where(eq(users.id, data.userId));
}

export async function createLocalCredential(data: {
  userId: number;
  passwordHash: string;
  emailNormalized?: string;
  phoneE164?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userCredentials).values(data);
  return result[0].insertId;
}

export async function getLocalCredential(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(userCredentials)
    .where(eq(userCredentials.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateLocalCredentialPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(userCredentials)
    .set({
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
      passwordUpdatedAt: new Date(),
    })
    .where(eq(userCredentials.userId, userId));
  if ((result[0]?.affectedRows ?? 0) !== 1) throw new Error("LOCAL_CREDENTIAL_NOT_FOUND");
}

export async function recordLocalLoginFailure(userId: number, lockUntil?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(userCredentials)
    .set({
      failedLoginCount: sql`${userCredentials.failedLoginCount} + 1`,
      ...(lockUntil ? { lockedUntil: lockUntil } : {}),
    })
    .where(eq(userCredentials.userId, userId));
}

export async function resetLocalLoginFailures(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(userCredentials)
    .set({ failedLoginCount: 0, lockedUntil: null })
    .where(eq(userCredentials.userId, userId));
}

export async function createLocalAuthSession(data: {
  id: string;
  userId: number;
  tokenHash: string;
  userAgent?: string | null;
  ipHash?: string | null;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(localAuthSessions).values(data);
  return data.id;
}

export async function getLocalAuthSessionByTokenHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(localAuthSessions)
    .where(eq(localAuthSessions.tokenHash, tokenHash))
    .limit(1);
  return rows[0] ?? null;
}

export async function touchLocalAuthSession(id: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(localAuthSessions)
    .set({ lastSeenAt: new Date() })
    .where(and(eq(localAuthSessions.id, id), isNull(localAuthSessions.revokedAt)));
}

export async function listLocalAuthSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: localAuthSessions.id,
      userAgent: localAuthSessions.userAgent,
      createdAt: localAuthSessions.createdAt,
      lastSeenAt: localAuthSessions.lastSeenAt,
      expiresAt: localAuthSessions.expiresAt,
      revokedAt: localAuthSessions.revokedAt,
      revokeReason: localAuthSessions.revokeReason,
    })
    .from(localAuthSessions)
    .where(eq(localAuthSessions.userId, userId))
    .orderBy(desc(localAuthSessions.lastSeenAt));
}

export async function revokeLocalAuthSession(data: { userId: number; sessionId: string; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(localAuthSessions)
    .set({ revokedAt: new Date(), revokeReason: data.reason })
    .where(and(eq(localAuthSessions.id, data.sessionId), eq(localAuthSessions.userId, data.userId), isNull(localAuthSessions.revokedAt)));
  return (result[0]?.affectedRows ?? 0) === 1;
}

export async function revokeOtherLocalAuthSessions(data: { userId: number; currentSessionId: string | null; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(localAuthSessions.userId, data.userId), isNull(localAuthSessions.revokedAt)];
  if (data.currentSessionId) conditions.push(sql`${localAuthSessions.id} <> ${data.currentSessionId}`);
  const result = await db
    .update(localAuthSessions)
    .set({ revokedAt: new Date(), revokeReason: data.reason })
    .where(and(...conditions));
  return result[0]?.affectedRows ?? 0;
}

export async function createAdminMfaGrant(data: {
  id: string;
  userId: number;
  sessionFingerprint: string;
  challengeId: number;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(adminMfaGrants)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        challengeId: data.challengeId,
        verifiedAt: new Date(),
        expiresAt: data.expiresAt,
        revokedAt: null,
      },
    });
}

export async function hasValidAdminMfaGrant(data: { userId: number; sessionFingerprint: string; now?: Date }) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: adminMfaGrants.id })
    .from(adminMfaGrants)
    .where(
      and(
        eq(adminMfaGrants.userId, data.userId),
        eq(adminMfaGrants.sessionFingerprint, data.sessionFingerprint),
        isNull(adminMfaGrants.revokedAt),
        gte(adminMfaGrants.expiresAt, data.now ?? new Date()),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

export async function revokeAdminMfaGrantsForSession(data: { userId: number; sessionFingerprint: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(adminMfaGrants)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminMfaGrants.userId, data.userId), eq(adminMfaGrants.sessionFingerprint, data.sessionFingerprint), isNull(adminMfaGrants.revokedAt)));
}

export async function revokeAdminMfaGrantsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(adminMfaGrants)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminMfaGrants.userId, userId), isNull(adminMfaGrants.revokedAt)));
  return result[0]?.affectedRows ?? 0;
}

export async function createAuthChallenge(data: {
  userId: number;
  purpose: AuthChallengePurpose;
  channel: AuthChallengeChannel;
  destination: string;
  codeHash: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    // A new code invalidates previous unconsumed codes for the same security purpose.
    await tx
      .update(authChallenges)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(authChallenges.userId, data.userId),
          eq(authChallenges.purpose, data.purpose),
          isNull(authChallenges.consumedAt),
        ),
      );
    const result = await tx.insert(authChallenges).values(data);
    return result[0].insertId;
  });
}

export async function getActiveAuthChallenge(data: {
  userId: number;
  purpose: AuthChallengePurpose;
  codeHash: string;
  now?: Date;
}) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.userId, data.userId),
        eq(authChallenges.purpose, data.purpose),
        eq(authChallenges.codeHash, data.codeHash),
        isNull(authChallenges.consumedAt),
        gte(authChallenges.expiresAt, data.now ?? new Date()),
      ),
    )
    .orderBy(desc(authChallenges.createdAt), desc(authChallenges.id))
    .limit(1);
  const challenge = rows[0];
  if (!challenge || challenge.attempts >= challenge.maxAttempts) return null;
  return challenge;
}

export async function getLatestActiveAuthChallenge(data: {
  userId: number;
  purpose: AuthChallengePurpose;
  now?: Date;
}) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.userId, data.userId),
        eq(authChallenges.purpose, data.purpose),
        isNull(authChallenges.consumedAt),
        gte(authChallenges.expiresAt, data.now ?? new Date()),
      ),
    )
    .orderBy(desc(authChallenges.createdAt), desc(authChallenges.id))
    .limit(1);
  const challenge = rows[0];
  if (!challenge || challenge.attempts >= challenge.maxAttempts) return null;
  return challenge;
}

export async function incrementAuthChallengeAttempts(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(authChallenges)
    .set({ attempts: sql`${authChallenges.attempts} + 1` })
    .where(and(eq(authChallenges.id, id), isNull(authChallenges.consumedAt)));
}

export async function markAuthChallengeUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(and(eq(authChallenges.id, id), isNull(authChallenges.consumedAt)));
  if ((result[0]?.affectedRows ?? 0) !== 1) throw new Error("AUTH_CHALLENGE_ALREADY_CONSUMED");
}

export async function createProviderDocument(data: {
  providerId: number;
  ownerUserId: number;
  type: "identity" | "driver_license" | "src_certificate" | "psychotechnic";
  storageKey: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .insert(providerDocuments)
    .values({ ...data, status: "pending", rejectionReason: null, reviewedByUserId: null, reviewedAt: null })
    .onDuplicateKeyUpdate({
      set: {
        ownerUserId: data.ownerUserId,
        storageKey: data.storageKey,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        sha256: data.sha256,
        status: "pending",
        rejectionReason: null,
        reviewedByUserId: null,
        reviewedAt: null,
      },
    });
  const rows = await db
    .select({ id: providerDocuments.id })
    .from(providerDocuments)
    .where(
      and(
        eq(providerDocuments.providerId, data.providerId),
        eq(providerDocuments.type, data.type),
      ),
    )
    .limit(1);
  return rows[0]?.id ?? result[0].insertId;
}

export async function getProviderDocuments(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  const documents = await db
    .select()
    .from(providerDocuments)
    .where(eq(providerDocuments.providerId, providerId))
    .orderBy(desc(providerDocuments.createdAt), desc(providerDocuments.id));
  const now = new Date();
  return documents.map((document) =>
    document.contentPurgedAt || (document.retentionDueAt && document.retentionDueAt.getTime() <= now.getTime())
      ? { ...document, storageKey: "" }
      : document,
  );
}

export async function updateProviderDocumentStatus(data: {
  id: number;
  status: "approved" | "rejected";
  reviewNote?: string;
  reviewedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(providerDocuments)
    .set({
      status: data.status,
      rejectionReason: data.status === "rejected" ? data.reviewNote ?? "İnceleme reddedildi" : null,
      reviewedByUserId: data.reviewedByUserId,
      reviewedAt: new Date(),
    })
    .where(eq(providerDocuments.id, data.id));
  if ((result[0]?.affectedRows ?? 0) !== 1) throw new Error("PROVIDER_DOCUMENT_NOT_FOUND");
}

/**
 * Returns only documents whose approved retention window has ended. Callers must
 * execute the logical purge before attempting an external storage erase; this
 * prevents stale document links being returned while a storage provider erases
 * the bytes asynchronously.
 */
export async function listDueProviderDocumentRetention(now: Date, limit: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(providerDocuments)
    .where(
      and(
        isNotNull(providerDocuments.retentionDueAt),
        lte(providerDocuments.retentionDueAt, now),
        isNull(providerDocuments.contentPurgedAt),
        inArray(providerDocuments.purgeStatus, ["not_scheduled", "scheduled"]),
      ),
    )
    .orderBy(providerDocuments.retentionDueAt, providerDocuments.id)
    .limit(limit);
}

/**
 * Idempotent, fail-closed logical purge. Storage bytes are never claimed erased
 * by this method: a separate configured storage eraser must confirm deletion.
 */
export async function logicalPurgeProviderDocument(input: { id: number; now?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = input.now ?? new Date();
  const result = await db
    .update(providerDocuments)
    .set({
      storageKey: "",
      fileUrl: "",
      contentPurgedAt: now,
      purgeStatus: "storage_erase_pending",
    })
    .where(and(eq(providerDocuments.id, input.id), isNull(providerDocuments.contentPurgedAt)));
  return (result[0]?.affectedRows ?? 0) === 1;
}

export async function getProviderDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(providerDocuments)
    .where(eq(providerDocuments.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listProviderCapabilityStatuses(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(providerCapabilityStatuses)
    .where(eq(providerCapabilityStatuses.providerId, providerId))
    .orderBy(desc(providerCapabilityStatuses.updatedAt), desc(providerCapabilityStatuses.id));
}

export async function listProviderCredentialStatuses(providerId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  return db
    .select({
      jurisdictionId: providerCredentials.jurisdictionId,
      credentialType: providerCredentials.credentialType,
      assuranceLevel: providerCredentials.assuranceLevel,
      status: providerCredentials.status,
      expiresAt: providerCredentials.expiresAt,
      verifiedAt: providerCredentials.verifiedAt,
      reviewedByUserId: providerCredentials.reviewedByUserId,
      revocationStatus: providerCredentials.revocationStatus,
      ruleVersion: providerCredentials.ruleVersion,
    })
    .from(providerCredentials)
    .where(eq(providerCredentials.providerId, providerId))
    .orderBy(desc(providerCredentials.updatedAt), desc(providerCredentials.id));
}

export async function createProviderCapabilityAppeal(data: {
  providerId: number;
  providerCapabilityStatusId: number;
  type: "appeal" | "resubmission";
  statement: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const statuses = await db
    .select({ id: providerCapabilityStatuses.id, status: providerCapabilityStatuses.status })
    .from(providerCapabilityStatuses)
    .where(
      and(
        eq(providerCapabilityStatuses.id, data.providerCapabilityStatusId),
        eq(providerCapabilityStatuses.providerId, data.providerId),
      ),
    )
    .limit(1);
  const capabilityStatus = statuses[0];
  if (!capabilityStatus) throw new Error("PROVIDER_CAPABILITY_STATUS_NOT_FOUND");
  if (
    capabilityStatus.status !== "REJECTED" &&
    capabilityStatus.status !== "EXPIRED_OR_SUSPENDED" &&
    capabilityStatus.status !== "MANUAL_REVIEW"
  ) {
    throw new Error("PROVIDER_CAPABILITY_APPEAL_NOT_ALLOWED");
  }
  const created = await db.insert(providerCapabilityAppeals).values({
    providerId: data.providerId,
    providerCapabilityStatusId: data.providerCapabilityStatusId,
    type: data.type,
    statement: data.statement.trim(),
    status: "submitted",
  });
  const rows = await db
    .select()
    .from(providerCapabilityAppeals)
    .where(eq(providerCapabilityAppeals.id, Number(created[0].insertId)))
    .limit(1);
  if (!rows[0]) throw new Error("PROVIDER_CAPABILITY_APPEAL_CREATE_FAILED");
  return rows[0];
}

export async function reviewProviderCapabilityStatus(data: {
  providerCapabilityStatusId: number;
  credentialId?: number;
  reviewerUserId: number;
  decision: "verified" | "limited_scope" | "manual_review" | "rejected" | "suspended";
  rationale: string;
  scopeNote?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const nextStatus = {
    verified: "VERIFIED",
    limited_scope: "VERIFIED_LIMITED_SCOPE",
    manual_review: "MANUAL_REVIEW",
    rejected: "REJECTED",
    suspended: "EXPIRED_OR_SUSPENDED",
  } as const;
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(providerCapabilityStatuses)
      .set({
        status: nextStatus[data.decision],
        ...(data.scopeNote !== undefined ? { scopeNote: data.scopeNote.trim().slice(0, 500) || null } : {}),
        ...(data.credentialId !== undefined ? { lastCredentialId: data.credentialId } : {}),
        evaluatedAt: new Date(),
      })
      .where(eq(providerCapabilityStatuses.id, data.providerCapabilityStatusId));
    if ((updated[0]?.affectedRows ?? 0) !== 1) throw new Error("PROVIDER_CAPABILITY_STATUS_NOT_FOUND");
    await tx.insert(providerCapabilityReviews).values({
      providerCapabilityStatusId: data.providerCapabilityStatusId,
      credentialId: data.credentialId ?? null,
      reviewerUserId: data.reviewerUserId,
      decision: data.decision,
      rationale: data.rationale.trim(),
    });
    const rows = await tx
      .select()
      .from(providerCapabilityStatuses)
      .where(eq(providerCapabilityStatuses.id, data.providerCapabilityStatusId))
      .limit(1);
    if (!rows[0]) throw new Error("PROVIDER_CAPABILITY_STATUS_NOT_FOUND");
    return rows[0];
  });
}

export async function refreshProviderVerificationStatus(providerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const documents = await getProviderDocuments(providerId);
  const identity = documents.find((document) => document.type === "identity");
  const hasRejected = documents.some((document) => document.status === "rejected");
  const hasPending = documents.some((document) => document.status === "pending");
  const status = hasRejected
    ? "rejected"
    : identity?.status === "approved" && !hasPending
      ? "approved"
      : documents.length > 0
        ? "pending"
        : "unsubmitted";
  await db
    .update(providers)
    .set({
      verificationStatus: status,
      isVerified: status === "approved" ? 1 : 0,
      verificationSubmittedAt: status === "pending" ? new Date() : undefined,
      verificationReviewedAt: status === "pending" ? null : new Date(),
    })
    .where(eq(providers.id, providerId));
  return status;
}


import {
  serviceCategories,
  serviceSubcategories,
  serviceCapabilities,
  jurisdictions,
  jurisdictionCompliancePackages,
  capabilityJurisdictionRules,
  serviceRequests,
  serviceRequestDetails,
  serviceRequestMedia,
  providers,
  offers,
  messages,
  payments,
  paymentWebhookEvents,
  serviceAgreements,
  settlementPolicies,
  jobChangeOrders,
  jobCancellationCases,
  jobExpenses,
  jobExpenseMedia,
  expenseRefundRequests,
  providerFavorites,
  reviews,
  jobTracking,
  jobCompletionProofs,
  jobCompletionProofMedia,
  completionDisputes,
  escrowReleaseEvents,
  financialLedgerEntries,
  financialReconciliationAlerts,
  financialReconciliationRuns,
  providerCapabilityAppeals,
  providerCapabilityReviews,
  providerCapabilityStatuses,
  moveAiDrafts,
  moveAiDraftMedia,
  trustProfiles,
  riskFlags,
  paymentProviderWatch,
  organizations,
  organizationMembers,
  adminRoles,
  maskedCommunicationSessions,
  jobTimelineEvents,
  priceGuarantees,
  priceIntelligenceAssessments,
  safetyTrustedContacts,
  safetyCheckIns,
  safetyIncidents,
  organizationSites,
  organizationManagedAssets,
  organizationMaintenanceSchedules,
  organizationRequestApprovals,
  organizationRequestBatches,
  organizationRequestBatchItems,
  organizationInvoices,
  privacyRightsRequests,
  privacyLegalHolds,
  supportTickets,
  supportTicketEvents,
  insuranceClaims,
  insuranceClaimMedia,
  taxRules,
  serviceRequestTaxSnapshots,
} from "../drizzle/schema";
import {
  type MaskedCommunicationChannel,
  sanitizeMaskedMessageContent,
} from "./communications/MaskedCommunicationService";
import {
  decidePaymentProviderOperationalStatus,
  type PaymentProviderId,
  type PaymentProviderOperationalRecord,
  type PaymentProviderOperationalStatus,
} from "./payments/ProviderOperationalPolicy";
import { quoteTurkeyVat } from "./tax/TurkeyVatPolicy";
import { EncryptionService } from "./_core/security";
import { assertCapabilityTransition, assertServiceRequestCapabilityContext, evaluateCapabilityTransition } from "./compliance/CapabilityTransitionGuard";
import {
  assertCredentialEligibility,
  evaluateCredentialEligibility,
  type CredentialAssurance,
} from "./compliance/CredentialEligibilityGuard";

export type OrganizationType = "corporate" | "fleet" | "facility";
export type OrganizationMemberRole = "owner" | "admin" | "member";

export type ServiceRequestComplianceContext = {
  jurisdictionId: number | null;
  requiredCapabilityId: number | null;
  requiredCredentialType: string | null;
  requiredCredentialAssurance: CredentialAssurance | null;
  requiresCredentialHumanReview: number | null;
  compliancePackageVersion: string | null;
};

/**
 * Resolves the compliance context from server-owned catalog and enabled legal
 * package data. Client input can select a country, but can never select or
 * waive a capability requirement.
 */
export async function resolveServiceRequestComplianceContext(input: {
  categoryId: number;
  subcategoryId?: number;
  countryCode?: string;
  now?: Date;
}): Promise<ServiceRequestComplianceContext> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");

  const countryCode = (input.countryCode ?? "TR").trim().toUpperCase();
  const now = input.now ?? new Date();
  const jurisdictionRows = await db
    .select({ id: jurisdictions.id, regionCode: jurisdictions.regionCode })
    .from(jurisdictions)
    .where(and(eq(jurisdictions.countryCode, countryCode), eq(jurisdictions.status, "active")));
  const jurisdiction = jurisdictionRows.find((row) => row.regionCode === null) ?? jurisdictionRows[0];
  if (!jurisdiction) {
    return {
      jurisdictionId: null,
      requiredCapabilityId: null,
      requiredCredentialType: null,
      requiredCredentialAssurance: null,
      requiresCredentialHumanReview: null,
      compliancePackageVersion: null,
    };
  }

  const packages = await db
    .select({ id: jurisdictionCompliancePackages.id, version: jurisdictionCompliancePackages.version, effectiveFrom: jurisdictionCompliancePackages.effectiveFrom, effectiveTo: jurisdictionCompliancePackages.effectiveTo })
    .from(jurisdictionCompliancePackages)
    .where(and(eq(jurisdictionCompliancePackages.jurisdictionId, jurisdiction.id), eq(jurisdictionCompliancePackages.status, "enabled")))
    .orderBy(desc(jurisdictionCompliancePackages.updatedAt), desc(jurisdictionCompliancePackages.id));
  const compliancePackage = packages.find((candidate) =>
    (candidate.effectiveFrom === null || candidate.effectiveFrom <= now) &&
    (candidate.effectiveTo === null || candidate.effectiveTo > now),
  );
  if (!compliancePackage) {
    return {
      jurisdictionId: jurisdiction.id,
      requiredCapabilityId: null,
      requiredCredentialType: null,
      requiredCredentialAssurance: null,
      requiresCredentialHumanReview: null,
      compliancePackageVersion: null,
    };
  }

  const categoryCapabilities = await db
    .select({ id: serviceCapabilities.id, subcategoryId: serviceCapabilities.subcategoryId })
    .from(serviceCapabilities)
    .where(and(eq(serviceCapabilities.categoryId, input.categoryId), eq(serviceCapabilities.status, "active")));
  const capability =
    (input.subcategoryId == null
      ? undefined
      : categoryCapabilities.find((candidate) => candidate.subcategoryId === input.subcategoryId)) ??
    categoryCapabilities.find((candidate) => candidate.subcategoryId === null);
  if (!capability) {
    return {
      jurisdictionId: jurisdiction.id,
      requiredCapabilityId: null,
      requiredCredentialType: null,
      requiredCredentialAssurance: null,
      requiresCredentialHumanReview: null,
      compliancePackageVersion: compliancePackage.version,
    };
  }

  const ruleRows = await db
    .select({
      ruleStatus: capabilityJurisdictionRules.ruleStatus,
      requiredCredentialType: capabilityJurisdictionRules.requiredCredentialType,
      minimumAssurance: capabilityJurisdictionRules.minimumAssurance,
      requiresHumanReview: capabilityJurisdictionRules.requiresHumanReview,
    })
    .from(capabilityJurisdictionRules)
    .where(and(eq(capabilityJurisdictionRules.packageId, compliancePackage.id), eq(capabilityJurisdictionRules.capabilityId, capability.id)))
    .limit(1);
  const rule = ruleRows[0];
  // Any absent/unknown/prohibited rule is retained as a requirement. It will
  // subsequently block provider transitions instead of allowing a silent bypass.
  const requiredCapabilityId = rule?.ruleStatus === "not_required" ? null : capability.id;
  return {
    jurisdictionId: jurisdiction.id,
    requiredCapabilityId,
    requiredCredentialType: rule?.ruleStatus === "required" ? rule.requiredCredentialType : null,
    requiredCredentialAssurance:
      rule?.ruleStatus === "required" && rule.requiredCredentialType !== null
        ? rule.minimumAssurance
        : null,
    requiresCredentialHumanReview:
      rule?.ruleStatus === "required" && rule.requiredCredentialType !== null
        ? rule.requiresHumanReview
        : null,
    compliancePackageVersion: compliancePackage.version,
  };
}

export function assertProviderCapabilityForRequest(input: {
  request: Pick<ServiceRequestComplianceContext, "jurisdictionId" | "requiredCapabilityId">;
  capabilityStatuses: Array<{
    capabilityId: number;
    jurisdictionId: number;
    status: "VERIFIED" | "VERIFIED_LIMITED_SCOPE" | "MANUAL_REVIEW" | "REJECTED" | "EXPIRED_OR_SUSPENDED" | "LEGAL_REVIEW_REQUIRED";
    expiresAt: Date | null;
  }>;
  now?: Date;
}): void {
  const capabilityStatus = input.request.requiredCapabilityId == null || input.request.jurisdictionId == null
    ? null
    : input.capabilityStatuses.find((candidate) =>
        candidate.capabilityId === input.request.requiredCapabilityId &&
        candidate.jurisdictionId === input.request.jurisdictionId,
      ) ?? null;
  assertCapabilityTransition({
    enforcementEnabled: input.request.requiredCapabilityId !== null,
    requiredCapabilityId: input.request.requiredCapabilityId,
    jurisdictionId: input.request.jurisdictionId,
    providerCapabilityDecision: capabilityStatus?.status ?? null,
    providerCapabilityExpiresAt: capabilityStatus?.expiresAt ?? null,
    now: input.now,
  });
}

export function assertProviderCredentialForRequest(input: {
  request: Pick<
    ServiceRequestComplianceContext,
    | "jurisdictionId"
    | "requiredCredentialType"
    | "requiredCredentialAssurance"
    | "requiresCredentialHumanReview"
    | "compliancePackageVersion"
  >;
  providerCredentials: Array<{
    jurisdictionId: number;
    credentialType: string;
    assuranceLevel: CredentialAssurance;
    status: "submitted" | "verified" | "rejected" | "expired" | "suspended" | "revoked";
    expiresAt: Date | null;
    verifiedAt: Date | null;
    reviewedByUserId: number | null;
    revocationStatus: "unknown" | "clear" | "revoked" | "check_failed";
    ruleVersion: string | null;
  }>;
  now?: Date;
}): void {
  assertCredentialEligibility({
    requiredCredentialType: input.request.requiredCredentialType,
    minimumAssurance: input.request.requiredCredentialAssurance,
    requiresHumanReview:
      input.request.requiresCredentialHumanReview == null
        ? null
        : input.request.requiresCredentialHumanReview === 1,
    compliancePackageVersion: input.request.compliancePackageVersion,
    jurisdictionId: input.request.jurisdictionId,
    providerCredentials: input.providerCredentials,
    now: input.now,
  });
}

async function getOrganizationAccess(input: { organizationId: number; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ organization: organizations, member: organizationMembers })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(
      and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, input.userId),
        isNotNull(organizationMembers.joinedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row || row.organization.status !== "active") throw new Error("ORGANIZATION_ACCESS_FORBIDDEN");
  return row;
}

export async function assertOrganizationRequestAccess(input: { organizationId: number; userId: number }) {
  return getOrganizationAccess(input);
}

export async function canAccessOrganizationRequest(input: { organizationId: number; userId: number }) {
  try {
    await getOrganizationAccess(input);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === "ORGANIZATION_ACCESS_FORBIDDEN") return false;
    throw error;
  }
}

export async function createOrganization(input: {
  ownerId: number;
  name: string;
  taxId?: string;
  type: OrganizationType;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const result = await tx.insert(organizations).values({
      ownerId: input.ownerId,
      name: input.name,
      taxId: input.taxId ?? null,
      type: input.type,
      status: "active",
    });
    const organizationId = result[0].insertId;
    await tx.insert(organizationMembers).values({
      organizationId,
      userId: input.ownerId,
      role: "owner",
      invitedByUserId: input.ownerId,
      joinedAt: new Date(),
    });
    return organizationId;
  });
}

export async function listOrganizationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ organization: organizations, member: organizationMembers })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, userId), isNotNull(organizationMembers.joinedAt)))
    .orderBy(desc(organizations.updatedAt), desc(organizations.id));
  return rows.filter((row) => row.organization.status === "active").map((row) => ({
    ...row.organization,
    memberRole: row.member.role,
    joinedAt: row.member.joinedAt,
  }));
}

export async function listOrganizationInvitations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ organization: organizations, member: organizationMembers })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, userId), isNull(organizationMembers.joinedAt)))
    .orderBy(desc(organizationMembers.invitedAt));
  return rows.filter((row) => row.organization.status === "active").map((row) => ({
    organizationId: row.organization.id,
    organizationName: row.organization.name,
    organizationType: row.organization.type,
    role: row.member.role,
    invitedAt: row.member.invitedAt,
  }));
}

export async function listOrganizationMembers(input: { organizationId: number; actorUserId: number }) {
  await getOrganizationAccess({ organizationId: input.organizationId, userId: input.actorUserId });
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      invitedAt: organizationMembers.invitedAt,
      joinedAt: organizationMembers.joinedAt,
      name: users.name,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, input.organizationId))
    .orderBy(organizationMembers.role, organizationMembers.createdAt);
}

function canManageOrganizationMembers(role: OrganizationMemberRole) {
  return role === "owner" || role === "admin";
}

export async function inviteOrganizationMember(input: {
  organizationId: number;
  actorUserId: number;
  userId: number;
  role: Exclude<OrganizationMemberRole, "owner">;
}) {
  if (input.actorUserId === input.userId) throw new Error("ORGANIZATION_SELF_INVITE_FORBIDDEN");
  const access = await getOrganizationAccess({ organizationId: input.organizationId, userId: input.actorUserId });
  if (!canManageOrganizationMembers(access.member.role)) throw new Error("ORGANIZATION_MEMBER_MANAGEMENT_FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const target = await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!target[0]) throw new Error("ORGANIZATION_INVITEE_NOT_FOUND");
  const result = await db.insert(organizationMembers).values({
    organizationId: input.organizationId,
    userId: input.userId,
    role: input.role,
    invitedByUserId: input.actorUserId,
  });
  return result[0].insertId;
}

export async function acceptOrganizationInvitation(input: { organizationId: number; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(organizationMembers)
    .set({ joinedAt: new Date() })
    .where(
      and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, input.userId),
        isNull(organizationMembers.joinedAt),
      ),
    );
  if (result[0].affectedRows !== 1) throw new Error("ORGANIZATION_INVITATION_NOT_FOUND");
  return { organizationId: input.organizationId, joinedAt: new Date() };
}

export async function updateOrganizationMemberRole(input: {
  organizationId: number;
  actorUserId: number;
  userId: number;
  role: Exclude<OrganizationMemberRole, "owner">;
}) {
  const access = await getOrganizationAccess({ organizationId: input.organizationId, userId: input.actorUserId });
  if (access.member.role !== "owner") throw new Error("ORGANIZATION_OWNER_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const member = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, input.organizationId), eq(organizationMembers.userId, input.userId)))
    .limit(1);
  if (!member[0]) throw new Error("ORGANIZATION_MEMBER_NOT_FOUND");
  if (member[0].role === "owner") throw new Error("ORGANIZATION_OWNER_ROLE_IMMUTABLE");
  await db
    .update(organizationMembers)
    .set({ role: input.role })
    .where(eq(organizationMembers.id, member[0].id));
  return { organizationId: input.organizationId, userId: input.userId, role: input.role };
}

export async function archiveOrganization(input: { organizationId: number; actorUserId: number }) {
  const access = await getOrganizationAccess({ organizationId: input.organizationId, userId: input.actorUserId });
  if (access.member.role !== "owner") throw new Error("ORGANIZATION_OWNER_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(organizations).set({ status: "archived" }).where(eq(organizations.id, input.organizationId));
  return { organizationId: input.organizationId, status: "archived" as const };
}

export async function hasActiveSuperAdminRole(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const row = await db
    .select({ id: adminRoles.id })
    .from(adminRoles)
    .where(and(eq(adminRoles.userId, userId), eq(adminRoles.role, "super_admin"), isNull(adminRoles.revokedAt)))
    .limit(1);
  return Boolean(row[0]);
}

export async function listActiveSuperAdmins() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ userId: adminRoles.userId, name: users.name, email: users.email, grantedAt: adminRoles.grantedAt })
    .from(adminRoles)
    .innerJoin(users, eq(users.id, adminRoles.userId))
    .where(and(eq(adminRoles.role, "super_admin"), isNull(adminRoles.revokedAt)))
    .orderBy(desc(adminRoles.grantedAt));
}

export async function grantSuperAdminRole(input: { actorUserId: number; userId: number }) {
  if (!(await hasActiveSuperAdminRole(input.actorUserId))) throw new Error("SUPER_ADMIN_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const target = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!target[0]) throw new Error("SUPER_ADMIN_TARGET_NOT_FOUND");
  if (target[0].role !== "admin") throw new Error("SUPER_ADMIN_TARGET_MUST_BE_ADMIN");
  const existing = await db
    .select({ id: adminRoles.id, revokedAt: adminRoles.revokedAt })
    .from(adminRoles)
    .where(and(eq(adminRoles.userId, input.userId), eq(adminRoles.role, "super_admin")))
    .limit(1);
  if (existing[0]?.revokedAt == null) return { userId: input.userId, duplicated: true };
  if (existing[0]) {
    await db.update(adminRoles).set({ revokedAt: null, grantedByUserId: input.actorUserId, grantedAt: new Date() }).where(eq(adminRoles.id, existing[0].id));
  } else {
    await db.insert(adminRoles).values({ userId: input.userId, role: "super_admin", grantedByUserId: input.actorUserId });
  }
  return { userId: input.userId, duplicated: false };
}

export async function revokeSuperAdminRole(input: { actorUserId: number; userId: number }) {
  if (!(await hasActiveSuperAdminRole(input.actorUserId))) throw new Error("SUPER_ADMIN_REQUIRED");
  if (input.actorUserId === input.userId) throw new Error("SUPER_ADMIN_SELF_REVOKE_FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(adminRoles)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminRoles.userId, input.userId), eq(adminRoles.role, "super_admin"), isNull(adminRoles.revokedAt)));
  if (result[0].affectedRows !== 1) throw new Error("SUPER_ADMIN_ROLE_NOT_FOUND");
  return { userId: input.userId, revoked: true };
}

// Service Categories

export type FinancialReconciliationProvider = "iyzico" | "stripe";
const DEFAULT_SETTLEMENT_COUNTRY_CODE = "TR";
const DEFAULT_SETTLEMENT_CONTRACT_TYPE = "standard";

export async function getPaymentProviderOperationalDecision(input: {
  provider: PaymentProviderId;
  countryCode: string;
  currency: string;
  now?: Date;
}) {
  const db = await getDb();
  if (!db) return decidePaymentProviderOperationalStatus(null, input.now);
  const [record] = await db
    .select()
    .from(paymentProviderWatch)
    .where(and(
      eq(paymentProviderWatch.provider, input.provider),
      eq(paymentProviderWatch.countryCode, input.countryCode.trim().toUpperCase()),
      eq(paymentProviderWatch.currency, input.currency.trim().toUpperCase()),
    ))
    .limit(1);
  return decidePaymentProviderOperationalStatus(record as PaymentProviderOperationalRecord | undefined, input.now);
}

export async function assertPaymentProviderOperational(input: {
  provider: PaymentProviderId;
  countryCode: string;
  currency: string;
}) {
  const decision = await getPaymentProviderOperationalDecision(input);
  if (!decision.allowed) {
    const error = new Error(`PAYMENT_PROVIDER_${decision.status.toUpperCase()}`);
    error.cause = decision.reason;
    throw error;
  }
  return decision;
}

export async function upsertPaymentProviderWatch(input: {
  provider: PaymentProviderId;
  countryCode: string;
  currency: string;
  status: PaymentProviderOperationalStatus;
  configVersion: string;
  healthCheckedAt?: Date | null;
  regulatoryReviewedAt?: Date | null;
  nextReviewAt?: Date | null;
  blockingReason?: string | null;
  reviewedByUserId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const values = {
    ...input,
    countryCode: input.countryCode.trim().toUpperCase(),
    currency: input.currency.trim().toUpperCase(),
    updatedAt: new Date(),
  };
  await db.insert(paymentProviderWatch).values(values).onDuplicateKeyUpdate({ set: values });
}

function isValidCompletionReviewHours(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 168;
}

type SettlementPolicyRow = typeof settlementPolicies.$inferSelect;

export type ResolvedSettlementPolicy = Pick<
  SettlementPolicyRow,
  | "id"
  | "scopeKey"
  | "countryCode"
  | "categoryId"
  | "gatewayProvider"
  | "contractType"
  | "precedence"
  | "version"
  | "commissionRateBps"
  | "completionReviewHours"
  | "cancellationPolicyJson"
>;

function parseCancellationPolicySnapshot(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("SETTLEMENT_POLICY_CANCELLATION_POLICY_INVALID");
  }
}

/**
 * Selects a prospective policy with deterministic specificity ordering.
 * Only active, time-effective policies can be selected. The caller stores the
 * returned values in an agreement snapshot, preventing later policy edits from
 * changing an accepted job.
 */
export function resolveSettlementPolicy(
  policies: SettlementPolicyRow[],
  input: {
    countryCode: string;
    categoryId: number;
    gatewayProvider?: "iyzico" | "stripe";
    contractType?: string;
    now?: Date;
  },
): ResolvedSettlementPolicy {
  const now = input.now ?? new Date();
  const contractType = input.contractType ?? DEFAULT_SETTLEMENT_CONTRACT_TYPE;
  const gatewayProvider = input.gatewayProvider ?? "any";
  const candidates = policies
    .filter(
      (policy) =>
        policy.status === "active" &&
        policy.countryCode === input.countryCode &&
        policy.contractType === contractType &&
        (policy.categoryId === null || policy.categoryId === input.categoryId) &&
        (policy.gatewayProvider === "any" || policy.gatewayProvider === gatewayProvider) &&
        policy.effectiveFrom <= now &&
        (policy.effectiveTo === null || policy.effectiveTo > now),
    )
    .sort((left, right) => {
      const score = (policy: SettlementPolicyRow) =>
        (policy.categoryId === input.categoryId ? 4 : 0) +
        (policy.gatewayProvider === gatewayProvider && gatewayProvider !== "any" ? 2 : 0) +
        (policy.contractType === contractType ? 1 : 0);
      return score(right) - score(left) || right.precedence - left.precedence || right.id - left.id;
    });
  const policy = candidates[0];
  if (!policy) throw new Error("SETTLEMENT_POLICY_NOT_FOUND");
  if (!isValidCompletionReviewHours(policy.completionReviewHours)) {
    throw new Error("AGREEMENT_COMPLETION_REVIEW_WINDOW_INVALID");
  }
  if (!Number.isInteger(policy.commissionRateBps) || policy.commissionRateBps < 0 || policy.commissionRateBps > 10_000) {
    throw new Error("SETTLEMENT_POLICY_COMMISSION_RATE_INVALID");
  }
  parseCancellationPolicySnapshot(policy.cancellationPolicyJson);
  return policy;
}

async function resolveSettlementPolicyInTransaction(
  tx: DatabaseTransaction,
  input: { categoryId: number; gatewayProvider?: "iyzico" | "stripe" },
) {
  const policyRows = await tx
    .select()
    .from(settlementPolicies)
    .where(
      and(
        eq(settlementPolicies.countryCode, DEFAULT_SETTLEMENT_COUNTRY_CODE),
        eq(settlementPolicies.status, "active"),
      ),
    );
  return resolveSettlementPolicy(policyRows, {
    countryCode: DEFAULT_SETTLEMENT_COUNTRY_CODE,
    categoryId: input.categoryId,
    gatewayProvider: input.gatewayProvider,
  });
}

function settlementPolicyScopeKey(input: {
  countryCode: string;
  categoryId?: number | null;
  gatewayProvider: "any" | "iyzico" | "stripe";
  contractType: string;
  version: string;
}) {
  return [
    input.countryCode.toUpperCase(),
    input.categoryId ?? "all",
    input.gatewayProvider,
    input.contractType.trim().toLowerCase(),
    input.version.trim(),
  ].join(":");
}

export async function listSettlementPoliciesForAdmin(input: {
  limit: number;
  offset: number;
  status?: "draft" | "active" | "retired" | "suspended";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(settlementPolicies)
    .where(input.status ? eq(settlementPolicies.status, input.status) : undefined)
    .orderBy(desc(settlementPolicies.effectiveFrom), desc(settlementPolicies.id))
    .limit(input.limit)
    .offset(input.offset);
}

export async function createSettlementPolicyForAdmin(data: {
  createdByUserId: number;
  countryCode: string;
  categoryId?: number | null;
  gatewayProvider: "any" | "iyzico" | "stripe";
  contractType: string;
  precedence: number;
  version: string;
  commissionRateBps: number;
  completionReviewHours: number;
  cancellationPolicy: Record<string, unknown>;
  status: "draft" | "active" | "suspended";
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}) {
  if (!isValidCompletionReviewHours(data.completionReviewHours)) {
    throw new Error("SETTLEMENT_POLICY_COMPLETION_REVIEW_WINDOW_INVALID");
  }
  if (!Number.isInteger(data.commissionRateBps) || data.commissionRateBps < 0 || data.commissionRateBps > 10_000) {
    throw new Error("SETTLEMENT_POLICY_COMMISSION_RATE_INVALID");
  }
  const countryCode = data.countryCode.trim().toUpperCase();
  const contractType = data.contractType.trim().toLowerCase();
  const version = data.version.trim();
  if (!/^[A-Z]{2}$/.test(countryCode) || !/^[a-z0-9_-]{1,48}$/.test(contractType) || version.length < 1 || version.length > 64) {
    throw new Error("SETTLEMENT_POLICY_INPUT_INVALID");
  }
  if (!Number.isInteger(data.precedence) || data.precedence < -10_000 || data.precedence > 10_000) {
    throw new Error("SETTLEMENT_POLICY_PRECEDENCE_INVALID");
  }
  if (!Number.isInteger(data.categoryId ?? 0) || (data.categoryId ?? 0) < 0) {
    throw new Error("SETTLEMENT_POLICY_CATEGORY_INVALID");
  }
  if (!(data.effectiveFrom instanceof Date) || Number.isNaN(data.effectiveFrom.getTime())) {
    throw new Error("SETTLEMENT_POLICY_EFFECTIVE_FROM_INVALID");
  }
  if (data.effectiveTo && data.effectiveTo <= data.effectiveFrom) {
    throw new Error("SETTLEMENT_POLICY_EFFECTIVE_TO_INVALID");
  }
  const cancellationPolicyJson = JSON.stringify(data.cancellationPolicy);
  parseCancellationPolicySnapshot(cancellationPolicyJson);
  const scopeKey = settlementPolicyScopeKey({
    countryCode,
    categoryId: data.categoryId ?? null,
    gatewayProvider: data.gatewayProvider,
    contractType,
    version,
  });
  if (scopeKey.length > 191) throw new Error("SETTLEMENT_POLICY_SCOPE_KEY_INVALID");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const inserted = await db.insert(settlementPolicies).values({
    scopeKey,
    countryCode,
    categoryId: data.categoryId ?? null,
    gatewayProvider: data.gatewayProvider,
    contractType,
    precedence: data.precedence,
    version,
    commissionRateBps: data.commissionRateBps,
    completionReviewHours: data.completionReviewHours,
    cancellationPolicyJson,
    status: data.status,
    effectiveFrom: data.effectiveFrom,
    effectiveTo: data.effectiveTo ?? null,
    createdByUserId: data.createdByUserId,
  });
  const id = Number(inserted[0].insertId);
  if (!id) throw new Error("SETTLEMENT_POLICY_CREATE_FAILED");
  const rows = await db.select().from(settlementPolicies).where(eq(settlementPolicies.id, id)).limit(1);
  if (!rows[0]) throw new Error("SETTLEMENT_POLICY_CREATE_FAILED");
  return rows[0];
}

/** Policies are never edited in-place after publication; retire and create a successor instead. */
export async function retireSettlementPolicyForAdmin(data: { policyId: number; retiredByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const updated = await db
    .update(settlementPolicies)
    .set({ status: "retired", effectiveTo: now })
    .where(and(eq(settlementPolicies.id, data.policyId), inArray(settlementPolicies.status, ["draft", "active", "suspended"])));
  if ((updated[0]?.affectedRows ?? 0) !== 1) throw new Error("SETTLEMENT_POLICY_NOT_RETIRABLE");
  return { success: true, policyId: data.policyId, retiredByUserId: data.retiredByUserId };
}

export type ReconciliationPaymentCandidate = {
  id: number;
  requestId: number;
  amount: number;
  status: "pending" | "held" | "released" | "refunded";
  gatewayProvider: FinancialReconciliationProvider;
  gatewayPaymentId: string;
  ledgerIdempotencyKeys: string[];
};

/**
 * Resolves the mandatory journal event(s) for an internally settled payment.
 * This is deliberately pure so reconciliation and regression tests share one
 * source of truth without treating the wallet snapshot as accounting truth.
 */
export function expectedLedgerIdempotencyKeysForPayment(input: {
  id: number;
  status: "pending" | "held" | "released" | "refunded";
}) {
  if (input.status === "held") return [`ledger:payment:${input.id}:held`];
  if (input.status === "released") {
    return [`ledger:payment:${input.id}:held`, `ledger:payment:${input.id}:released`];
  }
  if (input.status === "refunded") {
    return [`ledger:payment:${input.id}:held`, `ledger:payment:${input.id}:refunded`];
  }
  return [];
}

export async function startFinancialReconciliationRun(provider: FinancialReconciliationProvider) {
  const db = await getDb();
  if (!db) throw new Error("FINANCIAL_RECONCILIATION_DATABASE_UNAVAILABLE");
  const result = await db.insert(financialReconciliationRuns).values({ provider, status: "running" });
  const id = Number(result[0].insertId);
  if (!id) throw new Error("FINANCIAL_RECONCILIATION_RUN_CREATE_FAILED");
  return id;
}

export async function getFinancialReconciliationCandidates(
  provider: FinancialReconciliationProvider,
): Promise<ReconciliationPaymentCandidate[]> {
  const db = await getDb();
  if (!db) throw new Error("FINANCIAL_RECONCILIATION_DATABASE_UNAVAILABLE");

  const paymentRows = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.gatewayProvider, provider),
        isNotNull(payments.gatewayPaymentId),
        inArray(payments.status, ["held", "released", "refunded"]),
      ),
    );
  if (paymentRows.length === 0) return [];

  const ledgerRows = await db
    .select({ paymentId: financialLedgerEntries.paymentId, idempotencyKey: financialLedgerEntries.idempotencyKey })
    .from(financialLedgerEntries)
    .where(inArray(financialLedgerEntries.paymentId, paymentRows.map((payment) => payment.id)));
  const keysByPayment = new Map<number, string[]>();
  for (const row of ledgerRows) {
    if (row.paymentId === null) continue;
    keysByPayment.set(row.paymentId, [...(keysByPayment.get(row.paymentId) ?? []), row.idempotencyKey]);
  }

  return paymentRows.flatMap((payment) => {
    if (!payment.gatewayPaymentId || !payment.gatewayProvider) return [];
    return [{
      id: payment.id,
      requestId: payment.requestId,
      amount: payment.amount,
      status: payment.status,
      gatewayProvider: payment.gatewayProvider,
      gatewayPaymentId: payment.gatewayPaymentId,
      ledgerIdempotencyKeys: keysByPayment.get(payment.id) ?? [],
    }];
  });
}

export async function createFinancialReconciliationAlert(input: {
  runId: number;
  paymentId?: number;
  externalReference?: string;
  details: Record<string, unknown>;
  severity?: "warning" | "critical";
}) {
  const db = await getDb();
  if (!db) throw new Error("FINANCIAL_RECONCILIATION_DATABASE_UNAVAILABLE");
  await db.insert(financialReconciliationAlerts).values({
    runId: input.runId,
    paymentId: input.paymentId ?? null,
    externalReference: input.externalReference ?? null,
    severity: input.severity ?? "critical",
    code: "FINANCIAL_RECONCILIATION_ALERT",
    details: JSON.stringify(input.details),
  });
}

export async function completeFinancialReconciliationRun(input: {
  runId: number;
  checkedCount: number;
  mismatchCount: number;
  error?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("FINANCIAL_RECONCILIATION_DATABASE_UNAVAILABLE");
  await db
    .update(financialReconciliationRuns)
    .set({
      completedAt: new Date(),
      status: input.error ? "failed" : "completed",
      checkedCount: input.checkedCount,
      mismatchCount: input.mismatchCount,
      error: input.error?.slice(0, 4_000) ?? null,
    })
    .where(eq(financialReconciliationRuns.id, input.runId));
}
export async function getActiveServiceCategories() {
  const db = await getDb();
  if (!db) return [];
  const [categories, subcategories] = await Promise.all([
    db
    .select({
      id: serviceCategories.id,
      name: serviceCategories.name,
      slug: serviceCategories.slug,
      icon: serviceCategories.icon,
      color: serviceCategories.color,
      pricingType: serviceCategories.pricingType,
      kmRate: serviceCategories.kmRate,
      basePrice: serviceCategories.basePrice,
      sortOrder: serviceCategories.sortOrder,
      createdAt: serviceCategories.createdAt,
      professionalCount: sql<number>`count(${providers.id})`,
    })
    .from(serviceCategories)
    .leftJoin(providers, eq(providers.categoryId, serviceCategories.id))
    .where(eq(serviceCategories.isActive, 1))
    .groupBy(serviceCategories.id)
    .orderBy(serviceCategories.sortOrder, serviceCategories.id),
    db
      .select({
        id: serviceSubcategories.id,
        categoryId: serviceSubcategories.categoryId,
        name: serviceSubcategories.name,
        slug: serviceSubcategories.slug,
        description: serviceSubcategories.description,
        sortOrder: serviceSubcategories.sortOrder,
      })
      .from(serviceSubcategories)
      .where(eq(serviceSubcategories.isActive, 1))
      .orderBy(serviceSubcategories.categoryId, serviceSubcategories.sortOrder, serviceSubcategories.id),
  ]);

  const subcategoriesByCategory = new Map<number, typeof subcategories>();
  for (const subcategory of subcategories) {
    const current = subcategoriesByCategory.get(subcategory.categoryId) ?? [];
    current.push(subcategory);
    subcategoriesByCategory.set(subcategory.categoryId, current);
  }

  return categories.map((category) => ({
    ...category,
    subcategories: subcategoriesByCategory.get(category.id) ?? [],
  }));
}

export async function getServiceCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(serviceCategories)
    .where(and(eq(serviceCategories.slug, slug), eq(serviceCategories.isActive, 1)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActiveServiceSubcategories(categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  const condition = categoryId == null
    ? eq(serviceSubcategories.isActive, 1)
    : and(
        eq(serviceSubcategories.categoryId, categoryId),
        eq(serviceSubcategories.isActive, 1),
      );
  return db
    .select()
    .from(serviceSubcategories)
    .where(condition)
    .orderBy(serviceSubcategories.categoryId, serviceSubcategories.sortOrder, serviceSubcategories.id);
}

export async function getMoveOsDashboardMetrics() {
  const db = await getDb();
  if (!db) throw new Error("MOVEOS_DATABASE_UNAVAILABLE");

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [paymentTotals, dailyPaymentTotals, userTotals, requestTotals] = await Promise.all([
    db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} IN ('held', 'released') THEN ${payments.amount} ELSE 0 END), 0)`,
        commissionRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'released' THEN ${payments.commissionAmount} ELSE 0 END), 0)`,
        pendingPayments: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'held' THEN ${payments.amount} ELSE 0 END), 0)`,
      })
      .from(payments),
    db
      .select({
        dailyRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} IN ('held', 'released') THEN ${payments.amount} ELSE 0 END), 0)`,
      })
      .from(payments)
      .where(gte(payments.createdAt, dayStart)),
    db
      .select({
        activeUsers: sql<number>`COUNT(DISTINCT ${users.id})`,
        activeProviders: sql<number>`COUNT(DISTINCT CASE WHEN ${providers.isAvailable} = 1 THEN ${providers.id} END)`,
      })
      .from(users)
      .leftJoin(providers, eq(providers.userId, users.id)),
    db
      .select({
        dailyOrders: sql<number>`COALESCE(SUM(CASE WHEN ${serviceRequests.createdAt} >= ${dayStart} THEN 1 ELSE 0 END), 0)`,
      })
      .from(serviceRequests),
  ]);

  const totals = paymentTotals[0];
  const daily = dailyPaymentTotals[0];
  const usersSummary = userTotals[0];
  const requests = requestTotals[0];
  const pendingPayments = Number(totals?.pendingPayments ?? 0);

  return {
    dailyRevenue: Number(daily?.dailyRevenue ?? 0),
    totalRevenue: Number(totals?.totalRevenue ?? 0),
    commissionRevenue: Number(totals?.commissionRevenue ?? 0),
    pendingPayments,
    activeUsers: Number(usersSummary?.activeUsers ?? 0),
    activeProviders: Number(usersSummary?.activeProviders ?? 0),
    dailyOrders: Number(requests?.dailyOrders ?? 0),
    systemStatus: "healthy" as const,
    risks:
      pendingPayments > 0
        ? [`${pendingPayments} TRY tutarında serbest bırakılmayı bekleyen escrow mevcut.`]
        : [],
    recommendations: [],
  };
}

export type MoveOsUserRole = "admin" | "customer" | "provider";

export async function listMoveOsUsers(input: {
  role?: MoveOsUserRole;
  search?: string;
  limit: number;
  offset: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("MOVEOS_DATABASE_UNAVAILABLE");

  const conditions = [];
  if (input.role === "admin") {
    conditions.push(eq(users.role, "admin"));
  } else if (input.role === "provider") {
    conditions.push(isNotNull(providers.id));
  } else if (input.role === "customer") {
    conditions.push(and(eq(users.role, "user"), isNull(providers.id)));
  }
  const normalizedSearch = input.search?.trim();
  if (normalizedSearch) {
    const pattern = `%${normalizedSearch.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(like(users.name, pattern), like(users.email, pattern), like(users.phone, pattern)));
  }
  const condition = conditions.length > 0 ? and(...conditions) : undefined;
  const query = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      systemRole: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      providerId: providers.id,
      rating: providers.rating,
      completedJobs: providers.completedJobs,
      verificationStatus: providers.verificationStatus,
    })
    .from(users)
    .leftJoin(providers, eq(providers.userId, users.id));
  const countQuery = db
    .select({ total: sql<number>`COUNT(*)` })
    .from(users)
    .leftJoin(providers, eq(providers.userId, users.id));
  const [rows, counts] = await Promise.all([
    condition
      ? query.where(condition).limit(input.limit).offset(input.offset)
      : query.limit(input.limit).offset(input.offset),
    condition ? countQuery.where(condition) : countQuery,
  ]);

  return {
    total: Number(counts[0]?.total ?? 0),
    users: rows.map((row) => ({
      id: row.id,
      email: row.email,
      phone: row.phone,
      name: row.name,
      role: row.systemRole === "admin" ? "admin" : row.providerId ? "provider" : "customer",
      createdAt: row.createdAt,
      lastSignedIn: row.lastSignedIn,
      rating: row.rating,
      completedJobs: row.completedJobs,
      verificationStatus: row.verificationStatus,
    })),
  };
}

export async function getMoveOsUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("MOVEOS_DATABASE_UNAVAILABLE");
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      systemRole: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      providerId: providers.id,
      displayName: providers.displayName,
      rating: providers.rating,
      completedJobs: providers.completedJobs,
      verificationStatus: providers.verificationStatus,
    })
    .from(users)
    .leftJoin(providers, eq(providers.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    role: row.systemRole === "admin" ? "admin" : row.providerId ? "provider" : "customer",
  };
}

export async function updateMoveOsUser(input: {
  userId: number;
  name?: string;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("MOVEOS_DATABASE_UNAVAILABLE");
  const existing = await getMoveOsUser(input.userId);
  if (!existing) return null;
  const changes: Partial<typeof users.$inferInsert> = {};
  if (input.name !== undefined) changes.name = input.name;
  if (input.role !== undefined) changes.role = input.role;
  if (Object.keys(changes).length === 0) return existing;
  await db.update(users).set(changes).where(eq(users.id, input.userId));
  return getMoveOsUser(input.userId);
}

export async function listMoveOsCategories() {
  const db = await getDb();
  if (!db) throw new Error("MOVEOS_DATABASE_UNAVAILABLE");
  return db
    .select({
      id: serviceCategories.id,
      name: serviceCategories.name,
      slug: serviceCategories.slug,
      icon: serviceCategories.icon,
      color: serviceCategories.color,
      pricingType: serviceCategories.pricingType,
      kmRate: serviceCategories.kmRate,
      basePrice: serviceCategories.basePrice,
      isActive: serviceCategories.isActive,
      sortOrder: serviceCategories.sortOrder,
      createdAt: serviceCategories.createdAt,
      professionalCount: sql<number>`COUNT(${providers.id})`,
    })
    .from(serviceCategories)
    .leftJoin(providers, eq(providers.categoryId, serviceCategories.id))
    .groupBy(serviceCategories.id)
    .orderBy(serviceCategories.sortOrder, serviceCategories.id);
}

export async function createMoveOsCategory(input: {
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  pricingType: "fixed" | "km_based" | "hourly";
  kmRate?: number | null;
  basePrice?: number | null;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("MOVEOS_DATABASE_UNAVAILABLE");
  const result = await db.insert(serviceCategories).values({
    ...input,
    isActive: 1,
    sortOrder: input.sortOrder ?? 0,
  });
  const rows = await db
    .select()
    .from(serviceCategories)
    .where(eq(serviceCategories.id, Number(result[0].insertId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateMoveOsCategory(input: {
  categoryId: number;
  name?: string;
  slug?: string;
  icon?: string | null;
  color?: string | null;
  pricingType?: "fixed" | "km_based" | "hourly";
  kmRate?: number | null;
  basePrice?: number | null;
  isActive?: number;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("MOVEOS_DATABASE_UNAVAILABLE");
  const { categoryId, ...changes } = input;
  if (Object.keys(changes).length > 0) {
    await db.update(serviceCategories).set(changes).where(eq(serviceCategories.id, categoryId));
  }
  const rows = await db
    .select()
    .from(serviceCategories)
    .where(eq(serviceCategories.id, categoryId))
    .limit(1);
  return rows[0] ?? null;
}

export async function archiveMoveOsCategory(categoryId: number) {
  return updateMoveOsCategory({ categoryId, isActive: 0 });
}

export async function listMoveOsServices(input: { limit: number; offset: number }) {
  const db = await getDb();
  if (!db) throw new Error("MOVEOS_DATABASE_UNAVAILABLE");
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: serviceRequests.id,
        title: serviceRequests.title,
        status: serviceRequests.status,
        categoryName: serviceCategories.name,
        customerName: users.name,
        assignedProviderId: serviceRequests.assignedProviderId,
        estimatedPrice: serviceRequests.estimatedPrice,
        createdAt: serviceRequests.createdAt,
      })
      .from(serviceRequests)
      .leftJoin(serviceCategories, eq(serviceCategories.id, serviceRequests.categoryId))
      .leftJoin(users, eq(users.id, serviceRequests.userId))
      .orderBy(desc(serviceRequests.createdAt))
      .limit(input.limit)
      .offset(input.offset),
    db.select({ total: sql<number>`COUNT(*)` }).from(serviceRequests),
  ]);
  return { total: Number(totalRows[0]?.total ?? 0), services: rows };
}

export async function getMoveOsService(serviceId: number) {
  const db = await getDb();
  if (!db) throw new Error("MOVEOS_DATABASE_UNAVAILABLE");
  const rows = await db
    .select({
      id: serviceRequests.id,
      title: serviceRequests.title,
      description: serviceRequests.description,
      status: serviceRequests.status,
      categoryName: serviceCategories.name,
      customerId: serviceRequests.userId,
      customerName: users.name,
      assignedProviderId: serviceRequests.assignedProviderId,
      estimatedPrice: serviceRequests.estimatedPrice,
      budgetMin: serviceRequests.budgetMin,
      budgetMax: serviceRequests.budgetMax,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt,
    })
    .from(serviceRequests)
    .leftJoin(serviceCategories, eq(serviceCategories.id, serviceRequests.categoryId))
    .leftJoin(users, eq(users.id, serviceRequests.userId))
    .where(eq(serviceRequests.id, serviceId))
    .limit(1);
  return rows[0] ?? null;
}

// Service Requests
export type ServiceRequestType =
  | "generic"
  | "painting"
  | "electrical"
  | "plumbing"
  | "cleaning"
  | "moving"
  | "courier"
  | "tow_truck"
  | "roadside";

export type ServiceRequestDetailsInput = {
  subcategoryId?: number;
  serviceType: ServiceRequestType;
  pickupAddress?: string;
  destinationAddress?: string;
  pickupLatitude?: string;
  pickupLongitude?: string;
  destinationLatitude?: string;
  destinationLongitude?: string;
  pickupFloor?: number;
  destinationFloor?: number;
  pickupHasElevator?: boolean;
  destinationHasElevator?: boolean;
  distanceKm?: number;
  attributes: Record<string, string | number | boolean | null>;
};

export async function createServiceRequest(data: {
  userId: number;
  organizationId?: number;
  categoryId: number;
  countryCode?: string;
  title: string;
  description?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  budgetMin?: number;
  budgetMax?: number;
  distanceKm?: number;
  estimatedPrice?: number;
  details?: ServiceRequestDetailsInput;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.organizationId != null) {
    await assertOrganizationRequestAccess({ organizationId: data.organizationId, userId: data.userId });
  }
  const complianceContext = await resolveServiceRequestComplianceContext({
    categoryId: data.categoryId,
    subcategoryId: data.details?.subcategoryId,
    countryCode: data.countryCode,
  });
  assertServiceRequestCapabilityContext({
    enforcementEnabled: complianceContext.requiredCapabilityId !== null,
    requiredCapabilityId: complianceContext.requiredCapabilityId,
    jurisdictionId: complianceContext.jurisdictionId,
  });
  const { details, countryCode: _countryCode, ...requestData } = data;
  return db.transaction(async (tx) => {
    const result = await tx.insert(serviceRequests).values({ ...requestData, ...complianceContext });
    const requestId = result[0].insertId;
    if (details) {
      await tx.insert(serviceRequestDetails).values({
        requestId,
        subcategoryId: details.subcategoryId,
        serviceType: details.serviceType,
        pickupAddress: details.pickupAddress,
        destinationAddress: details.destinationAddress,
        pickupLatitude: details.pickupLatitude,
        pickupLongitude: details.pickupLongitude,
        destinationLatitude: details.destinationLatitude,
        destinationLongitude: details.destinationLongitude,
        pickupFloor: details.pickupFloor,
        destinationFloor: details.destinationFloor,
        pickupHasElevator: details.pickupHasElevator == null ? undefined : Number(details.pickupHasElevator),
        destinationHasElevator:
          details.destinationHasElevator == null ? undefined : Number(details.destinationHasElevator),
        distanceKm: details.distanceKm,
        attributesJson: JSON.stringify(details.attributes),
      });
    }
    return requestId;
  });
}

function parseRequestAttributes(value: string): Record<string, string | number | boolean | null> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string | number | boolean | null>;
    }
  } catch {
    // Legacy or externally modified data is returned as an empty, safe object.
  }
  return {};
}

export async function getServiceRequestDetails(requestId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(serviceRequestDetails)
    .where(eq(serviceRequestDetails.requestId, requestId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    pickupHasElevator: row.pickupHasElevator == null ? null : row.pickupHasElevator === 1,
    destinationHasElevator:
      row.destinationHasElevator == null ? null : row.destinationHasElevator === 1,
    attributes: parseRequestAttributes(row.attributesJson),
    attributesJson: undefined,
  };
}

export async function getServiceRequestMedia(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(serviceRequestMedia)
    .where(eq(serviceRequestMedia.requestId, requestId))
    .orderBy(serviceRequestMedia.createdAt, serviceRequestMedia.id);
  return rows.map((row) => ({
    id: row.id,
    mediaRef: row.publicId,
    purpose: row.purpose,
    kind: row.kind,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  }));
}

export async function createServiceRequestMedia(data: {
  publicId: string;
  requestId: number;
  ownerUserId: number;
  purpose: "request" | "before" | "after" | "completion" | "dispute" | "expense" | "claim";
  kind: "image" | "video" | "document" | "audio";
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(serviceRequestMedia).values(data);
  return result[0].insertId;
}

/** Resolves a storage object only for a request participant; absent and forbidden are indistinguishable. */
export async function getAuthorizedServiceRequestMedia(
  requestId: number,
  mediaRef: string,
  actorUserId: number,
) {
  const db = await getDb();
  if (!db) return null;
  const [requestRows, mediaRows] = await Promise.all([
    db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).limit(1),
    db
      .select()
      .from(serviceRequestMedia)
      .where(and(eq(serviceRequestMedia.requestId, requestId), eq(serviceRequestMedia.publicId, mediaRef)))
      .limit(1),
  ]);
  const request = requestRows[0];
  const media = mediaRows[0];
  if (!request || !media) return null;
  if (request.userId === actorUserId || media.ownerUserId === actorUserId) return media;
  const provider = await getProviderProfile(actorUserId);
  return provider && request.assignedProviderId === provider.id ? media : null;
}

export async function getUserServiceRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const organizationMemberships = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(
      and(
        eq(organizationMembers.userId, userId),
        isNotNull(organizationMembers.joinedAt),
        eq(organizations.status, "active"),
      ),
    );
  const organizationIds = organizationMemberships.map((membership) => membership.organizationId);
  const requestRows = await db
    .select()
    .from(serviceRequests)
    .where(
      organizationIds.length > 0
        ? or(eq(serviceRequests.userId, userId), inArray(serviceRequests.organizationId, organizationIds))
        : eq(serviceRequests.userId, userId),
    )
    .orderBy(desc(serviceRequests.updatedAt), desc(serviceRequests.id));

  if (requestRows.length === 0) return [];

  const categoryIds = [...new Set(requestRows.map((row) => row.categoryId))];
  const providerIds = [
    ...new Set(
      requestRows
        .map((row) => row.assignedProviderId)
        .filter((id): id is number => id != null),
    ),
  ];
  const requestIds = requestRows.map((row) => row.id);

  const [categoryRows, providerRows, acceptedOfferRows, trackingRows] = await Promise.all([
    db
      .select({ id: serviceCategories.id, name: serviceCategories.name })
      .from(serviceCategories)
      .where(inArray(serviceCategories.id, categoryIds)),
    providerIds.length
      ? db
          .select({
            id: providers.id,
            userId: providers.userId,
            displayName: providers.displayName,
          })
          .from(providers)
          .where(inArray(providers.id, providerIds))
      : Promise.resolve([]),
    db
      .select({
        requestId: offers.requestId,
        price: offers.price,
        estimatedTime: offers.estimatedTime,
      })
      .from(offers)
      .where(and(inArray(offers.requestId, requestIds), eq(offers.status, "accepted"))),
    db
      .select({
        requestId: jobTracking.requestId,
        lifecycleStatus: jobTracking.lifecycleStatus,
        etaMinutes: jobTracking.etaMinutes,
      })
      .from(jobTracking)
      .where(inArray(jobTracking.requestId, requestIds)),
  ]);

  const categoryById = new Map(categoryRows.map((row) => [row.id, row.name]));
  const providerById = new Map(providerRows.map((row) => [row.id, row]));
  const offerByRequestId = new Map(
    acceptedOfferRows.map((row) => [row.requestId, row]),
  );
  const trackingByRequestId = new Map(
    trackingRows.map((row) => [row.requestId, row]),
  );

  return requestRows.map((request) => {
    const acceptedOffer = offerByRequestId.get(request.id);
    const tracking = trackingByRequestId.get(request.id);
    return {
      ...request,
      categoryName: categoryById.get(request.categoryId) ?? null,
      providerName: request.assignedProviderId
        ? providerById.get(request.assignedProviderId)?.displayName ?? null
        : null,
      providerUserId: request.assignedProviderId
        ? providerById.get(request.assignedProviderId)?.userId ?? null
        : null,
      acceptedPrice: acceptedOffer?.price ?? null,
      estimatedTime: acceptedOffer?.estimatedTime ?? null,
      lifecycleStatus:
        tracking?.lifecycleStatus ??
        (request.status === "completed"
          ? "completed"
          : request.status === "cancelled"
            ? "cancelled"
            : request.status === "active"
              ? "scheduled"
              : null),
      etaMinutes: tracking?.etaMinutes ?? null,
    };
  });
}

export async function getServiceRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
  return rows[0] ?? null;
}

// Offers
export async function createOffer(data: {
  requestId: number;
  providerId: number;
  price: number;
  message?: string;
  estimatedTime?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const requestRows = await db
    .select({
      id: serviceRequests.id,
      jurisdictionId: serviceRequests.jurisdictionId,
      requiredCapabilityId: serviceRequests.requiredCapabilityId,
      requiredCredentialType: serviceRequests.requiredCredentialType,
      requiredCredentialAssurance: serviceRequests.requiredCredentialAssurance,
      requiresCredentialHumanReview: serviceRequests.requiresCredentialHumanReview,
      compliancePackageVersion: serviceRequests.compliancePackageVersion,
    })
    .from(serviceRequests)
    .where(eq(serviceRequests.id, data.requestId))
    .limit(1);
  const request = requestRows[0];
  if (!request) throw new Error("SERVICE_REQUEST_NOT_FOUND");
  const [capabilityStatuses, providerCredentials] = await Promise.all([
    listProviderCapabilityStatuses(data.providerId),
    listProviderCredentialStatuses(data.providerId),
  ]);
  assertProviderCapabilityForRequest({ request, capabilityStatuses });
  assertProviderCredentialForRequest({ request, providerCredentials });
  const existing = await db
    .select({ id: offers.id })
    .from(offers)
    .where(and(eq(offers.requestId, data.requestId), eq(offers.providerId, data.providerId)))
    .limit(1);
  if (existing[0]) throw new Error("Bu iş için daha önce teklif verdiniz");
  const result = await db.insert(offers).values(data);
  return result[0].insertId;
}

export async function getOfferCapabilityTransitionContext(offerId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      offerId: offers.id,
      providerId: offers.providerId,
      requestId: serviceRequests.id,
      jurisdictionId: serviceRequests.jurisdictionId,
      requiredCapabilityId: serviceRequests.requiredCapabilityId,
      requiredCredentialType: serviceRequests.requiredCredentialType,
      requiredCredentialAssurance: serviceRequests.requiredCredentialAssurance,
      requiresCredentialHumanReview: serviceRequests.requiresCredentialHumanReview,
      compliancePackageVersion: serviceRequests.compliancePackageVersion,
    })
    .from(offers)
    .innerJoin(serviceRequests, eq(serviceRequests.id, offers.requestId))
    .where(eq(offers.id, offerId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOffersForRequest(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: offers.id,
      requestId: offers.requestId,
      providerId: offers.providerId,
      providerUserId: providers.userId,
      providerName: providers.displayName,
      providerRating: providers.rating,
      providerReviewCount: sql<number>`(
        SELECT COUNT(*)
        FROM ${reviews}
        WHERE ${reviews.providerId} = ${providers.id}
      )`,
      providerCompletedJobs: providers.completedJobs,
      providerVerified: providers.isVerified,
      providerPremium: providers.isPremium,
      price: offers.price,
      message: offers.message,
      estimatedTime: offers.estimatedTime,
      status: offers.status,
      createdAt: offers.createdAt,
    })
    .from(offers)
    .innerJoin(providers, eq(offers.providerId, providers.id))
    .where(eq(offers.requestId, requestId))
    .orderBy(desc(offers.createdAt));
}

export async function getProviderOfferForRequest(requestId: number, providerId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(offers)
    .where(and(eq(offers.requestId, requestId), eq(offers.providerId, providerId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Minimal, redacted ownership context for a provider-facing AI policy preflight. */
export async function getProfessionalAiJobContext(requestId: number, providerUserId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select({
      requestId: serviceRequests.id,
      status: serviceRequests.status,
      assignedProviderUserId: providers.userId,
    })
    .from(serviceRequests)
    .leftJoin(providers, eq(serviceRequests.assignedProviderId, providers.id))
    .where(eq(serviceRequests.id, requestId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    status: row.status,
    isAssignedProvider: row.assignedProviderUserId === providerUserId,
  };
}

// Messages
export async function assertMessageParticipant(
  database: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  requestId: number,
  userId: number,
  otherUserId?: number,
): Promise<void> {
  const rows = await database
    .select({
      customerUserId: serviceRequests.userId,
      providerUserId: providers.userId,
    })
    .from(serviceRequests)
    .leftJoin(providers, eq(serviceRequests.assignedProviderId, providers.id))
    .where(eq(serviceRequests.id, requestId))
    .limit(1);
  const participants = rows[0];

  if (!participants) throw new Error("MESSAGE_REQUEST_NOT_FOUND");
  if (participants.providerUserId == null) throw new Error("MESSAGE_REQUEST_NOT_ASSIGNED");

  const participantUserIds = new Set([
    participants.customerUserId,
    participants.providerUserId,
  ]);
  if (!participantUserIds.has(userId)) throw new Error("MESSAGE_FORBIDDEN");
  if (
    otherUserId != null &&
    (!participantUserIds.has(otherUserId) || otherUserId === userId)
  ) {
    throw new Error("MESSAGE_COUNTERPARTY_FORBIDDEN");
  }
}

export async function validateMessageParticipant(
  requestId: number,
  userId: number,
  otherUserId: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertMessageParticipant(db, requestId, userId, otherUserId);
}

async function getMaskedCommunicationParticipants(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({
      customerUserId: serviceRequests.userId,
      providerUserId: providers.userId,
      status: serviceRequests.status,
    })
    .from(serviceRequests)
    .leftJoin(providers, eq(serviceRequests.assignedProviderId, providers.id))
    .where(eq(serviceRequests.id, requestId))
    .limit(1);
  const participant = rows[0];
  if (!participant) throw new Error("MASKED_COMMUNICATION_REQUEST_NOT_FOUND");
  if (participant.providerUserId == null) throw new Error("MASKED_COMMUNICATION_REQUEST_NOT_ASSIGNED");
  if (participant.status === "cancelled" || participant.status === "completed") {
    throw new Error("MASKED_COMMUNICATION_REQUEST_INACTIVE");
  }
  return { db, customerUserId: participant.customerUserId, providerUserId: participant.providerUserId };
}

export async function createMaskedCommunicationSession(input: {
  requestId: number;
  actorUserId: number;
  channel: MaskedCommunicationChannel;
}) {
  const participant = await getMaskedCommunicationParticipants(input.requestId);
  if (input.actorUserId !== participant.customerUserId && input.actorUserId !== participant.providerUserId) {
    throw new Error("MASKED_COMMUNICATION_FORBIDDEN");
  }
  const existing = await participant.db
    .select()
    .from(maskedCommunicationSessions)
    .where(and(eq(maskedCommunicationSessions.requestId, input.requestId), eq(maskedCommunicationSessions.channel, input.channel)))
    .limit(1);
  if (existing[0]) return existing[0];
  const result = await participant.db.insert(maskedCommunicationSessions).values({
    requestId: input.requestId,
    customerUserId: participant.customerUserId,
    providerUserId: participant.providerUserId,
    channel: input.channel,
    status: "not_configured",
    createdByUserId: input.actorUserId,
  });
  const row = await participant.db
    .select()
    .from(maskedCommunicationSessions)
    .where(eq(maskedCommunicationSessions.id, Number(result[0].insertId)))
    .limit(1);
  return row[0]!;
}

export async function getMaskedCommunicationSession(input: {
  requestId: number;
  actorUserId: number;
  channel: MaskedCommunicationChannel;
}) {
  await expireMaskedCommunicationSessions({ requestId: input.requestId });
  const participant = await getMaskedCommunicationParticipants(input.requestId);
  if (input.actorUserId !== participant.customerUserId && input.actorUserId !== participant.providerUserId) {
    throw new Error("MASKED_COMMUNICATION_FORBIDDEN");
  }
  const rows = await participant.db
    .select({
      id: maskedCommunicationSessions.id,
      requestId: maskedCommunicationSessions.requestId,
      channel: maskedCommunicationSessions.channel,
      status: maskedCommunicationSessions.status,
      expiresAt: maskedCommunicationSessions.expiresAt,
      releasedAt: maskedCommunicationSessions.releasedAt,
      createdAt: maskedCommunicationSessions.createdAt,
    })
    .from(maskedCommunicationSessions)
    .where(and(eq(maskedCommunicationSessions.requestId, input.requestId), eq(maskedCommunicationSessions.channel, input.channel)))
    .limit(1);
  return rows[0] ?? null;
}

export async function releaseMaskedCommunicationSession(input: {
  requestId: number;
  actorUserId: number;
  channel: MaskedCommunicationChannel;
}) {
  const participant = await getMaskedCommunicationParticipants(input.requestId);
  if (input.actorUserId !== participant.customerUserId && input.actorUserId !== participant.providerUserId) {
    throw new Error("MASKED_COMMUNICATION_FORBIDDEN");
  }
  const result = await participant.db
    .update(maskedCommunicationSessions)
    .set({ status: "released", releasedAt: new Date(), providerSessionReference: null })
    .where(and(
      eq(maskedCommunicationSessions.requestId, input.requestId),
      eq(maskedCommunicationSessions.channel, input.channel),
    ));
  if (result[0].affectedRows !== 1) throw new Error("MASKED_COMMUNICATION_SESSION_NOT_FOUND");
  return { released: true };
}

/**
 * Marks elapsed proxy sessions inactive while retaining only the minimum audit
 * record. Clearing the opaque provider reference prevents stale reuse.
 */
export async function expireMaskedCommunicationSessions(input: { requestId?: number; now?: Date } = {}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const now = input.now ?? new Date();
  const expiredCondition = and(
    inArray(maskedCommunicationSessions.status, ["pending", "active"]),
    isNotNull(maskedCommunicationSessions.expiresAt),
    lte(maskedCommunicationSessions.expiresAt, now),
  );
  const whereClause = input.requestId == null
    ? expiredCondition
    : and(eq(maskedCommunicationSessions.requestId, input.requestId), expiredCondition);
  const expired = await database
    .select({ id: maskedCommunicationSessions.id, requestId: maskedCommunicationSessions.requestId })
    .from(maskedCommunicationSessions)
    .where(whereClause);
  if (expired.length === 0) return { expiredCount: 0 };

  await database
    .update(maskedCommunicationSessions)
    .set({ status: "expired", expiredAt: now, providerSessionReference: null })
    .where(inArray(maskedCommunicationSessions.id, expired.map((row) => row.id)));
  await Promise.all(expired.map((session) => logOperationEvent({
    eventType: "masked_communication_expired",
    subjectId: session.requestId,
    payload: { sessionId: session.id },
  })));
  return { expiredCount: expired.length };
}

export async function sendMessage(data: {
  senderId: number;
  receiverId: number;
  requestId: number;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertMessageParticipant(db, data.requestId, data.senderId, data.receiverId);
  const result = await db.insert(messages).values({
    ...data,
    content: sanitizeMaskedMessageContent(data.content),
  });
  return result[0].insertId;
}

// Audio metadata lives on the message row in migration 0013. Keeping it on
// the authoritative message record means conversation authorization cannot be
// bypassed through a detached voice-message table.
export async function createVoiceMessageMetadata(data: {
  senderId: number;
  receiverId: number;
  requestId: number;
  storageKey: string;
  mediaUrl: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  sha256: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertMessageParticipant(db, data.requestId, data.senderId, data.receiverId);
  const result = await db.insert(messages).values({
    senderId: data.senderId,
    receiverId: data.receiverId,
    requestId: data.requestId,
    content: "Sesli mesaj",
    kind: "audio",
    mediaStorageKey: data.storageKey,
    mediaUrl: data.mediaUrl,
    mediaMimeType: data.mimeType,
    mediaSizeBytes: data.sizeBytes,
    mediaDurationMs: data.durationMs,
    mediaSha256: data.sha256,
  });
  return result[0].insertId;
}

export async function getVoiceMessageMetadata(messageId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: messages.id,
      requestId: messages.requestId,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      kind: messages.kind,
      storageKey: messages.mediaStorageKey,
      mediaUrl: messages.mediaUrl,
      mimeType: messages.mediaMimeType,
      sizeBytes: messages.mediaSizeBytes,
      durationMs: messages.mediaDurationMs,
      sha256: messages.mediaSha256,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.kind, "audio"), isNull(messages.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolves only the storage metadata needed to mint a short-lived download URL.
 * Callers must never return this internal record directly to a client.
 */
export async function getAuthorizedVoiceMessageStorage(
  messageId: number,
  actorUserId: number,
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: messages.id,
      requestId: messages.requestId,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      storageKey: messages.mediaStorageKey,
      mimeType: messages.mediaMimeType,
      sizeBytes: messages.mediaSizeBytes,
      durationMs: messages.mediaDurationMs,
    })
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.kind, "audio"), isNull(messages.deletedAt)))
    .limit(1);
  const message = rows[0];
  if (!message || message.requestId == null || !message.storageKey) return null;
  if (message.senderId !== actorUserId && message.receiverId !== actorUserId) return null;
  await assertMessageParticipant(db, message.requestId, message.senderId, message.receiverId);
  return message;
}

/** Returns source text only after proving that the requesting actor is a conversation participant. */
export async function getAuthorizedTextMessageForTranslation(messageId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: messages.id,
      requestId: messages.requestId,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      content: messages.content,
    })
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.kind, "text"), isNull(messages.deletedAt)))
    .limit(1);
  const message = rows[0];
  if (!message || message.requestId == null || (message.senderId !== actorUserId && message.receiverId !== actorUserId)) {
    return null;
  }
  await assertMessageParticipant(db, message.requestId, message.senderId, message.receiverId);
  return message;
}

export async function getConversation(requestId: number, userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return [];
  await assertMessageParticipant(db, requestId, userId1, userId2);
  const { or, and } = await import("drizzle-orm");
  return db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      requestId: messages.requestId,
      content: messages.content,
      kind: messages.kind,
      mediaMimeType: messages.mediaMimeType,
      mediaSizeBytes: messages.mediaSizeBytes,
      mediaDurationMs: messages.mediaDurationMs,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.requestId, requestId),
        isNull(messages.deletedAt),
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1)),
        )!,
      ),
    )
    .orderBy(messages.createdAt, messages.id);
}

export async function getMessageConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { or } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(messages)
    .where(and(isNull(messages.deletedAt), or(eq(messages.senderId, userId), eq(messages.receiverId, userId))!))
    .orderBy(desc(messages.createdAt), desc(messages.id));

  const requestIds = [
    ...new Set(
      rows
        .map((row) => row.requestId)
        .filter((requestId): requestId is number => requestId != null),
    ),
  ];
  if (requestIds.length === 0) return [];

  const requestRows = await db
    .select({
      id: serviceRequests.id,
      title: serviceRequests.title,
      customerUserId: serviceRequests.userId,
      providerUserId: providers.userId,
    })
    .from(serviceRequests)
    .leftJoin(providers, eq(serviceRequests.assignedProviderId, providers.id))
    .where(inArray(serviceRequests.id, requestIds));
  const requestById = new Map(requestRows.map((row) => [row.id, row]));

  type MessageRow = (typeof rows)[number];
  const grouped = new Map<
    string,
    { otherUserId: number; lastMessage: MessageRow; unreadCount: number }
  >();

  for (const row of rows) {
    if (row.requestId == null) continue;
    const request = requestById.get(row.requestId);
    if (!request || request.providerUserId == null) continue;

    const otherUserId = row.senderId === userId ? row.receiverId : row.senderId;
    const isValidPair =
      (request.customerUserId === userId && request.providerUserId === otherUserId) ||
      (request.providerUserId === userId && request.customerUserId === otherUserId);
    if (!isValidPair) continue;

    const conversationKey = `${row.requestId}:${otherUserId}`;
    const existing = grouped.get(conversationKey);
    const unreadIncrement = row.receiverId === userId && row.isRead !== 1 ? 1 : 0;
    if (existing) {
      existing.unreadCount += unreadIncrement;
    } else {
      grouped.set(conversationKey, {
        otherUserId,
        lastMessage: row,
        unreadCount: unreadIncrement,
      });
    }
  }

  const otherUserIds = [...new Set([...grouped.values()].map((state) => state.otherUserId))];
  if (otherUserIds.length === 0) return [];

  const [participantRows, providerRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, otherUserIds)),
    db
      .select({
        userId: providers.userId,
        displayName: providers.displayName,
        isVerified: providers.isVerified,
        rating: providers.rating,
      })
      .from(providers)
      .where(inArray(providers.userId, otherUserIds)),
  ]);

  const participantById = new Map(participantRows.map((row) => [row.id, row]));
  const providerByUserId = new Map(providerRows.map((row) => [row.userId, row]));

  return [...grouped.values()].map((state) => {
    const { otherUserId } = state;
    const participant = participantById.get(otherUserId);
    const provider = providerByUserId.get(otherUserId);
    const request = state.lastMessage.requestId
      ? requestById.get(state.lastMessage.requestId)
      : undefined;

    return {
      otherUserId,
      displayName:
        provider?.displayName ?? participant?.name ?? `Kullanıcı #${otherUserId}`,
      email: participant?.email ?? null,
      isProvider: provider != null,
      isVerified: provider?.isVerified === 1,
      rating: provider?.rating ?? null,
      requestId: state.lastMessage.requestId ?? null,
      requestTitle: request?.title ?? null,
      lastMessage: state.lastMessage.content,
      lastMessageAt: state.lastMessage.createdAt,
      unreadCount: state.unreadCount,
    };
  });
}

/**
 * Removes a sender-owned message from both participants' normal views. The row
 * remains as minimal audit evidence, while content/media are not retrievable
 * from conversation APIs after deletion.
 */
export async function softDeleteMessage(input: { messageId: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      requestId: messages.requestId,
      deletedAt: messages.deletedAt,
    })
    .from(messages)
    .where(eq(messages.id, input.messageId))
    .limit(1);
  const message = rows[0];
  if (!message) throw new Error("MESSAGE_NOT_FOUND");
  if (message.senderId !== input.actorUserId) throw new Error("MESSAGE_DELETE_FORBIDDEN");
  if (message.requestId == null) throw new Error("MESSAGE_REQUEST_REQUIRED");
  await assertMessageParticipant(db, message.requestId, message.senderId, message.receiverId);
  if (message.deletedAt) return { deleted: true, idempotent: true } as const;

  const result = await db
    .update(messages)
    .set({ deletedAt: new Date(), deletedByUserId: input.actorUserId, content: "" })
    .where(and(eq(messages.id, input.messageId), isNull(messages.deletedAt), eq(messages.senderId, input.actorUserId)));
  if ((result[0]?.affectedRows ?? 0) !== 1) throw new Error("MESSAGE_DELETE_CONFLICT");
  await logOperationEvent({
    eventType: "message_soft_deleted",
    subjectId: message.requestId,
    actorId: input.actorUserId,
    payload: { messageId: input.messageId },
  });
  return { deleted: true, idempotent: false } as const;
}

export type PrivacyRightRequestType = "export" | "erasure";
export type PrivacyRightReviewDecision = "start_review" | "approve" | "reject";

/**
 * Creates an owned privacy request. Completion is intentionally absent from
 * this path: exports require a secure delivery destination and erasure requires
 * retention-aware human review before any authoritative record is altered.
 */
export async function createPrivacyRightsRequest(input: {
  requesterUserId: number;
  requestType: PrivacyRightRequestType;
  requestReason?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const requester = await db.select({ id: users.id }).from(users).where(eq(users.id, input.requesterUserId)).limit(1);
  if (!requester[0]) throw new Error("PRIVACY_REQUESTER_NOT_FOUND");

  const existing = await db
    .select({ id: privacyRightsRequests.id })
    .from(privacyRightsRequests)
    .where(and(
      eq(privacyRightsRequests.requesterUserId, input.requesterUserId),
      eq(privacyRightsRequests.requestType, input.requestType),
      inArray(privacyRightsRequests.status, ["open", "in_review", "blocked_legal_hold", "approved"]),
    ))
    .limit(1);
  if (existing[0]) throw new Error("PRIVACY_REQUEST_ALREADY_OPEN");

  const legalHold = input.requestType === "erasure"
    ? await db
        .select({ id: privacyLegalHolds.id })
        .from(privacyLegalHolds)
        .where(and(eq(privacyLegalHolds.userId, input.requesterUserId), eq(privacyLegalHolds.status, "active")))
        .limit(1)
    : [];
  const status = legalHold[0] ? "blocked_legal_hold" as const : "open" as const;
  const result = await db.insert(privacyRightsRequests).values({
    requesterUserId: input.requesterUserId,
    requestType: input.requestType,
    status,
    requestReason: input.requestReason?.trim() || null,
  });
  const id = Number(result[0].insertId);
  await logOperationEvent({
    eventType: "privacy_right_requested",
    subjectId: id,
    actorId: input.requesterUserId,
    payload: { requestType: input.requestType, blockedByLegalHold: Boolean(legalHold[0]) },
    severity: legalHold[0] ? "warning" : "info",
  });
  return { id, status };
}

export async function listOwnPrivacyRightsRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: privacyRightsRequests.id,
      requestType: privacyRightsRequests.requestType,
      status: privacyRightsRequests.status,
      requestReason: privacyRightsRequests.requestReason,
      reviewNote: privacyRightsRequests.reviewNote,
      reviewedAt: privacyRightsRequests.reviewedAt,
      completedAt: privacyRightsRequests.completedAt,
      createdAt: privacyRightsRequests.createdAt,
      updatedAt: privacyRightsRequests.updatedAt,
    })
    .from(privacyRightsRequests)
    .where(eq(privacyRightsRequests.requesterUserId, userId))
    .orderBy(desc(privacyRightsRequests.createdAt), desc(privacyRightsRequests.id));
}

export async function listPrivacyRightsRequestsForReview(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: privacyRightsRequests.id,
      requesterUserId: privacyRightsRequests.requesterUserId,
      requestType: privacyRightsRequests.requestType,
      status: privacyRightsRequests.status,
      requestReason: privacyRightsRequests.requestReason,
      reviewNote: privacyRightsRequests.reviewNote,
      reviewedByUserId: privacyRightsRequests.reviewedByUserId,
      reviewedAt: privacyRightsRequests.reviewedAt,
      completedAt: privacyRightsRequests.completedAt,
      createdAt: privacyRightsRequests.createdAt,
      updatedAt: privacyRightsRequests.updatedAt,
    })
    .from(privacyRightsRequests)
    .orderBy(desc(privacyRightsRequests.createdAt), desc(privacyRightsRequests.id))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export async function listPrivacyLegalHolds(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(privacyLegalHolds)
    .orderBy(desc(privacyLegalHolds.createdAt), desc(privacyLegalHolds.id))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export async function createPrivacyLegalHold(input: {
  userId: number;
  createdByUserId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user[0]) throw new Error("PRIVACY_HOLD_USER_NOT_FOUND");
  const existing = await db
    .select({ id: privacyLegalHolds.id })
    .from(privacyLegalHolds)
    .where(and(eq(privacyLegalHolds.userId, input.userId), eq(privacyLegalHolds.status, "active")))
    .limit(1);
  if (existing[0]) throw new Error("PRIVACY_LEGAL_HOLD_ALREADY_ACTIVE");
  const result = await db.insert(privacyLegalHolds).values({
    userId: input.userId,
    createdByUserId: input.createdByUserId,
    reason: input.reason.trim(),
  });
  const holdId = Number(result[0].insertId);
  await db
    .update(privacyRightsRequests)
    .set({ status: "blocked_legal_hold" })
    .where(and(
      eq(privacyRightsRequests.requesterUserId, input.userId),
      eq(privacyRightsRequests.requestType, "erasure"),
      inArray(privacyRightsRequests.status, ["open", "in_review", "approved"]),
    ));
  await logOperationEvent({
    eventType: "privacy_legal_hold_created",
    subjectId: holdId,
    actorId: input.createdByUserId,
    payload: { userId: input.userId },
    severity: "warning",
  });
  return { id: holdId, status: "active" as const };
}

export async function releasePrivacyLegalHold(input: { holdId: number; releasedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(privacyLegalHolds).where(eq(privacyLegalHolds.id, input.holdId)).limit(1);
  const hold = rows[0];
  if (!hold) throw new Error("PRIVACY_LEGAL_HOLD_NOT_FOUND");
  if (hold.status === "released") return { id: hold.id, status: "released" as const, idempotent: true };
  await db
    .update(privacyLegalHolds)
    .set({ status: "released", releasedByUserId: input.releasedByUserId, releasedAt: new Date() })
    .where(and(eq(privacyLegalHolds.id, input.holdId), eq(privacyLegalHolds.status, "active")));
  await logOperationEvent({
    eventType: "privacy_legal_hold_released",
    subjectId: input.holdId,
    actorId: input.releasedByUserId,
    payload: { userId: hold.userId },
    severity: "info",
  });
  return { id: hold.id, status: "released" as const, idempotent: false };
}

export async function reviewPrivacyRightsRequest(input: {
  requestId: number;
  reviewerUserId: number;
  decision: PrivacyRightReviewDecision;
  reviewNote?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(privacyRightsRequests).where(eq(privacyRightsRequests.id, input.requestId)).limit(1);
  const request = rows[0];
  if (!request) throw new Error("PRIVACY_REQUEST_NOT_FOUND");
  if (["rejected", "completed"].includes(request.status)) throw new Error("PRIVACY_REQUEST_TERMINAL");

  const activeHold = request.requestType === "erasure"
    ? await db
        .select({ id: privacyLegalHolds.id })
        .from(privacyLegalHolds)
        .where(and(eq(privacyLegalHolds.userId, request.requesterUserId), eq(privacyLegalHolds.status, "active")))
        .limit(1)
    : [];
  const status = activeHold[0]
    ? "blocked_legal_hold" as const
    : input.decision === "start_review"
      ? "in_review" as const
      : input.decision === "approve"
        ? "approved" as const
        : "rejected" as const;
  await db
    .update(privacyRightsRequests)
    .set({
      status,
      reviewNote: input.reviewNote?.trim() || null,
      reviewedByUserId: input.reviewerUserId,
      reviewedAt: new Date(),
    })
    .where(eq(privacyRightsRequests.id, input.requestId));
  await logOperationEvent({
    eventType: "privacy_right_reviewed",
    subjectId: input.requestId,
    actorId: input.reviewerUserId,
    payload: { decision: input.decision, resultingStatus: status, blockedByLegalHold: Boolean(activeHold[0]) },
    severity: activeHold[0] ? "warning" : "info",
  });
  return { id: input.requestId, status };
}

export async function getMessageParticipant(
  requestId: number,
  userId: number,
  otherUserId: number,
) {
  const db = await getDb();
  if (!db) return null;
  await assertMessageParticipant(db, requestId, userId, otherUserId);

  const participantRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, otherUserId))
    .limit(1);
  const participant = participantRows[0];
  if (!participant) return null;

  const providerRows = await db
    .select({
      displayName: providers.displayName,
      isVerified: providers.isVerified,
      rating: providers.rating,
    })
    .from(providers)
    .where(eq(providers.userId, otherUserId))
    .limit(1);
  const provider = providerRows[0];

  return {
    id: participant.id,
    displayName: provider?.displayName ?? participant.name ?? `Kullanıcı #${participant.id}`,
    email: participant.email,
    isProvider: provider != null,
    isVerified: provider?.isVerified === 1,
    rating: provider?.rating ?? null,
  };
}

export async function markConversationRead(
  requestId: number,
  userId: number,
  otherUserId: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertMessageParticipant(db, requestId, userId, otherUserId);

  await db
    .update(messages)
    .set({ isRead: 1 })
    .where(
      and(
        eq(messages.requestId, requestId),
        eq(messages.receiverId, userId),
        eq(messages.senderId, otherUserId),
        eq(messages.isRead, 0),
      ),
    );
  return { success: true } as const;
}

// Providers
export async function getProviderProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: providers.id,
      userId: providers.userId,
      displayName: providers.displayName,
      bio: providers.bio,
      categoryId: providers.categoryId,
      rating: providers.rating,
      completedJobs: providers.completedJobs,
      moveScore: providers.moveScore,
      isVerified: providers.isVerified,
      isPremium: providers.isPremium,
      isAvailable: providers.isAvailable,
      latitude: providers.latitude,
      longitude: providers.longitude,
      createdAt: providers.createdAt,
      updatedAt: providers.updatedAt,
      reviewCount: sql<number>`(
        SELECT COUNT(*) FROM ${reviews}
        WHERE ${reviews.providerId} = ${providers.id}
      )`,
    })
    .from(providers)
    .where(eq(providers.userId, userId));
  return rows[0] ?? null;
}

export async function updateProviderAvailability(userId: number, isAvailable: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const providerRows = await db
    .select({ id: providers.id })
    .from(providers)
    .where(eq(providers.userId, userId))
    .limit(1);
  if (!providerRows[0]) throw new Error("PROVIDER_NOT_FOUND");

  await db
    .update(providers)
    .set({ isAvailable: isAvailable ? 1 : 0 })
    .where(eq(providers.userId, userId));

  return { isAvailable } as const;
}

export async function getNearbyProviders(lat?: string, lng?: string) {
  const db = await getDb();
  if (!db) return [];
  // Distance sorting will be enabled when device location is supplied and a
  // geospatial index is available. Without it, return verified/high-score
  // professionals instead of presenting a fabricated distance.
  void lat;
  void lng;
  return db
    .select()
    .from(providers)
    .orderBy(desc(providers.isVerified), desc(providers.moveScore), desc(providers.rating))
    .limit(20);
}

export async function getProviderById(providerId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: providers.id,
      providerUserId: providers.userId,
      displayName: providers.displayName,
      bio: providers.bio,
      categoryId: providers.categoryId,
      rating: providers.rating,
      completedJobs: providers.completedJobs,
      moveScore: providers.moveScore,
      isVerified: providers.isVerified,
      isPremium: providers.isPremium,
      latitude: providers.latitude,
      longitude: providers.longitude,
      createdAt: providers.createdAt,
    })
    .from(providers)
    .where(eq(providers.id, providerId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProvidersByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: providers.id,
      userId: providers.userId,
      displayName: providers.displayName,
      bio: providers.bio,
      categoryId: providers.categoryId,
      rating: providers.rating,
      completedJobs: providers.completedJobs,
      moveScore: providers.moveScore,
      isVerified: providers.isVerified,
      isPremium: providers.isPremium,
      latitude: providers.latitude,
      longitude: providers.longitude,
      createdAt: providers.createdAt,
      updatedAt: providers.updatedAt,
      reviewCount: sql<number>`(
        SELECT COUNT(*)
        FROM ${reviews}
        WHERE ${reviews.providerId} = ${providers.id}
      )`,
      hasActiveJob: sql<number>`EXISTS(
        SELECT 1
        FROM ${serviceRequests}
        WHERE ${serviceRequests.assignedProviderId} = ${providers.id}
          AND ${serviceRequests.status} = 'active'
      )`,
    })
    .from(providers)
    .where(eq(providers.categoryId, categoryId))
    .orderBy(desc(providers.moveScore), desc(providers.rating))
    .limit(100);
}

export async function getFavoriteProviders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: providers.id,
      providerUserId: providers.userId,
      displayName: providers.displayName,
      bio: providers.bio,
      categoryId: providers.categoryId,
      rating: providers.rating,
      completedJobs: providers.completedJobs,
      moveScore: providers.moveScore,
      isVerified: providers.isVerified,
      isPremium: providers.isPremium,
      createdAt: providerFavorites.createdAt,
    })
    .from(providerFavorites)
    .innerJoin(providers, eq(providers.id, providerFavorites.providerId))
    .where(eq(providerFavorites.userId, userId))
    .orderBy(desc(providerFavorites.createdAt));
}

export async function isFavoriteProvider(userId: number, providerId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: providerFavorites.id })
    .from(providerFavorites)
    .where(and(eq(providerFavorites.userId, userId), eq(providerFavorites.providerId, providerId)))
    .limit(1);
  return rows.length > 0;
}

export async function addFavoriteProvider(userId: number, providerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const provider = await getProviderById(providerId);
  if (!provider) throw new Error("Provider not found");
  await db
    .insert(providerFavorites)
    .values({ userId, providerId })
    .onDuplicateKeyUpdate({ set: { providerId } });
  return { success: true };
}

export async function removeFavoriteProvider(userId: number, providerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(providerFavorites)
    .where(and(eq(providerFavorites.userId, userId), eq(providerFavorites.providerId, providerId)));
  return { success: true };
}

export type JobLifecycleStatus =
  | "scheduled"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

const TRACKING_TRANSITIONS: Record<JobLifecycleStatus, readonly JobLifecycleStatus[]> = {
  scheduled: ["on_the_way"],
  on_the_way: ["arrived"],
  arrived: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

async function getTrackingAccessContext(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      requestId: serviceRequests.id,
      customerUserId: serviceRequests.userId,
      requestStatus: serviceRequests.status,
      title: serviceRequests.title,
      description: serviceRequests.description,
      address: serviceRequests.address,
      customerLatitude: serviceRequests.latitude,
      customerLongitude: serviceRequests.longitude,
      assignedProviderId: serviceRequests.assignedProviderId,
      jurisdictionId: serviceRequests.jurisdictionId,
      requiredCapabilityId: serviceRequests.requiredCapabilityId,
      requiredCredentialType: serviceRequests.requiredCredentialType,
      requiredCredentialAssurance: serviceRequests.requiredCredentialAssurance,
      requiresCredentialHumanReview: serviceRequests.requiresCredentialHumanReview,
      compliancePackageVersion: serviceRequests.compliancePackageVersion,
      categoryName: serviceCategories.name,
      providerUserId: providers.userId,
      providerName: providers.displayName,
      providerRating: providers.rating,
      providerVerified: providers.isVerified,
      providerCompletedJobs: providers.completedJobs,
      acceptedPrice: offers.price,
      estimatedTime: offers.estimatedTime,
    })
    .from(serviceRequests)
    .leftJoin(serviceCategories, eq(serviceRequests.categoryId, serviceCategories.id))
    .leftJoin(providers, eq(serviceRequests.assignedProviderId, providers.id))
    .leftJoin(
      offers,
      and(eq(offers.requestId, serviceRequests.id), eq(offers.status, "accepted")),
    )
    .where(eq(serviceRequests.id, requestId))
    .limit(1);

  const context = rows[0];
  if (!context) throw new Error("Service request not found");
  return { db, context };
}

export async function getJobTracking(requestId: number, userId: number) {
  const { db, context } = await getTrackingAccessContext(requestId);
  const isCustomer = context.customerUserId === userId;
  const isAssignedProvider = context.providerUserId === userId;
  if (!isCustomer && !isAssignedProvider) {
    throw new Error("Not authorized to view this job tracking");
  }

  const rows = await db
    .select()
    .from(jobTracking)
    .where(eq(jobTracking.requestId, requestId))
    .limit(1);
  const tracking = rows[0] ?? null;
  const fallbackLifecycle: JobLifecycleStatus =
    context.requestStatus === "completed"
      ? "completed"
      : context.requestStatus === "cancelled"
        ? "cancelled"
        : "scheduled";

  const locationIsVisible = tracking?.locationSharingStatus === "enabled" &&
    (tracking.lifecycleStatus === "on_the_way" || tracking.lifecycleStatus === "arrived" || tracking.lifecycleStatus === "in_progress");

  return {
    ...context,
    viewerRole: isAssignedProvider ? ("provider" as const) : ("customer" as const),
    lifecycleStatus: tracking?.lifecycleStatus ?? fallbackLifecycle,
    providerLatitude: locationIsVisible ? tracking?.providerLatitude ?? null : null,
    providerLongitude: locationIsVisible ? tracking?.providerLongitude ?? null : null,
    accuracyMeters: locationIsVisible ? tracking?.accuracyMeters ?? null : null,
    etaMinutes: tracking?.etaMinutes ?? null,
    lastLocationAt: locationIsVisible ? tracking?.lastLocationAt ?? null : null,
    locationSharingStatus: tracking?.locationSharingStatus ?? "disabled",
    trackingUpdatedAt: tracking?.updatedAt ?? null,
  };
}

const LIVE_LOCATION_STATUSES = new Set<JobLifecycleStatus>(["on_the_way", "arrived", "in_progress"]);

function minimizeTrackingCoordinate(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("LOCATION_COORDINATE_INVALID");
  return parsed.toFixed(4);
}

export async function setJobLocationSharing(data: {
  requestId: number;
  userId: number;
  enabled: boolean;
  consentGranted?: boolean;
}) {
  const { db, context } = await getTrackingAccessContext(data.requestId);
  if (context.providerUserId !== data.userId) throw new Error("LOCATION_SHARING_PROVIDER_ONLY");
  if (context.requestStatus !== "active") throw new Error("LOCATION_SHARING_JOB_NOT_ACTIVE");

  const rows = await db
    .select({ lifecycleStatus: jobTracking.lifecycleStatus })
    .from(jobTracking)
    .where(eq(jobTracking.requestId, data.requestId))
    .limit(1);
  const lifecycleStatus = rows[0]?.lifecycleStatus ?? "scheduled";

  if (data.enabled) {
    if (data.consentGranted !== true) throw new Error("LOCATION_CONSENT_REQUIRED");
    if (!LIVE_LOCATION_STATUSES.has(lifecycleStatus)) throw new Error("LOCATION_SHARING_LIFECYCLE_FORBIDDEN");
  }

  const now = new Date();
  await db
    .insert(jobTracking)
    .values({
      requestId: data.requestId,
      lifecycleStatus,
      locationSharingStatus: data.enabled ? "enabled" : "stopped",
      locationConsentAt: data.enabled ? now : null,
      locationSharingStoppedAt: data.enabled ? null : now,
      updatedByUserId: data.userId,
    })
    .onDuplicateKeyUpdate({
      set: {
        locationSharingStatus: data.enabled ? "enabled" : "stopped",
        locationConsentAt: data.enabled ? now : null,
        locationSharingStoppedAt: data.enabled ? null : now,
        updatedByUserId: data.userId,
      },
    });

  return { requestId: data.requestId, locationSharingStatus: data.enabled ? ("enabled" as const) : ("stopped" as const), changedAt: now };
}

export async function publishJobLocation(data: {
  requestId: number;
  userId: number;
  latitude: string;
  longitude: string;
  accuracyMeters?: number;
}) {
  const { db, context } = await getTrackingAccessContext(data.requestId);
  if (context.providerUserId !== data.userId) {
    throw new Error("Only the assigned provider can publish job location");
  }
  if (context.requestStatus !== "active") {
    throw new Error("Location can only be shared for an active job");
  }

  const currentRows = await db
    .select({
      lifecycleStatus: jobTracking.lifecycleStatus,
      locationSharingStatus: jobTracking.locationSharingStatus,
      locationConsentAt: jobTracking.locationConsentAt,
      lastLocationAt: jobTracking.lastLocationAt,
    })
    .from(jobTracking)
    .where(eq(jobTracking.requestId, data.requestId))
    .limit(1);
  const current = currentRows[0];
  if (!current?.locationConsentAt || current.locationSharingStatus !== "enabled") {
    throw new Error("LOCATION_CONSENT_REQUIRED");
  }
  if (!LIVE_LOCATION_STATUSES.has(current.lifecycleStatus)) {
    throw new Error("LOCATION_SHARING_LIFECYCLE_FORBIDDEN");
  }
  if (current.lastLocationAt && Date.now() - current.lastLocationAt.getTime() < 8_000) {
    throw new Error("LOCATION_UPDATE_RATE_LIMITED");
  }
  const accuracyMeters = data.accuracyMeters == null ? null : Math.round(data.accuracyMeters);
  if (accuracyMeters != null && (accuracyMeters < 0 || accuracyMeters > 5_000)) {
    throw new Error("LOCATION_ACCURACY_INVALID");
  }
  const latitude = minimizeTrackingCoordinate(data.latitude);
  const longitude = minimizeTrackingCoordinate(data.longitude);

  const now = new Date();
  await db
    .insert(jobTracking)
    .values({
      requestId: data.requestId,
      providerLatitude: latitude,
      providerLongitude: longitude,
      accuracyMeters,
      lastLocationAt: now,
      locationSharingStatus: "enabled",
      updatedByUserId: data.userId,
    })
    .onDuplicateKeyUpdate({
      set: {
        providerLatitude: latitude,
        providerLongitude: longitude,
        accuracyMeters,
        lastLocationAt: now,
        updatedByUserId: data.userId,
      },
    });

  return { success: true, requestId: data.requestId, lastLocationAt: now };
}

export async function updateJobLifecycle(data: {
  requestId: number;
  userId: number;
  status: JobLifecycleStatus;
  etaMinutes?: number;
}) {
  const { db, context } = await getTrackingAccessContext(data.requestId);
  if (context.providerUserId !== data.userId) {
    throw new Error("Only the assigned provider can update job lifecycle");
  }
  if (context.requestStatus !== "active" && context.requestStatus !== "completed") {
    throw new Error("Job lifecycle can only be updated for an active job");
  }

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(jobTracking)
      .where(eq(jobTracking.requestId, data.requestId))
      .limit(1);
    const current: JobLifecycleStatus =
      rows[0]?.lifecycleStatus ??
      (context.requestStatus === "completed" ? "completed" : "scheduled");

    if (current === data.status) {
      return { success: true, requestId: data.requestId, status: current, idempotent: true };
    }
    if (!TRACKING_TRANSITIONS[current].includes(data.status)) {
      throw new Error(`Invalid job lifecycle transition: ${current} -> ${data.status}`);
    }

    // Capability eligibility is rechecked at the moment an assigned provider
    // starts or progresses an active job. This prevents an expired, revoked, or
    // otherwise ineligible capability from being bypassed after offer acceptance.
    if (
      data.status === "on_the_way" ||
      data.status === "arrived" ||
      data.status === "in_progress"
    ) {
      if (context.assignedProviderId == null) {
        throw new Error("COMPLIANCE_CONTEXT_NOT_CONFIGURED");
      }
      const capabilityStatuses = await tx
        .select({
          capabilityId: providerCapabilityStatuses.capabilityId,
          jurisdictionId: providerCapabilityStatuses.jurisdictionId,
          status: providerCapabilityStatuses.status,
          expiresAt: providerCapabilityStatuses.expiresAt,
        })
        .from(providerCapabilityStatuses)
        .where(eq(providerCapabilityStatuses.providerId, context.assignedProviderId));
      assertProviderCapabilityForRequest({
        request: context,
        capabilityStatuses,
      });
      const providerCredentialStatuses = await tx
        .select({
          jurisdictionId: providerCredentials.jurisdictionId,
          credentialType: providerCredentials.credentialType,
          assuranceLevel: providerCredentials.assuranceLevel,
          status: providerCredentials.status,
          expiresAt: providerCredentials.expiresAt,
          verifiedAt: providerCredentials.verifiedAt,
          reviewedByUserId: providerCredentials.reviewedByUserId,
          revocationStatus: providerCredentials.revocationStatus,
          ruleVersion: providerCredentials.ruleVersion,
        })
        .from(providerCredentials)
        .where(eq(providerCredentials.providerId, context.assignedProviderId));
      assertProviderCredentialForRequest({
        request: context,
        providerCredentials: providerCredentialStatuses,
      });
    }

    await tx
      .insert(jobTracking)
      .values({
        requestId: data.requestId,
        lifecycleStatus: data.status,
        etaMinutes: data.etaMinutes,
        updatedByUserId: data.userId,
      })
      .onDuplicateKeyUpdate({
        set: {
          lifecycleStatus: data.status,
          etaMinutes: data.etaMinutes,
          updatedByUserId: data.userId,
        },
      });

    if (data.status === "completed") {
      await tx
        .update(jobTracking)
        .set({ locationSharingStatus: "stopped", locationConsentAt: null, locationSharingStoppedAt: new Date() })
        .where(eq(jobTracking.requestId, data.requestId));
      await tx
        .update(serviceRequests)
        .set({ status: "completed" })
        .where(eq(serviceRequests.id, data.requestId));
      if (context.assignedProviderId) {
        await tx
          .update(providers)
          .set({ completedJobs: sql`${providers.completedJobs} + 1` })
          .where(eq(providers.id, context.assignedProviderId));
      }
    }

    return { success: true, requestId: data.requestId, status: data.status, idempotent: false };
  });
}

type DatabaseClient = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type DatabaseTransaction = Parameters<Parameters<DatabaseClient["transaction"]>[0]>[0];
type CompletionReleaseReason = "customer_approval" | "auto_release" | "admin_resolution";

async function getAgreementForPaymentInTransaction(
  tx: DatabaseTransaction,
  payment: {
    id: number;
    requestId: number;
    userId: number;
    providerId: number;
    offerId: number | null;
    amount: number;
    commissionRateBps: number | null;
    commissionAmount: number | null;
    providerPayout: number | null;
  },
) {
  const rows = await tx
    .select()
    .from(serviceAgreements)
    .where(eq(serviceAgreements.requestId, payment.requestId))
    .limit(1);
  const agreement = rows[0];
  if (!agreement) throw new Error("PAYMENT_AGREEMENT_NOT_FOUND");
  const matches =
    agreement.paymentId === payment.id &&
    agreement.customerUserId === payment.userId &&
    agreement.providerId === payment.providerId &&
    agreement.offerId === payment.offerId &&
    agreement.agreedAmount === payment.amount &&
    agreement.commissionRateBps === payment.commissionRateBps &&
    agreement.commissionAmount === payment.commissionAmount &&
    agreement.providerPayout === payment.providerPayout;
  if (!matches) throw new Error("PAYMENT_AGREEMENT_MISMATCH");
  return agreement;
}

async function releaseHeldEscrowInTransaction(
  tx: DatabaseTransaction,
  data: {
    requestId: number;
    completionProofId: number;
    paymentId: number;
    providerUserId: number;
    providerPayout: number | null;
    reason: CompletionReleaseReason;
    actorUserId?: number;
  },
) {
  const existingEvents = await tx
    .select()
    .from(escrowReleaseEvents)
    .where(eq(escrowReleaseEvents.paymentId, data.paymentId))
    .limit(1);
  if (existingEvents[0]) {
    return { released: true, duplicated: true, event: existingEvents[0] };
  }

  if (!data.providerPayout || data.providerPayout < 1) {
    throw new Error("ESCROW_PROVIDER_PAYOUT_INVALID");
  }

  const paymentRows = await tx
    .select()
    .from(payments)
    .where(eq(payments.id, data.paymentId))
    .limit(1);
  const payment = paymentRows[0];
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.requestId !== data.requestId) throw new Error("ESCROW_REQUEST_MISMATCH");
  if (payment.status !== "held") {
    throw new Error(payment.status === "released" ? "ESCROW_RELEASE_EVENT_MISSING" : "ESCROW_NOT_HELD");
  }
  const agreement = await getAgreementForPaymentInTransaction(tx, payment);
  if (agreement.providerPayout !== data.providerPayout) {
    throw new Error("ESCROW_AGREEMENT_PAYOUT_MISMATCH");
  }

  const idempotencyKey = `escrow-release:${data.paymentId}`;
  const eventResult = await tx.insert(escrowReleaseEvents).values({
    requestId: data.requestId,
    paymentId: data.paymentId,
    completionProofId: data.completionProofId,
    reason: data.reason,
    actorUserId: data.actorUserId,
    idempotencyKey,
  });

  const paymentUpdate = await tx
    .update(payments)
    .set({ status: "released" })
    .where(and(eq(payments.id, data.paymentId), eq(payments.status, "held")));
  if ((paymentUpdate[0]?.affectedRows ?? 0) !== 1) {
    throw new Error("ESCROW_RELEASE_CONFLICT");
  }

  await postFinancialLedgerEntry(tx, buildEscrowReleasedLedgerEntry(payment));

  await tx
    .insert(walletAccounts)
    .values({ userId: data.providerUserId, currency: "TRY" })
    .onDuplicateKeyUpdate({ set: { userId: data.providerUserId } });
  await tx
    .update(walletAccounts)
    .set({ availableBalance: sql`${walletAccounts.availableBalance} + ${data.providerPayout}` })
    .where(eq(walletAccounts.userId, data.providerUserId));
  await tx.insert(walletTransactions).values({
    userId: data.providerUserId,
    type: "provider_payout",
    status: "completed",
    amount: data.providerPayout,
    description: "İş tamamlanması sonrası emanet ödemesi",
    reference: `payment:${data.paymentId}`,
    idempotencyKey,
    metadata: JSON.stringify({
      requestId: data.requestId,
      completionProofId: data.completionProofId,
      releaseReason: data.reason,
    }),
  });

  const eventRows = await tx
    .select()
    .from(escrowReleaseEvents)
    .where(eq(escrowReleaseEvents.id, eventResult[0].insertId))
    .limit(1);
  if (!eventRows[0]) throw new Error("ESCROW_RELEASE_EVENT_CREATE_FAILED");
  return { released: true, duplicated: false, event: eventRows[0] };
}

export async function getCompletionWorkflow(requestId: number, userId: number) {
  const tracking = await getJobTracking(requestId, userId);
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [proofRows, disputeRows, paymentRows] = await Promise.all([
    db.select().from(jobCompletionProofs).where(eq(jobCompletionProofs.requestId, requestId)).limit(1),
    db.select().from(completionDisputes).where(eq(completionDisputes.requestId, requestId)).limit(1),
    db.select().from(payments).where(eq(payments.requestId, requestId)).limit(1),
  ]);
  const proof = proofRows[0] ?? null;
  const media = proof
    ? await db
        .select({
          id: serviceRequestMedia.id,
          kind: serviceRequestMedia.kind,
          storageKey: serviceRequestMedia.storageKey,
          originalName: serviceRequestMedia.originalName,
          mimeType: serviceRequestMedia.mimeType,
          sizeBytes: serviceRequestMedia.sizeBytes,
          createdAt: serviceRequestMedia.createdAt,
        })
        .from(jobCompletionProofMedia)
        .innerJoin(serviceRequestMedia, eq(jobCompletionProofMedia.mediaId, serviceRequestMedia.id))
        .where(eq(jobCompletionProofMedia.completionProofId, proof.id))
    : [];
  const now = new Date();
  const dispute = disputeRows[0] ?? null;

  return {
    ...tracking,
    proof,
    proofMedia: media,
    dispute,
    payment: paymentRows[0] ?? null,
    canProviderSubmitProof:
      tracking.viewerRole === "provider" && tracking.lifecycleStatus === "completed" && !proof,
    canCustomerRespond:
      tracking.viewerRole === "customer" &&
      proof?.status === "submitted" &&
      proof.responseDueAt > now &&
      !dispute,
    responseExpired: Boolean(proof?.status === "submitted" && proof.responseDueAt <= now),
  };
}

export async function submitCompletionProof(data: {
  requestId: number;
  userId: number;
  summary: string;
  aiAnalysis?: {
    status: "completed" | "unavailable" | "failed";
    summary: string | null;
    confidence: number | null;
    flags: string[];
  };
  media: Array<{
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    kind: "image" | "video";
  }>;
}) {
  const { db, context } = await getTrackingAccessContext(data.requestId);
  const providerUserId = context.providerUserId;
  if (!providerUserId || providerUserId !== data.userId) {
    throw new Error("COMPLETION_PROOF_FORBIDDEN");
  }
  if (context.requestStatus !== "completed") throw new Error("COMPLETION_PROOF_JOB_NOT_COMPLETED");
  const providerId = context.assignedProviderId;
  if (!providerId) throw new Error("COMPLETION_PROOF_PROVIDER_NOT_ASSIGNED");
  if (data.media.length < 1) throw new Error("COMPLETION_PROOF_MEDIA_REQUIRED");

  const now = new Date();
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(jobCompletionProofs)
      .where(eq(jobCompletionProofs.requestId, data.requestId))
      .limit(1);
    if (existing[0]) return { proof: existing[0], duplicated: true };

    const agreementRows = await tx
      .select()
      .from(serviceAgreements)
      .where(eq(serviceAgreements.requestId, data.requestId))
      .limit(1);
    const agreement = agreementRows[0];
    if (!agreement) throw new Error("COMPLETION_PROOF_AGREEMENT_NOT_FOUND");
    if (agreement.providerId !== providerId) throw new Error("COMPLETION_PROOF_AGREEMENT_MISMATCH");
    if (!isValidCompletionReviewHours(agreement.completionReviewHours)) {
      throw new Error("COMPLETION_PROOF_REVIEW_WINDOW_INVALID");
    }
    const responseDueAt = new Date(
      now.getTime() + agreement.completionReviewHours * 60 * 60 * 1000,
    );

    const proofResult = await tx.insert(jobCompletionProofs).values({
      requestId: data.requestId,
      providerId,
      submittedByUserId: data.userId,
      summary: data.summary.trim(),
      status: "submitted",
      responseDueAt,
      aiAnalysisStatus: data.aiAnalysis?.status ?? "unavailable",
      aiAnalysisSummary: data.aiAnalysis?.summary ?? null,
      aiAnalysisConfidence: data.aiAnalysis?.confidence ?? null,
      aiAnalysisFlags: data.aiAnalysis ? JSON.stringify(data.aiAnalysis.flags) : null,
      aiAnalyzedAt: data.aiAnalysis ? now : null,
    });
    const proofId = proofResult[0].insertId;
    for (const item of data.media) {
      const mediaResult = await tx.insert(serviceRequestMedia).values({
        publicId: randomUUID(),
        requestId: data.requestId,
        ownerUserId: data.userId,
        purpose: "completion",
        kind: item.kind,
        storageKey: item.storageKey,
        originalName: item.originalName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        sha256: item.sha256,
      });
      await tx.insert(jobCompletionProofMedia).values({
        completionProofId: proofId,
        mediaId: mediaResult[0].insertId,
      });
    }
    const rows = await tx
      .select()
      .from(jobCompletionProofs)
      .where(eq(jobCompletionProofs.id, proofId))
      .limit(1);
    if (!rows[0]) throw new Error("COMPLETION_PROOF_CREATE_FAILED");
    return { proof: rows[0], duplicated: false };
  });
}

export async function approveCompletionProof(data: { requestId: number; userId: number }) {
  const { db, context } = await getTrackingAccessContext(data.requestId);
  if (context.customerUserId !== data.userId) throw new Error("COMPLETION_APPROVAL_FORBIDDEN");
  const providerUserId = context.providerUserId;
  if (!providerUserId) throw new Error("COMPLETION_APPROVAL_PROVIDER_MISSING");

  const outcome = await db.transaction(async (tx) => {
    const proofRows = await tx
      .select()
      .from(jobCompletionProofs)
      .where(eq(jobCompletionProofs.requestId, data.requestId))
      .limit(1);
    const proof = proofRows[0];
    if (!proof) throw new Error("COMPLETION_PROOF_NOT_FOUND");
    if (proof.status === "approved" || proof.status === "auto_approved") {
      const eventRows = await tx
        .select()
        .from(escrowReleaseEvents)
        .where(eq(escrowReleaseEvents.completionProofId, proof.id))
        .limit(1);
      return { proof, released: Boolean(eventRows[0]), duplicated: true };
    }
    if (proof.status !== "submitted") throw new Error("COMPLETION_PROOF_INVALID_STATUS");
    if (proof.responseDueAt <= new Date()) throw new Error("COMPLETION_RESPONSE_EXPIRED");

    const disputes = await tx
      .select()
      .from(completionDisputes)
      .where(eq(completionDisputes.requestId, data.requestId))
      .limit(1);
    if (disputes[0]) throw new Error("COMPLETION_DISPUTE_OPEN");

    const paymentRows = await tx
      .select()
      .from(payments)
      .where(eq(payments.requestId, data.requestId))
      .limit(1);
    const payment = paymentRows[0];
    if (!payment || payment.status !== "held") throw new Error("ESCROW_NOT_HELD");
    const release = await releaseHeldEscrowInTransaction(tx, {
      requestId: data.requestId,
      completionProofId: proof.id,
      paymentId: payment.id,
      providerUserId,
      providerPayout: payment.providerPayout,
      reason: "customer_approval",
      actorUserId: data.userId,
    });
    const now = new Date();
    await tx
      .update(jobCompletionProofs)
      .set({
        status: "approved",
        customerApprovedAt: now,
        releasedAt: now,
        releaseReason: "customer_approval",
      })
      .where(and(eq(jobCompletionProofs.id, proof.id), eq(jobCompletionProofs.status, "submitted")));
    const updated = await tx
      .select()
      .from(jobCompletionProofs)
      .where(eq(jobCompletionProofs.id, proof.id))
      .limit(1);
    if (!updated[0]) throw new Error("COMPLETION_PROOF_NOT_FOUND");
    return { proof: updated[0], released: release.released, duplicated: release.duplicated };
  });
  if (outcome.released && !outcome.duplicated) {
    await logOperationEvent({
      eventType: "escrow.released",
      subjectId: data.requestId,
      actorId: data.userId,
      payload: { completionProofId: outcome.proof.id, reason: "customer_approval" },
    });
  }
  return outcome;
}

export async function openCompletionDispute(data: {
  requestId: number;
  userId: number;
  reasonCode: "incomplete_work" | "quality_issue" | "damage" | "wrong_service" | "other";
  description: string;
}) {
  const { db, context } = await getTrackingAccessContext(data.requestId);
  if (context.customerUserId !== data.userId) throw new Error("COMPLETION_DISPUTE_FORBIDDEN");
  return db.transaction(async (tx) => {
    const proofRows = await tx
      .select()
      .from(jobCompletionProofs)
      .where(eq(jobCompletionProofs.requestId, data.requestId))
      .limit(1);
    const proof = proofRows[0];
    if (!proof) throw new Error("COMPLETION_PROOF_NOT_FOUND");
    if (proof.status === "disputed") {
      const existing = await tx
        .select()
        .from(completionDisputes)
        .where(eq(completionDisputes.requestId, data.requestId))
        .limit(1);
      if (!existing[0]) throw new Error("COMPLETION_DISPUTE_INCONSISTENT");
      return { dispute: existing[0], duplicated: true };
    }
    if (proof.status !== "submitted") throw new Error("COMPLETION_PROOF_INVALID_STATUS");
    if (proof.responseDueAt <= new Date()) throw new Error("COMPLETION_RESPONSE_EXPIRED");
    const result = await tx.insert(completionDisputes).values({
      requestId: data.requestId,
      completionProofId: proof.id,
      openedByUserId: data.userId,
      reasonCode: data.reasonCode,
      description: data.description.trim(),
      status: "open",
    });
    await tx
      .update(jobCompletionProofs)
      .set({ status: "disputed" })
      .where(and(eq(jobCompletionProofs.id, proof.id), eq(jobCompletionProofs.status, "submitted")));
    const disputes = await tx
      .select()
      .from(completionDisputes)
      .where(eq(completionDisputes.id, result[0].insertId))
      .limit(1);
    if (!disputes[0]) throw new Error("COMPLETION_DISPUTE_CREATE_FAILED");
    return { dispute: disputes[0], duplicated: false };
  });
}

export async function resolveCompletionDispute(data: {
  requestId: number;
  adminUserId: number;
  resolution: "customer" | "provider";
  resolutionNote: string;
}) {
  const { db, context } = await getTrackingAccessContext(data.requestId);
  const providerUserId = context.providerUserId;
  if (!providerUserId) throw new Error("COMPLETION_RESOLUTION_PROVIDER_MISSING");
  const outcome = await db.transaction(async (tx) => {
    const [proofRows, disputeRows, paymentRows] = await Promise.all([
      tx.select().from(jobCompletionProofs).where(eq(jobCompletionProofs.requestId, data.requestId)).limit(1),
      tx.select().from(completionDisputes).where(eq(completionDisputes.requestId, data.requestId)).limit(1),
      tx.select().from(payments).where(eq(payments.requestId, data.requestId)).limit(1),
    ]);
    const proof = proofRows[0];
    const dispute = disputeRows[0];
    const payment = paymentRows[0];
    if (!proof || !dispute) throw new Error("COMPLETION_DISPUTE_NOT_FOUND");
    if (proof.status !== "disputed" || !["open", "under_review"].includes(dispute.status)) {
      throw new Error("COMPLETION_DISPUTE_INVALID_STATUS");
    }
    if (!payment || payment.status !== "held") throw new Error("ESCROW_NOT_HELD");
    const now = new Date();
    let settlementPending = false;
    if (data.resolution === "provider") {
      await releaseHeldEscrowInTransaction(tx, {
        requestId: data.requestId,
        completionProofId: proof.id,
        paymentId: payment.id,
        providerUserId,
        providerPayout: payment.providerPayout,
        reason: "admin_resolution",
        actorUserId: data.adminUserId,
      });
      await tx
        .update(jobCompletionProofs)
        .set({ status: "resolved", releasedAt: now, releaseReason: "admin_resolution" })
        .where(eq(jobCompletionProofs.id, proof.id));

      await tx
        .update(completionDisputes)
        .set({
          status: "resolved_provider",
          reviewedByUserId: data.adminUserId,
          resolutionNote: data.resolutionNote.trim(),
          resolvedAt: now,
        })
        .where(eq(completionDisputes.id, dispute.id));
    } else {
      // An administrative customer-favoring decision is not a payment event.
      // Keep escrow held until the signed provider callback confirms the refund.
      settlementPending = true;
      const reviewResult = await tx
        .update(completionDisputes)
        .set({
          status: "under_review",
          reviewedByUserId: data.adminUserId,
          resolutionNote: data.resolutionNote.trim(),
          resolvedAt: null,
          refundGatewayReference: null,
          refundVerifiedAt: null,
        })
        .where(
          and(
            eq(completionDisputes.id, dispute.id),
            inArray(completionDisputes.status, ["open", "under_review"]),
          ),
        );
      if ((reviewResult[0]?.affectedRows ?? 0) !== 1) {
        throw new Error("COMPLETION_DISPUTE_REVIEW_CONFLICT");
      }
    }
    return { requestId: data.requestId, resolution: data.resolution, settlementPending, resolvedAt: settlementPending ? null : now };
  });
  await logOperationEvent(
    outcome.settlementPending
      ? {
          eventType: "completion_dispute.refund_pending",
          subjectId: data.requestId,
          actorId: data.adminUserId,
          severity: "warning",
          payload: { resolution: data.resolution, paymentStatus: "held" },
        }
      : {
          eventType: "completion_dispute.resolved",
          subjectId: data.requestId,
          actorId: data.adminUserId,
          severity: "info",
          payload: { resolution: data.resolution },
        },
  );
  if (data.resolution === "provider") {
    await logOperationEvent({
      eventType: "escrow.released",
      subjectId: data.requestId,
      actorId: data.adminUserId,
      payload: { reason: "admin_resolution" },
    });
  }
  return outcome;
}

/**
 * Finalizes a customer-favoring completion-dispute decision only after a
 * verified full-refund gateway callback changed the payment from held to
 * refunded in the same database transaction.
 */
async function resolveCompletionDisputeRefundInTransaction(
  tx: DatabaseTransaction,
  payment: typeof payments.$inferSelect,
  gatewayReference: string,
) {
  const disputeRows = await tx
    .select()
    .from(completionDisputes)
    .where(eq(completionDisputes.requestId, payment.requestId))
    .limit(1);
  const dispute = disputeRows[0];
  if (!dispute || dispute.status !== "under_review" || !dispute.reviewedByUserId) return false;

  const proofRows = await tx
    .select()
    .from(jobCompletionProofs)
    .where(eq(jobCompletionProofs.id, dispute.completionProofId))
    .limit(1);
  const proof = proofRows[0];
  if (!proof || proof.requestId !== payment.requestId || proof.status !== "disputed") {
    throw new Error("COMPLETION_DISPUTE_REFUND_STATE_MISMATCH");
  }

  const now = new Date();
  const disputeUpdate = await tx
    .update(completionDisputes)
    .set({
      status: "resolved_customer",
      refundGatewayReference: gatewayReference,
      refundVerifiedAt: now,
      resolvedAt: now,
    })
    .where(and(eq(completionDisputes.id, dispute.id), eq(completionDisputes.status, "under_review")));
  if ((disputeUpdate[0]?.affectedRows ?? 0) !== 1) {
    throw new Error("COMPLETION_DISPUTE_REFUND_RESOLUTION_CONFLICT");
  }
  const proofUpdate = await tx
    .update(jobCompletionProofs)
    .set({ status: "resolved" })
    .where(and(eq(jobCompletionProofs.id, proof.id), eq(jobCompletionProofs.status, "disputed")));
  if ((proofUpdate[0]?.affectedRows ?? 0) !== 1) {
    throw new Error("COMPLETION_PROOF_REFUND_RESOLUTION_CONFLICT");
  }
  await tx.insert(jobTimelineEvents).values({
    requestId: payment.requestId,
    eventType: "completion_dispute.refund_verified",
    actorUserId: dispute.reviewedByUserId,
    referenceType: "completion_dispute_refund",
    referenceId: dispute.id,
    metadataJson: {
      disputeId: dispute.id,
      paymentId: payment.id,
      gatewayReference,
      resolution: "customer",
    },
  });
  return true;
}

export async function autoReleaseDueCompletionProofs(now = new Date(), limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const candidates = await db
    .select({ requestId: jobCompletionProofs.requestId })
    .from(jobCompletionProofs)
    .where(and(eq(jobCompletionProofs.status, "submitted"), lte(jobCompletionProofs.responseDueAt, now)))
    .limit(boundedLimit);
  const results: Array<{ requestId: number; released: boolean; duplicated: boolean; skipped?: string }> = [];

  for (const candidate of candidates) {
    try {
      const result = await db.transaction(async (tx) => {
        const [proofRows, disputeRows, paymentRows] = await Promise.all([
          tx.select().from(jobCompletionProofs).where(eq(jobCompletionProofs.requestId, candidate.requestId)).limit(1),
          tx.select().from(completionDisputes).where(eq(completionDisputes.requestId, candidate.requestId)).limit(1),
          tx.select().from(payments).where(eq(payments.requestId, candidate.requestId)).limit(1),
        ]);
        const proof = proofRows[0];
        const payment = paymentRows[0];
        if (!proof || proof.status !== "submitted" || proof.responseDueAt > now) {
          return { released: false, duplicated: true, skipped: "NO_LONGER_DUE" };
        }
        if (disputeRows[0]) return { released: false, duplicated: false, skipped: "DISPUTE_OPEN" };
        if (!payment || payment.status !== "held") return { released: false, duplicated: false, skipped: "ESCROW_NOT_HELD" };
        const contextRows = await tx
          .select({ providerUserId: providers.userId })
          .from(serviceRequests)
          .innerJoin(providers, eq(serviceRequests.assignedProviderId, providers.id))
          .where(eq(serviceRequests.id, candidate.requestId))
          .limit(1);
        const providerUserId = contextRows[0]?.providerUserId;
        if (!providerUserId) return { released: false, duplicated: false, skipped: "PROVIDER_MISSING" };
        const release = await releaseHeldEscrowInTransaction(tx, {
          requestId: candidate.requestId,
          completionProofId: proof.id,
          paymentId: payment.id,
          providerUserId,
          providerPayout: payment.providerPayout,
          reason: "auto_release",
        });
        await tx
          .update(jobCompletionProofs)
          .set({ status: "auto_approved", releasedAt: now, releaseReason: "auto_release" })
          .where(and(eq(jobCompletionProofs.id, proof.id), eq(jobCompletionProofs.status, "submitted")));
        return { released: release.released, duplicated: release.duplicated };
      });
      results.push({ requestId: candidate.requestId, ...result });
      if (result.released && !result.duplicated) {
        await logOperationEvent({
          eventType: "escrow.released",
          subjectId: candidate.requestId,
          payload: { reason: "auto_release" },
        });
      }
    } catch (error) {
      results.push({
        requestId: candidate.requestId,
        released: false,
        duplicated: false,
        skipped: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      });
    }
  }
  return results;
}

// ── Job Lifecycle Functions ──

// Accept an offer, capture commercial terms, and assign the provider in one transaction.
export async function acceptOffer(offerId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const offerRows = await tx.select().from(offers).where(eq(offers.id, offerId)).limit(1);
    const offer = offerRows[0];
    if (!offer) throw new Error("OFFER_NOT_FOUND");

    const requestRows = await tx
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, offer.requestId))
      .limit(1);
    const request = requestRows[0];
    if (!request) throw new Error("SERVICE_REQUEST_NOT_FOUND");
    if (request.userId !== userId) throw new Error("OFFER_ACCEPT_FORBIDDEN");
    if (request.status !== "pending") throw new Error("OFFER_ACCEPT_REQUEST_NOT_PENDING");
    if (offer.status !== "pending") throw new Error("OFFER_ACCEPT_NOT_PENDING");

    const providerRows = await tx
      .select()
      .from(providers)
      .where(eq(providers.id, offer.providerId))
      .limit(1);
    const provider = providerRows[0];
    if (!provider) throw new Error("OFFER_ACCEPT_PROVIDER_NOT_FOUND");

    const capabilityStatuses = await tx
      .select({
        capabilityId: providerCapabilityStatuses.capabilityId,
        jurisdictionId: providerCapabilityStatuses.jurisdictionId,
        status: providerCapabilityStatuses.status,
        expiresAt: providerCapabilityStatuses.expiresAt,
      })
      .from(providerCapabilityStatuses)
      .where(eq(providerCapabilityStatuses.providerId, provider.id));
    assertProviderCapabilityForRequest({ request, capabilityStatuses });
    const providerCredentialStatuses = await tx
      .select({
        jurisdictionId: providerCredentials.jurisdictionId,
        credentialType: providerCredentials.credentialType,
        assuranceLevel: providerCredentials.assuranceLevel,
        status: providerCredentials.status,
        expiresAt: providerCredentials.expiresAt,
        verifiedAt: providerCredentials.verifiedAt,
        reviewedByUserId: providerCredentials.reviewedByUserId,
        revocationStatus: providerCredentials.revocationStatus,
        ruleVersion: providerCredentials.ruleVersion,
      })
      .from(providerCredentials)
      .where(eq(providerCredentials.providerId, provider.id));
    assertProviderCredentialForRequest({ request, providerCredentials: providerCredentialStatuses });

    const detailRows = await tx
      .select()
      .from(serviceRequestDetails)
      .where(eq(serviceRequestDetails.requestId, request.id))
      .limit(1);
    const details = detailRows[0] ?? null;
    const [requestMediaRows, providerDocumentRows, providerCredentialRows] = await Promise.all([
      tx
        .select({
          id: serviceRequestMedia.id,
          purpose: serviceRequestMedia.purpose,
          kind: serviceRequestMedia.kind,
          originalName: serviceRequestMedia.originalName,
          mimeType: serviceRequestMedia.mimeType,
          sizeBytes: serviceRequestMedia.sizeBytes,
          sha256: serviceRequestMedia.sha256,
          createdAt: serviceRequestMedia.createdAt,
        })
        .from(serviceRequestMedia)
        .where(eq(serviceRequestMedia.requestId, request.id))
        .orderBy(serviceRequestMedia.createdAt, serviceRequestMedia.id),
      tx
        .select({
          id: providerDocuments.id,
          type: providerDocuments.type,
          status: providerDocuments.status,
          sha256: providerDocuments.sha256,
          mimeType: providerDocuments.mimeType,
          sizeBytes: providerDocuments.sizeBytes,
          reviewedAt: providerDocuments.reviewedAt,
          retentionDueAt: providerDocuments.retentionDueAt,
        })
        .from(providerDocuments)
        .where(and(eq(providerDocuments.providerId, provider.id), eq(providerDocuments.status, "approved")))
        .orderBy(providerDocuments.type, providerDocuments.id),
      tx
        .select({
          id: providerCredentials.id,
          documentId: providerCredentials.documentId,
          credentialType: providerCredentials.credentialType,
          status: providerCredentials.status,
          assuranceLevel: providerCredentials.assuranceLevel,
          verifiedAt: providerCredentials.verifiedAt,
          validFrom: providerCredentials.validFrom,
          expiresAt: providerCredentials.expiresAt,
          sourceVersion: providerCredentials.sourceVersion,
          ruleVersion: providerCredentials.ruleVersion,
        })
        .from(providerCredentials)
        .where(and(eq(providerCredentials.providerId, provider.id), eq(providerCredentials.status, "verified")))
        .orderBy(providerCredentials.credentialType, providerCredentials.id),
    ]);
    const settlementPolicy = await resolveSettlementPolicyInTransaction(tx, {
      categoryId: request.categoryId,
    });
    const breakdown = calculatePaymentBreakdown(offer.price, settlementPolicy.commissionRateBps);
    const completionReviewHours = settlementPolicy.completionReviewHours;
    const cancellationPolicy = parseCancellationPolicySnapshot(
      settlementPolicy.cancellationPolicyJson,
    );

    // The conditional request update is the concurrency guard: only one offer
    // may move a pending request to active, even if two accepts race.
    const requestUpdate = await tx
      .update(serviceRequests)
      .set({ assignedProviderId: offer.providerId, status: "active" })
      .where(
        and(
          eq(serviceRequests.id, request.id),
          eq(serviceRequests.userId, userId),
          eq(serviceRequests.status, "pending"),
        ),
      );
    if ((requestUpdate[0]?.affectedRows ?? 0) !== 1) {
      throw new Error("OFFER_ACCEPT_CONFLICT");
    }

    const acceptedOfferUpdate = await tx
      .update(offers)
      .set({ status: "accepted" })
      .where(and(eq(offers.id, offer.id), eq(offers.status, "pending")));
    if ((acceptedOfferUpdate[0]?.affectedRows ?? 0) !== 1) {
      throw new Error("OFFER_ACCEPT_CONFLICT");
    }

    await tx
      .update(offers)
      .set({ status: "rejected" })
      .where(and(eq(offers.requestId, request.id), eq(offers.status, "pending")));

    const snapshot = JSON.stringify({
      version: 1,
      acceptedAt: new Date().toISOString(),
      parties: {
        customerUserId: userId,
        providerId: provider.id,
        providerUserId: provider.userId,
      },
      request: {
        id: request.id,
        categoryId: request.categoryId,
        title: request.title,
        description: request.description,
        address: request.address,
        latitude: request.latitude,
        longitude: request.longitude,
        budgetMin: request.budgetMin,
        budgetMax: request.budgetMax,
        estimatedPrice: request.estimatedPrice,
      },
      serviceScope: details
        ? {
            serviceType: details.serviceType,
            subcategoryId: details.subcategoryId,
            pickupAddress: details.pickupAddress,
            destinationAddress: details.destinationAddress,
            distanceKm: details.distanceKm,
            pickupFloor: details.pickupFloor,
            destinationFloor: details.destinationFloor,
            pickupHasElevator: details.pickupHasElevator,
            destinationHasElevator: details.destinationHasElevator,
            attributesJson: details.attributesJson,
          }
        : null,
      evidenceSnapshot: {
        requestMedia: requestMediaRows,
        providerVerification: {
          status: provider.verificationStatus,
          approvedDocuments: providerDocumentRows,
          verifiedCredentials: providerCredentialRows,
        },
      },
      offer: {
        id: offer.id,
        price: offer.price,
        message: offer.message,
        estimatedTime: offer.estimatedTime,
        createdAt: offer.createdAt,
      },
      paymentTerms: {
        currency: "TRY",
        holdRequiredBeforeWork: true,
        agreedAmount: breakdown.amount,
        noSurprisePrice: {
          policyVersion: "no_surprise_price_v1",
          guaranteedAmount: breakdown.amount,
          maximumAmount: breakdown.amount,
          changeRule: "customer_approved_change_order_required",
        },
        commissionRateBps: breakdown.commissionRateBps,
        commissionAmount: breakdown.commissionAmount,
        providerPayout: breakdown.providerPayout,
        completionReviewHours,
        settlementCondition: "customer_approval_or_review_window_without_dispute",
        settlementPolicy: {
          id: settlementPolicy.id,
          scopeKey: settlementPolicy.scopeKey,
          version: settlementPolicy.version,
          countryCode: settlementPolicy.countryCode,
          categoryId: settlementPolicy.categoryId,
          contractType: settlementPolicy.contractType,
          gatewayProvider: settlementPolicy.gatewayProvider,
          commissionRateBps: settlementPolicy.commissionRateBps,
          cancellation: cancellationPolicy,
        },
      },
    });
    const agreementResult = await tx.insert(serviceAgreements).values({
      requestId: request.id,
      offerId: offer.id,
      customerUserId: userId,
      providerId: provider.id,
      currency: "TRY",
      agreedAmount: breakdown.amount,
      commissionRateBps: breakdown.commissionRateBps,
      commissionAmount: breakdown.commissionAmount,
      providerPayout: breakdown.providerPayout,
      completionReviewHours,
      snapshotJson: snapshot,
    });
    const agreementId = Number(agreementResult[0].insertId);
    if (!agreementId) throw new Error("AGREEMENT_CREATE_FAILED");
    const priceGuaranteeResult = await tx.insert(priceGuarantees).values({
      requestId: request.id,
      agreementId,
      customerUserId: userId,
      providerId: provider.id,
      currency: "TRY",
      guaranteedAmount: breakdown.amount,
      maximumAmount: breakdown.amount,
      status: "active",
      policyVersion: "no_surprise_price_v1",
    });
    const priceGuaranteeId = Number(priceGuaranteeResult[0].insertId);
    if (!priceGuaranteeId) throw new Error("PRICE_GUARANTEE_CREATE_FAILED");

    return { success: true, offerId: offer.id, requestId: request.id, agreementId, priceGuaranteeId };
  });
}

type JobChangeOrderKind = "scope" | "schedule" | "amount";
type JobCancellationReason = "schedule" | "provider_unavailable" | "customer_changed_mind" | "safety" | "other";
type JobCancellationSettlementOutcome = "refund" | "partial_refund" | "provider_payable" | "no_payment";

async function getAgreementPartyContextInTransaction(
  tx: DatabaseTransaction,
  requestId: number,
  userId: number,
  allowUnacceptedCustomerRequest = false,
) {
  const requestRows = await tx
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, requestId))
    .limit(1);
  const request = requestRows[0];
  if (!request) throw new Error("JOB_AGREEMENT_REQUEST_NOT_FOUND");

  const agreementRows = await tx
    .select()
    .from(serviceAgreements)
    .where(eq(serviceAgreements.requestId, requestId))
    .limit(1);
  const agreement = agreementRows[0] ?? null;
  if (!agreement) {
    if (allowUnacceptedCustomerRequest && request.status === "pending" && request.userId === userId) {
      return { request, agreement: null, actor: "customer" as const };
    }
    throw new Error("JOB_AGREEMENT_NOT_FOUND");
  }
  if (agreement.customerUserId === userId && request.userId === userId) {
    return { request, agreement, actor: "customer" as const };
  }
  const providerRows = await tx
    .select({ userId: providers.userId })
    .from(providers)
    .where(eq(providers.id, agreement.providerId))
    .limit(1);
  if (providerRows[0]?.userId === userId) {
    return { request, agreement, actor: "provider" as const };
  }
  throw new Error("JOB_AGREEMENT_FORBIDDEN");
}

async function assertOwnedJobEvidenceInTransaction(
  tx: DatabaseTransaction,
  requestId: number,
  userId: number,
  mediaIds: number[],
) {
  const uniqueMediaIds = [...new Set(mediaIds)];
  if (uniqueMediaIds.length !== mediaIds.length || uniqueMediaIds.length > 8) {
    throw new Error("JOB_EVIDENCE_INVALID");
  }
  if (uniqueMediaIds.length === 0) return [];
  const mediaRows = await tx
    .select({ id: serviceRequestMedia.id })
    .from(serviceRequestMedia)
    .where(
      and(
        eq(serviceRequestMedia.requestId, requestId),
        eq(serviceRequestMedia.ownerUserId, userId),
        inArray(serviceRequestMedia.id, uniqueMediaIds),
      ),
    );
  if (mediaRows.length !== uniqueMediaIds.length) throw new Error("JOB_EVIDENCE_FORBIDDEN");
  return uniqueMediaIds;
}

export async function createJobChangeOrder(data: {
  requestId: number;
  userId: number;
  kind: JobChangeOrderKind;
  description: string;
  amountDelta: number;
  evidenceMediaIds?: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const description = data.description.trim();
  if (description.length < 10 || description.length > 2_000) throw new Error("CHANGE_ORDER_DESCRIPTION_INVALID");
  if (!Number.isInteger(data.amountDelta) || data.amountDelta < 0 || data.amountDelta > 1_000_000) {
    throw new Error("CHANGE_ORDER_AMOUNT_INVALID");
  }
  if ((data.kind === "amount") !== (data.amountDelta > 0)) {
    throw new Error("CHANGE_ORDER_AMOUNT_KIND_MISMATCH");
  }

  return db.transaction(async (tx) => {
    const context = await getAgreementPartyContextInTransaction(tx, data.requestId, data.userId);
    if (!context.agreement) throw new Error("JOB_AGREEMENT_NOT_FOUND");
    if (context.request.status !== "active") throw new Error("CHANGE_ORDER_REQUEST_INVALID_STATUS");
    const evidenceMediaIds = await assertOwnedJobEvidenceInTransaction(
      tx,
      data.requestId,
      data.userId,
      data.evidenceMediaIds ?? [],
    );
    const result = await tx.insert(jobChangeOrders).values({
      requestId: data.requestId,
      agreementId: context.agreement.id,
      requestedByUserId: data.userId,
      kind: data.kind,
      description,
      amountDelta: data.amountDelta,
      evidenceJson: evidenceMediaIds.length ? JSON.stringify(evidenceMediaIds) : null,
      status: "requested",
    });
    const rows = await tx
      .select()
      .from(jobChangeOrders)
      .where(eq(jobChangeOrders.id, Number(result[0].insertId)))
      .limit(1);
    if (!rows[0]) throw new Error("CHANGE_ORDER_CREATE_FAILED");
    return rows[0];
  });
}

export async function respondToJobChangeOrder(data: {
  changeOrderId: number;
  userId: number;
  decision: "accepted" | "rejected";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(jobChangeOrders).where(eq(jobChangeOrders.id, data.changeOrderId)).limit(1);
    const changeOrder = rows[0];
    if (!changeOrder) throw new Error("CHANGE_ORDER_NOT_FOUND");
    const context = await getAgreementPartyContextInTransaction(tx, changeOrder.requestId, data.userId);
    if (!context.agreement) throw new Error("JOB_AGREEMENT_NOT_FOUND");
    if (context.agreement.id !== changeOrder.agreementId) throw new Error("CHANGE_ORDER_AGREEMENT_MISMATCH");
    if (changeOrder.requestedByUserId === data.userId) throw new Error("CHANGE_ORDER_SELF_RESPONSE_FORBIDDEN");
    if (changeOrder.status !== "requested") throw new Error("CHANGE_ORDER_NOT_PENDING");
    const updateResult = await tx
      .update(jobChangeOrders)
      .set({ status: data.decision, respondedByUserId: data.userId, respondedAt: new Date() })
      .where(and(eq(jobChangeOrders.id, changeOrder.id), eq(jobChangeOrders.status, "requested")));
    if ((updateResult[0]?.affectedRows ?? 0) !== 1) throw new Error("CHANGE_ORDER_RESPONSE_CONFLICT");
    const updatedRows = await tx.select().from(jobChangeOrders).where(eq(jobChangeOrders.id, changeOrder.id)).limit(1);
    if (!updatedRows[0]) throw new Error("CHANGE_ORDER_NOT_FOUND");
    return updatedRows[0];
  });
}

export async function withdrawJobChangeOrder(changeOrderId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(jobChangeOrders).where(eq(jobChangeOrders.id, changeOrderId)).limit(1);
    const changeOrder = rows[0];
    if (!changeOrder) throw new Error("CHANGE_ORDER_NOT_FOUND");
    await getAgreementPartyContextInTransaction(tx, changeOrder.requestId, userId);
    if (changeOrder.requestedByUserId !== userId) throw new Error("CHANGE_ORDER_WITHDRAW_FORBIDDEN");
    if (changeOrder.status !== "requested") throw new Error("CHANGE_ORDER_NOT_PENDING");
    const updateResult = await tx
      .update(jobChangeOrders)
      .set({ status: "withdrawn" })
      .where(and(eq(jobChangeOrders.id, changeOrder.id), eq(jobChangeOrders.status, "requested")));
    if ((updateResult[0]?.affectedRows ?? 0) !== 1) throw new Error("CHANGE_ORDER_RESPONSE_CONFLICT");
    return { success: true, changeOrderId };
  });
}

export async function listJobChangeOrders(requestId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const context = await getAgreementPartyContextInTransaction(tx, requestId, userId);
    if (!context.agreement) throw new Error("JOB_AGREEMENT_NOT_FOUND");
    return tx
      .select()
      .from(jobChangeOrders)
      .where(and(eq(jobChangeOrders.requestId, requestId), eq(jobChangeOrders.agreementId, context.agreement.id)))
      .orderBy(desc(jobChangeOrders.createdAt));
  });
}

/** MoveOS denetimi için salt-okunur, MFA korumalı listeleme; taraf kararlarını değiştirmez. */
export async function listJobChangeOrdersForAdmin(input: {
  limit: number;
  offset: number;
  status?: "requested" | "accepted" | "rejected" | "withdrawn" | "expired";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(jobChangeOrders)
    .where(input.status ? eq(jobChangeOrders.status, input.status) : undefined)
    .orderBy(desc(jobChangeOrders.createdAt))
    .limit(input.limit)
    .offset(input.offset);
}

export async function openJobCancellation(data: {
  requestId: number;
  userId: number;
  reasonCode: JobCancellationReason;
  description: string;
  evidenceMediaIds?: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const description = data.description.trim();
  if (description.length < 10 || description.length > 2_000) throw new Error("CANCELLATION_DESCRIPTION_INVALID");
  return db.transaction(async (tx) => {
    const context = await getAgreementPartyContextInTransaction(tx, data.requestId, data.userId, true);
    if (context.request.status === "completed" || context.request.status === "cancelled") {
      throw new Error("CANCELLATION_REQUEST_INVALID_STATUS");
    }
    const existingRows = await tx
      .select()
      .from(jobCancellationCases)
      .where(eq(jobCancellationCases.requestId, data.requestId))
      .limit(1);
    if (existingRows[0]) throw new Error("CANCELLATION_ALREADY_OPEN");
    const evidenceMediaIds = await assertOwnedJobEvidenceInTransaction(
      tx,
      data.requestId,
      data.userId,
      data.evidenceMediaIds ?? [],
    );
    const result = await tx.insert(jobCancellationCases).values({
      requestId: data.requestId,
      agreementId: context.agreement?.id ?? null,
      openedByUserId: data.userId,
      reasonCode: data.reasonCode,
      description,
      evidenceJson: evidenceMediaIds.length ? JSON.stringify(evidenceMediaIds) : null,
      status: "requested",
      settlementOutcome: "pending",
    });
    const rows = await tx
      .select()
      .from(jobCancellationCases)
      .where(eq(jobCancellationCases.id, Number(result[0].insertId)))
      .limit(1);
    if (!rows[0]) throw new Error("CANCELLATION_CREATE_FAILED");
    return rows[0];
  });
}

export async function getJobCancellation(requestId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    await getAgreementPartyContextInTransaction(tx, requestId, userId, true);
    const rows = await tx
      .select()
      .from(jobCancellationCases)
      .where(eq(jobCancellationCases.requestId, requestId))
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function withdrawJobCancellation(requestId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const context = await getAgreementPartyContextInTransaction(tx, requestId, userId, true);
    const rows = await tx
      .select()
      .from(jobCancellationCases)
      .where(eq(jobCancellationCases.requestId, requestId))
      .limit(1);
    const cancellation = rows[0];
    if (!cancellation) throw new Error("CANCELLATION_NOT_FOUND");
    if (cancellation.openedByUserId !== userId) throw new Error("CANCELLATION_WITHDRAW_FORBIDDEN");
    if (cancellation.status !== "requested") throw new Error("CANCELLATION_NOT_PENDING");
    if (context.agreement && cancellation.agreementId !== context.agreement.id) {
      throw new Error("CANCELLATION_AGREEMENT_MISMATCH");
    }
    const updateResult = await tx
      .update(jobCancellationCases)
      .set({ status: "withdrawn" })
      .where(and(eq(jobCancellationCases.id, cancellation.id), eq(jobCancellationCases.status, "requested")));
    if ((updateResult[0]?.affectedRows ?? 0) !== 1) throw new Error("CANCELLATION_WITHDRAW_CONFLICT");
    return { success: true, cancellationId: cancellation.id };
  });
}

export async function listJobCancellationCasesForAdmin(input: {
  limit: number;
  offset: number;
  status?: "requested" | "under_review" | "resolved" | "withdrawn";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(jobCancellationCases)
    .where(input.status ? eq(jobCancellationCases.status, input.status) : undefined)
    .orderBy(desc(jobCancellationCases.createdAt))
    .limit(input.limit)
    .offset(input.offset);
}

/** A review records a proposed outcome only; no funds move until a verified gateway event. */
export async function reviewJobCancellationForAdmin(data: {
  requestId: number;
  reviewerUserId: number;
  settlementOutcome: JobCancellationSettlementOutcome;
  resolutionNote: string;
  refundAmount?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const resolutionNote = data.resolutionNote.trim();
  if (resolutionNote.length < 10 || resolutionNote.length > 2_000) {
    throw new Error("CANCELLATION_RESOLUTION_NOTE_INVALID");
  }

  const outcome = await db.transaction(async (tx) => {
    const cancellationRows = await tx
      .select()
      .from(jobCancellationCases)
      .where(eq(jobCancellationCases.requestId, data.requestId))
      .limit(1);
    const cancellation = cancellationRows[0];
    if (!cancellation) throw new Error("CANCELLATION_NOT_FOUND");
    if (cancellation.status !== "requested" && cancellation.status !== "under_review") {
      throw new Error("CANCELLATION_NOT_REVIEWABLE");
    }

    const paymentRows = await tx
      .select()
      .from(payments)
      .where(eq(payments.requestId, data.requestId))
      .limit(1);
    const payment = paymentRows[0] ?? null;
    const now = new Date();
    const hasRequestedRefund = data.refundAmount !== undefined;
    if (hasRequestedRefund && (!Number.isSafeInteger(data.refundAmount) || data.refundAmount! < 0)) {
      throw new Error("CANCELLATION_REFUND_AMOUNT_INVALID");
    }

    if (data.settlementOutcome === "no_payment") {
      if (payment && payment.status !== "pending") {
        throw new Error("CANCELLATION_NO_PAYMENT_OUTCOME_INVALID");
      }
      if (hasRequestedRefund) throw new Error("CANCELLATION_NO_PAYMENT_REFUND_AMOUNT_INVALID");
      const resolved = await tx
        .update(jobCancellationCases)
        .set({
          status: "resolved",
          settlementOutcome: "no_payment",
          resolutionNote,
          reviewedByUserId: data.reviewerUserId,
          reviewedAt: now,
          resolvedByUserId: data.reviewerUserId,
          resolvedAt: now,
          refundAmount: null,
          providerGrossAmount: null,
          commissionAmount: null,
          providerPayoutAmount: null,
        })
        .where(
          and(
            eq(jobCancellationCases.id, cancellation.id),
            inArray(jobCancellationCases.status, ["requested", "under_review"]),
          ),
        );
      if ((resolved[0]?.affectedRows ?? 0) !== 1) throw new Error("CANCELLATION_REVIEW_CONFLICT");
      const requestResult = await tx
        .update(serviceRequests)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(serviceRequests.id, data.requestId),
            inArray(serviceRequests.status, ["pending", "active"]),
          ),
        );
      if ((requestResult[0]?.affectedRows ?? 0) !== 1) throw new Error("CANCELLATION_REQUEST_UPDATE_CONFLICT");
    } else {
      if (!payment || payment.status !== "held") {
        throw new Error("CANCELLATION_SETTLEMENT_REQUIRES_HELD_PAYMENT");
      }
      const settlementPlan = calculateCancellationSettlementPlan({
        paymentAmount: payment.amount,
        commissionRateBps: payment.commissionRateBps ?? 0,
        settlementOutcome: data.settlementOutcome,
        ...(hasRequestedRefund ? { refundAmount: data.refundAmount } : {}),
      });
      const reviewed = await tx
        .update(jobCancellationCases)
        .set({
          status: "under_review",
          settlementOutcome: data.settlementOutcome,
          resolutionNote,
          reviewedByUserId: data.reviewerUserId,
          reviewedAt: now,
          refundAmount: settlementPlan.refundAmount,
          providerGrossAmount: settlementPlan.providerGrossAmount,
          commissionAmount: settlementPlan.commissionAmount,
          providerPayoutAmount: settlementPlan.providerPayoutAmount,
        })
        .where(
          and(
            eq(jobCancellationCases.id, cancellation.id),
            inArray(jobCancellationCases.status, ["requested", "under_review"]),
          ),
        );
      if ((reviewed[0]?.affectedRows ?? 0) !== 1) throw new Error("CANCELLATION_REVIEW_CONFLICT");
    }

    const rows = await tx
      .select()
      .from(jobCancellationCases)
      .where(eq(jobCancellationCases.id, cancellation.id))
      .limit(1);
    if (!rows[0]) throw new Error("CANCELLATION_NOT_FOUND");
    return rows[0];
  });
  await logOperationEvent({
    eventType: "cancellation.reviewed",
    subjectId: data.requestId,
    actorId: data.reviewerUserId,
    severity: data.settlementOutcome === "no_payment" ? "info" : "warning",
    payload: {
      cancellationId: outcome.id,
      settlementOutcome: data.settlementOutcome,
      status: outcome.status,
      refundAmount: outcome.refundAmount,
      providerPayoutAmount: outcome.providerPayoutAmount,
    },
  });
  return outcome;
}

async function resolveRefundCancellationInTransaction(
  tx: DatabaseTransaction,
  payment: typeof payments.$inferSelect,
) {
  const cancellationRows = await tx
    .select()
    .from(jobCancellationCases)
    .where(eq(jobCancellationCases.requestId, payment.requestId))
    .limit(1);
  const cancellation = cancellationRows[0];
  if (
    !cancellation ||
    cancellation.status !== "under_review" ||
    cancellation.settlementOutcome !== "refund" ||
    !cancellation.reviewedByUserId
  ) {
    return false;
  }
  const now = new Date();
  const resolved = await tx
    .update(jobCancellationCases)
    .set({ status: "resolved", resolvedByUserId: cancellation.reviewedByUserId, resolvedAt: now })
    .where(and(eq(jobCancellationCases.id, cancellation.id), eq(jobCancellationCases.status, "under_review")));
  if ((resolved[0]?.affectedRows ?? 0) !== 1) throw new Error("CANCELLATION_REFUND_RESOLUTION_CONFLICT");
  const requestResult = await tx
    .update(serviceRequests)
    .set({ status: "cancelled" })
    .where(and(eq(serviceRequests.id, payment.requestId), eq(serviceRequests.status, "active")));
  if ((requestResult[0]?.affectedRows ?? 0) !== 1) throw new Error("CANCELLATION_REQUEST_UPDATE_CONFLICT");
  return true;
}

async function resolvePartialRefundCancellationInTransaction(
  tx: DatabaseTransaction,
  payment: typeof payments.$inferSelect,
  data: { refundAmount: number; gatewayReference: string },
) {
  const cancellationRows = await tx
    .select()
    .from(jobCancellationCases)
    .where(eq(jobCancellationCases.requestId, payment.requestId))
    .limit(1);
  const cancellation = cancellationRows[0];
  if (
    !cancellation ||
    cancellation.status !== "under_review" ||
    cancellation.settlementOutcome !== "partial_refund" ||
    !cancellation.reviewedByUserId ||
    cancellation.refundAmount !== data.refundAmount ||
    !cancellation.providerGrossAmount ||
    cancellation.commissionAmount == null ||
    cancellation.providerPayoutAmount == null
  ) {
    throw new Error("CANCELLATION_PARTIAL_REFUND_PLAN_MISMATCH");
  }
  if (payment.status !== "held") throw new Error("CANCELLATION_SETTLEMENT_REQUIRES_HELD_PAYMENT");
  if (data.refundAmount <= 0 || data.refundAmount >= payment.amount) {
    throw new Error("CANCELLATION_PARTIAL_REFUND_AMOUNT_INVALID");
  }

  const providerRows = await tx
    .select({ userId: providers.userId })
    .from(providers)
    .where(eq(providers.id, payment.providerId))
    .limit(1);
  const providerUserId = providerRows[0]?.userId;
  if (!providerUserId) throw new Error("CANCELLATION_PROVIDER_NOT_FOUND");

  const paymentUpdate = await tx
    .update(payments)
    .set({ status: "released" })
    .where(and(eq(payments.id, payment.id), eq(payments.status, "held")));
  if ((paymentUpdate[0]?.affectedRows ?? 0) !== 1) throw new Error("CANCELLATION_PARTIAL_PAYMENT_CONFLICT");

  await postFinancialLedgerEntry(
    tx,
    buildCancellationPartialRefundLedgerEntry(payment, {
      refundAmount: data.refundAmount,
      gatewayReference: data.gatewayReference,
    }),
  );
  await postFinancialLedgerEntry(
    tx,
    buildCancellationProviderSettlementLedgerEntry(payment, {
      providerGrossAmount: cancellation.providerGrossAmount,
      commissionAmount: cancellation.commissionAmount,
      providerPayoutAmount: cancellation.providerPayoutAmount,
      gatewayReference: data.gatewayReference,
    }),
  );

  const walletIdempotencyKey = `cancellation-settlement:${payment.id}:${data.gatewayReference}`;
  await tx
    .insert(walletAccounts)
    .values({ userId: providerUserId, currency: "TRY" })
    .onDuplicateKeyUpdate({ set: { userId: providerUserId } });
  if (cancellation.providerPayoutAmount > 0) {
    await tx
      .update(walletAccounts)
      .set({ availableBalance: sql`${walletAccounts.availableBalance} + ${cancellation.providerPayoutAmount}` })
      .where(eq(walletAccounts.userId, providerUserId));
    await tx.insert(walletTransactions).values({
      userId: providerUserId,
      type: "provider_payout",
      status: "completed",
      amount: cancellation.providerPayoutAmount,
      description: "Kısmi iade sonrası sağlayıcı ödemesi",
      reference: `payment:${payment.id}`,
      idempotencyKey: walletIdempotencyKey,
      metadata: JSON.stringify({
        requestId: payment.requestId,
        cancellationId: cancellation.id,
        gatewayReference: data.gatewayReference,
        refundAmount: data.refundAmount,
      }),
    });
  }

  const now = new Date();
  const resolved = await tx
    .update(jobCancellationCases)
    .set({ status: "resolved", resolvedByUserId: cancellation.reviewedByUserId, resolvedAt: now })
    .where(and(eq(jobCancellationCases.id, cancellation.id), eq(jobCancellationCases.status, "under_review")));
  if ((resolved[0]?.affectedRows ?? 0) !== 1) throw new Error("CANCELLATION_PARTIAL_REFUND_RESOLUTION_CONFLICT");
  const requestResult = await tx
    .update(serviceRequests)
    .set({ status: "cancelled" })
    .where(and(eq(serviceRequests.id, payment.requestId), eq(serviceRequests.status, "active")));
  if ((requestResult[0]?.affectedRows ?? 0) !== 1) throw new Error("CANCELLATION_REQUEST_UPDATE_CONFLICT");
  return true;
}

export async function rejectOffer(offerId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const offerRows = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
  if (offerRows.length === 0) throw new Error("Offer not found");
  const offer = offerRows[0];

  const requestRows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, offer.requestId))
    .limit(1);
  if (requestRows.length === 0) throw new Error("Service request not found");
  if (requestRows[0].userId !== userId) throw new Error("Not authorized to reject this offer");
  if (requestRows[0].status !== "pending") throw new Error("Service request is not accepting offers");
  if (offer.status !== "pending") throw new Error("Offer is not pending");

  await db.update(offers).set({ status: "rejected" }).where(eq(offers.id, offerId));
  return { success: true, offerId, requestId: offer.requestId };
}

// Update job status (for provider lifecycle: active → in_progress → completed)
export async function updateJobStatus(requestId: number, status: "pending" | "active" | "completed" | "cancelled", userId: number) {
  void requestId;
  void status;
  void userId;
  // This legacy generic mutation could bypass accepted-offer, capability,
  // completion-proof, cancellation-review and escrow settlement controls.
  // Canonical flows are offers.accept, tracking.updateLifecycle, completion,
  // and cancellation; therefore this compatibility entry point must not write.
  throw new Error("LEGACY_JOB_STATUS_MUTATION_DISABLED");
}

// Complete a job and create payment record
export async function completeJob(requestId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).limit(1);
  if (rows.length === 0) throw new Error("Service request not found");
  const request = rows[0];

  // Only assigned provider can mark as completed
  if (request.assignedProviderId !== userId) {
    throw new Error("Only the assigned provider can complete this job");
  }

  if (request.status === "completed") return { success: true, requestId, alreadyCompleted: true };

  await db.transaction(async (tx) => {
    await tx.update(serviceRequests).set({ status: "completed" }).where(eq(serviceRequests.id, requestId));
    await tx.insert(jobTimelineEvents).values(
      buildJobCompletionTimelineEvent({ requestId, actorUserId: userId, source: "provider_completion" }),
    ).onDuplicateKeyUpdate({ set: { eventType: "job_completed" } });
  });

  // Increment provider's completedJobs
  if (request.assignedProviderId) {
    const providerRows = await db.select().from(providers).where(eq(providers.id, request.assignedProviderId)).limit(1);
    if (providerRows.length > 0) {
      const currentCompleted = (providerRows[0].completedJobs ?? 0) as number;
      await db.update(providers).set({ completedJobs: currentCompleted + 1 }).where(eq(providers.id, request.assignedProviderId));
    }
  }

  return { success: true, requestId, alreadyCompleted: false };
}

// Reviews
export async function createReview(data: {
  requestId: number;
  userId: number;
  providerId: number;
  rating: number;
  comment?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const requestRows = await tx
      .select()
      .from(serviceRequests)
      .where(and(eq(serviceRequests.id, data.requestId), eq(serviceRequests.userId, data.userId)))
      .limit(1);
    const request = requestRows[0];
    if (!request) throw new Error("Hizmet talebi bulunamadı");
    if (request.status !== "completed") throw new Error("Yalnızca tamamlanan işler değerlendirilebilir");
    if (request.assignedProviderId !== data.providerId) throw new Error("Bu profesyonel ilgili işe atanmamış");

    const existing = await tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.requestId, data.requestId))
      .limit(1);
    if (existing[0]) throw new Error("Bu iş daha önce değerlendirildi");

    const providerRows = await tx
      .select()
      .from(providers)
      .where(eq(providers.id, data.providerId))
      .limit(1);
    const provider = providerRows[0];
    if (!provider) throw new Error("Profesyonel bulunamadı");

    const countRows = await tx
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(eq(reviews.providerId, data.providerId));
    const reviewCount = Number(countRows[0]?.count ?? 0);
    const currentRating = Number(provider.rating ?? 0);
    const newRating = Math.round((currentRating * reviewCount + data.rating) / (reviewCount + 1));

    const result = await tx.insert(reviews).values({
      requestId: data.requestId,
      userId: data.userId,
      providerId: data.providerId,
      rating: data.rating,
      comment: data.comment?.trim() || null,
    });
    await tx.update(providers).set({ rating: newRating }).where(eq(providers.id, data.providerId));

    return { success: true, reviewId: result[0].insertId };
  });
}

export async function getProviderReviews(providerId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: reviews.id,
      requestId: reviews.requestId,
      providerId: reviews.providerId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      reviewerName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.providerId, providerId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit)
    .offset(offset);
}

// Provider dashboard: get jobs assigned to a provider
export async function getProviderJobs(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  // Find the provider record by userId
  const providerRows = await db.select().from(providers).where(eq(providers.userId, providerId)).limit(1);
  if (providerRows.length === 0) return [];

  const providerRecordId = providerRows[0].id;

  // Get all service requests assigned to this provider
  return db.select().from(serviceRequests).where(eq(serviceRequests.assignedProviderId, providerRecordId));
}

// Get provider earnings
export async function getProviderEarnings(providerId: number) {
  const db = await getDb();
  if (!db) return { totalEarnings: 0, todayEarnings: 0, pendingPayments: 0, completedJobs: 0 };

  const providerRows = await db.select().from(providers).where(eq(providers.userId, providerId)).limit(1);
  if (providerRows.length === 0) return { totalEarnings: 0, todayEarnings: 0, pendingPayments: 0, completedJobs: 0 };

  const providerRecordId = providerRows[0].id;

  // Get all payments for this provider
  const paymentRows = await db.select().from(payments).where(eq(payments.providerId, providerRecordId));

  const releasedPayments = paymentRows.filter((payment) => payment.status === "released");
  const providerNetAmount = (payment: (typeof paymentRows)[number]) =>
    payment.providerPayout ?? Math.max(0, (payment.amount ?? 0) - (payment.commissionAmount ?? 0));
  const totalEarnings = releasedPayments.reduce((sum, payment) => sum + providerNetAmount(payment), 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEarnings = releasedPayments
    .filter((payment) => payment.updatedAt >= today)
    .reduce((sum, payment) => sum + providerNetAmount(payment), 0);
  const pendingPayments = paymentRows
    .filter(p => p.status === "pending" || p.status === "held")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    totalEarnings,
    todayEarnings,
    pendingPayments,
    completedJobs: providerRows[0].completedJobs ?? 0,
  };
}

/** Provider-owned operating summary; derives all values from authoritative job, payment and review records. */
export async function getProviderBusinessCockpit(userId: number) {
  const provider = await getProviderProfile(userId);
  if (!provider) throw new Error("PROVIDER_PROFILE_NOT_FOUND");

  const [jobs, earnings, recentReviews] = await Promise.all([
    getProviderJobs(userId),
    getProviderEarnings(userId),
    getProviderReviews(provider.id, 20, 0),
  ]);
  const completed = jobs.filter((job) => job.status === "completed").length;
  const cancelled = jobs.filter((job) => job.status === "cancelled").length;
  const active = jobs.filter((job) => ["accepted", "scheduled", "on_the_way", "arrived", "in_progress", "active"].includes(job.status)).length;
  const completedOrCancelled = completed + cancelled;

  return {
    availability: provider.isAvailable === 1,
    activeJobs: active,
    // The current service-request lifecycle has no separate scheduled state.
    // Do not infer one from an unrelated status or present a fabricated count.
    scheduledJobs: null,
    completedJobs: completed,
    cancellationRate: completedOrCancelled === 0 ? null : Math.round((cancelled / completedOrCancelled) * 10_000) / 100,
    averageRating: provider.rating ?? null,
    recentReviewCount: recentReviews.length,
    earnings,
  };
}

// Get new jobs for a provider (pending requests in their category)
export async function getNewJobsForProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  const providerRows = await db.select().from(providers).where(eq(providers.userId, providerId)).limit(1);
  if (providerRows.length === 0) return [];

  const provider = providerRows[0];
  const categoryId = provider.categoryId;
  if (!categoryId || provider.isAvailable !== 1) return [];

  const capabilityStatuses = await db
    .select({
      capabilityId: providerCapabilityStatuses.capabilityId,
      jurisdictionId: providerCapabilityStatuses.jurisdictionId,
      status: providerCapabilityStatuses.status,
      expiresAt: providerCapabilityStatuses.expiresAt,
    })
    .from(providerCapabilityStatuses)
    .where(eq(providerCapabilityStatuses.providerId, provider.id));
  const providerCredentialStatuses = await listProviderCredentialStatuses(provider.id);

  // Only unassigned pending requests in the provider's category are genuine
  // opportunities. Fetch a bounded candidate set, then apply deterministic
  // proximity filtering when both sides have valid coordinates. Legacy rows
  // without coordinates remain visible instead of being silently lost.
  const candidates = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.categoryId, categoryId),
        eq(serviceRequests.status, "pending"),
        isNull(serviceRequests.assignedProviderId),
      ),
    )
    .orderBy(desc(serviceRequests.createdAt))
    .limit(100);

  const eligibleCandidates = candidates.filter((candidate) => {
    const capabilityStatus =
      candidate.requiredCapabilityId == null || candidate.jurisdictionId == null
        ? null
        : capabilityStatuses.find(
            (status) =>
              status.capabilityId === candidate.requiredCapabilityId &&
              status.jurisdictionId === candidate.jurisdictionId,
          ) ?? null;
    const capabilityAllowed = evaluateCapabilityTransition({
      enforcementEnabled: candidate.requiredCapabilityId !== null,
      requiredCapabilityId: candidate.requiredCapabilityId,
      jurisdictionId: candidate.jurisdictionId,
      providerCapabilityDecision: capabilityStatus?.status ?? null,
      providerCapabilityExpiresAt: capabilityStatus?.expiresAt ?? null,
    }).allowed;
    if (!capabilityAllowed) return false;
    return evaluateCredentialEligibility({
      requiredCredentialType: candidate.requiredCredentialType,
      minimumAssurance: candidate.requiredCredentialAssurance,
      requiresHumanReview:
        candidate.requiresCredentialHumanReview == null
          ? null
          : candidate.requiresCredentialHumanReview === 1,
      compliancePackageVersion: candidate.compliancePackageVersion,
      jurisdictionId: candidate.jurisdictionId,
      providerCredentials: providerCredentialStatuses,
    }).allowed;
  });

  return rankServiceOpportunitiesByLocation(
    eligibleCandidates,
    provider.latitude,
    provider.longitude,
  ).slice(0, 20);
}

export async function getPaymentQuote(requestId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const requestRows = await db
    .select()
    .from(serviceRequests)
    .where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.userId, userId)))
    .limit(1);
  const request = requestRows[0];
  if (!request) throw new Error("PAYMENT_REQUEST_NOT_FOUND");
  if (request.status !== "active" || request.assignedProviderId == null) {
    throw new Error("PAYMENT_REQUEST_NOT_READY");
  }

  const agreementRows = await db
    .select()
    .from(serviceAgreements)
    .where(
      and(
        eq(serviceAgreements.requestId, request.id),
        eq(serviceAgreements.customerUserId, userId),
      ),
    )
    .limit(1);
  const agreement = agreementRows[0];
  if (!agreement) throw new Error("PAYMENT_AGREEMENT_NOT_FOUND");
  if (agreement.providerId !== request.assignedProviderId) {
    throw new Error("PAYMENT_AGREEMENT_MISMATCH");
  }
  if (agreement.currency !== "TRY") throw new Error("PAYMENT_CURRENCY_UNSUPPORTED");
  const guaranteeRows = await db
    .select()
    .from(priceGuarantees)
    .where(
      and(
        eq(priceGuarantees.requestId, request.id),
        eq(priceGuarantees.agreementId, agreement.id),
        eq(priceGuarantees.customerUserId, userId),
        eq(priceGuarantees.status, "active"),
      ),
    )
    .limit(1);
  const guarantee = guaranteeRows[0];
  if (!guarantee) throw new Error("PAYMENT_PRICE_GUARANTEE_NOT_FOUND");
  if (
    guarantee.currency !== "TRY" ||
    guarantee.guaranteedAmount !== agreement.agreedAmount ||
    guarantee.maximumAmount !== agreement.agreedAmount
  ) {
    throw new Error("PAYMENT_PRICE_GUARANTEE_MISMATCH");
  }

  const providerRows = await db
    .select()
    .from(providers)
    .where(eq(providers.id, agreement.providerId))
    .limit(1);
  const provider = providerRows[0];
  if (!provider) throw new Error("PAYMENT_PROVIDER_NOT_FOUND");

  return {
    requestId: request.id,
    requestTitle: request.title,
    providerId: provider.id,
    providerName: provider.displayName,
    offerId: agreement.offerId,
    agreementId: agreement.id,
    completionReviewHours: agreement.completionReviewHours,
    currency: "TRY" as const,
    amount: agreement.agreedAmount,
    priceGuarantee: {
      id: guarantee.id,
      policyVersion: guarantee.policyVersion,
      guaranteedAmount: guarantee.guaranteedAmount,
      maximumAmount: guarantee.maximumAmount,
      status: guarantee.status,
    },
    commissionRateBps: agreement.commissionRateBps,
    commissionAmount: agreement.commissionAmount,
    providerPayout: agreement.providerPayout,
  };
}

/** Returns the immutable, customer-visible price ceiling to an authorized job participant. */
export async function getPriceGuarantee(input: { requestId: number; userId: number }) {
  await assertPhaseDRequestParticipant(input.requestId, input.userId);
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select()
    .from(priceGuarantees)
    .where(eq(priceGuarantees.requestId, input.requestId))
    .limit(1);
  const guarantee = rows[0];
  if (!guarantee) throw new Error("PRICE_GUARANTEE_NOT_FOUND");
  return {
    id: guarantee.id,
    requestId: guarantee.requestId,
    agreementId: guarantee.agreementId,
    currency: guarantee.currency,
    guaranteedAmount: guarantee.guaranteedAmount,
    maximumAmount: guarantee.maximumAmount,
    status: guarantee.status,
    policyVersion: guarantee.policyVersion,
    acceptedAt: guarantee.acceptedAt,
    supersededAt: guarantee.supersededAt,
  };
}

// Creates only a pending intent. A verified gateway webhook is responsible for pending -> held.
export async function createPayment(data: {
  requestId: number;
  userId: number;
  idempotencyKey: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const quote = await getPaymentQuote(data.requestId, data.userId);
  const scopedKey = `${data.userId}:${data.idempotencyKey}`;

  const createIntent = async () => db.transaction(async (tx) => {
    const existingByKey = await tx
      .select()
      .from(payments)
      .where(eq(payments.idempotencyKey, scopedKey))
      .limit(1);
    if (existingByKey[0]) {
      if (existingByKey[0].userId !== data.userId || existingByKey[0].requestId !== data.requestId) {
        throw new Error("PAYMENT_IDEMPOTENCY_CONFLICT");
      }
      return { payment: existingByKey[0], duplicated: true };
    }

    const existingForRequest = await tx
      .select()
      .from(payments)
      .where(eq(payments.requestId, data.requestId))
      .limit(1);
    if (existingForRequest[0]) {
      if (existingForRequest[0].userId !== data.userId) throw new Error("PAYMENT_FORBIDDEN");
      return { payment: existingForRequest[0], duplicated: true };
    }

    const agreementRows = await tx
      .select()
      .from(serviceAgreements)
      .where(
        and(
          eq(serviceAgreements.id, quote.agreementId),
          eq(serviceAgreements.requestId, data.requestId),
          eq(serviceAgreements.customerUserId, data.userId),
        ),
      )
      .limit(1);
    const agreement = agreementRows[0];
    if (!agreement) throw new Error("PAYMENT_AGREEMENT_NOT_FOUND");
    if (agreement.paymentId != null) throw new Error("PAYMENT_AGREEMENT_PAYMENT_CONFLICT");
    if (
      agreement.providerId !== quote.providerId ||
      agreement.offerId !== quote.offerId ||
      agreement.agreedAmount !== quote.amount ||
      agreement.commissionRateBps !== quote.commissionRateBps ||
      agreement.commissionAmount !== quote.commissionAmount ||
      agreement.providerPayout !== quote.providerPayout
    ) {
      throw new Error("PAYMENT_AGREEMENT_MISMATCH");
    }
    const guaranteeRows = await tx
      .select()
      .from(priceGuarantees)
      .where(
        and(
          eq(priceGuarantees.requestId, agreement.requestId),
          eq(priceGuarantees.agreementId, agreement.id),
          eq(priceGuarantees.customerUserId, data.userId),
          eq(priceGuarantees.status, "active"),
        ),
      )
      .limit(1);
    const guarantee = guaranteeRows[0];
    if (
      !guarantee ||
      guarantee.currency !== "TRY" ||
      guarantee.guaranteedAmount !== agreement.agreedAmount ||
      guarantee.maximumAmount !== agreement.agreedAmount
    ) {
      throw new Error("PAYMENT_PRICE_GUARANTEE_MISMATCH");
    }

    const result = await tx.insert(payments).values({
      requestId: agreement.requestId,
      userId: data.userId,
      providerId: agreement.providerId,
      offerId: agreement.offerId,
      amount: agreement.agreedAmount,
      commissionRateBps: agreement.commissionRateBps,
      commissionAmount: agreement.commissionAmount,
      providerPayout: agreement.providerPayout,
      idempotencyKey: scopedKey,
      status: "pending",
    });
    const rows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, result[0].insertId))
      .limit(1);
    if (!rows[0]) throw new Error("PAYMENT_CREATE_FAILED");
    const agreementUpdate = await tx
      .update(serviceAgreements)
      .set({ paymentId: rows[0].id })
      .where(and(eq(serviceAgreements.id, agreement.id), isNull(serviceAgreements.paymentId)));
    if ((agreementUpdate[0]?.affectedRows ?? 0) !== 1) {
      throw new Error("PAYMENT_AGREEMENT_PAYMENT_CONFLICT");
    }
    return { payment: rows[0], duplicated: false };
  });

  try {
    const result = await createIntent();
    return {
      ...result,
      quote,
      gatewayReady: false as const,
      blocker: "PAYMENT_GATEWAY_CREDENTIALS_REQUIRED" as const,
    };
  } catch (error) {
    const mysqlCode = (error as { code?: string } | null)?.code;
    if (mysqlCode !== "ER_DUP_ENTRY") throw error;
    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.requestId, data.requestId))
      .limit(1);
    if (!rows[0] || rows[0].userId !== data.userId) throw error;
    return {
      payment: rows[0],
      duplicated: true,
      quote,
      gatewayReady: false as const,
      blocker: "PAYMENT_GATEWAY_CREDENTIALS_REQUIRED" as const,
    };
  }
}

export async function reservePaymentGateway(data: {
  paymentId: number;
  userId: number;
  provider: PaymentWebhookProvider;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, data.paymentId))
      .limit(1);
    const payment = rows[0];
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.userId !== data.userId) throw new Error("PAYMENT_FORBIDDEN");
    if (payment.status !== "pending") throw new Error("PAYMENT_GATEWAY_INVALID_STATUS");
    if (payment.gatewayProvider && payment.gatewayProvider !== data.provider) {
      throw new Error("PAYMENT_GATEWAY_PROVIDER_CONFLICT");
    }

    if (!payment.gatewayProvider) {
      const updateResult = await tx
        .update(payments)
        .set({ gatewayProvider: data.provider })
        .where(
          and(
            eq(payments.id, data.paymentId),
            eq(payments.userId, data.userId),
            eq(payments.status, "pending"),
            isNull(payments.gatewayProvider),
          ),
        );
      if (updateResult[0].affectedRows !== 1) {
        throw new Error("PAYMENT_GATEWAY_RESERVATION_CONFLICT");
      }
    }

    const updatedRows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, data.paymentId))
      .limit(1);
    if (!updatedRows[0]) throw new Error("PAYMENT_NOT_FOUND");
    return updatedRows[0];
  });
}

/**
 * Compatibility bridge for the legacy payments.release endpoint. A customer
 * cannot release held funds directly: the release must follow a submitted
 * completion proof and then reuse the canonical Phase 6 escrow transaction.
 */
export async function approveCompletionProofForPayment(data: {
  paymentId: number;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({ requestId: payments.requestId, userId: payments.userId })
    .from(payments)
    .where(eq(payments.id, data.paymentId))
    .limit(1);
  const payment = rows[0];
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.userId !== data.userId) throw new Error("PAYMENT_FORBIDDEN");

  return approveCompletionProof({ requestId: payment.requestId, userId: data.userId });
}

export async function attachPaymentGatewayTransaction(data: {
  paymentId: number;
  userId: number;
  provider: PaymentWebhookProvider;
  gatewayPaymentId?: string;
  gatewayCheckoutToken?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!data.gatewayPaymentId && !data.gatewayCheckoutToken) {
    throw new Error("PAYMENT_GATEWAY_REFERENCE_REQUIRED");
  }
  if (data.provider === "stripe" && (!data.gatewayPaymentId || data.gatewayCheckoutToken)) {
    throw new Error("PAYMENT_GATEWAY_REFERENCE_INVALID");
  }
  if (data.provider === "iyzico" && !data.gatewayCheckoutToken) {
    throw new Error("PAYMENT_GATEWAY_REFERENCE_INVALID");
  }

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, data.paymentId))
      .limit(1);
    const payment = rows[0];
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.userId !== data.userId) throw new Error("PAYMENT_FORBIDDEN");
    if (payment.status !== "pending") throw new Error("PAYMENT_GATEWAY_INVALID_STATUS");
    if (payment.gatewayProvider !== data.provider) {
      throw new Error("PAYMENT_GATEWAY_PROVIDER_CONFLICT");
    }
    if (
      payment.gatewayPaymentId &&
      data.gatewayPaymentId &&
      payment.gatewayPaymentId !== data.gatewayPaymentId
    ) {
      throw new Error("PAYMENT_GATEWAY_TRANSACTION_CONFLICT");
    }
    if (
      payment.gatewayCheckoutToken &&
      data.gatewayCheckoutToken &&
      payment.gatewayCheckoutToken !== data.gatewayCheckoutToken
    ) {
      throw new Error("PAYMENT_GATEWAY_TRANSACTION_CONFLICT");
    }

    const updates: {
      gatewayPaymentId?: string;
      gatewayCheckoutToken?: string;
    } = {};
    if (!payment.gatewayPaymentId && data.gatewayPaymentId) {
      updates.gatewayPaymentId = data.gatewayPaymentId;
    }
    if (!payment.gatewayCheckoutToken && data.gatewayCheckoutToken) {
      updates.gatewayCheckoutToken = data.gatewayCheckoutToken;
    }
    if (Object.keys(updates).length === 0) {
      return { payment, duplicated: true };
    }

    const updateResult = await tx
      .update(payments)
      .set(updates)
      .where(
        and(
          eq(payments.id, data.paymentId),
          eq(payments.userId, data.userId),
          eq(payments.gatewayProvider, data.provider),
          eq(payments.status, "pending"),
          ...(updates.gatewayPaymentId ? [isNull(payments.gatewayPaymentId)] : []),
          ...(updates.gatewayCheckoutToken ? [isNull(payments.gatewayCheckoutToken)] : []),
        ),
      );
    if (updateResult[0].affectedRows !== 1) {
      throw new Error("PAYMENT_GATEWAY_TRANSACTION_CONFLICT");
    }

    const updatedRows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, data.paymentId))
      .limit(1);
    if (!updatedRows[0]) throw new Error("PAYMENT_NOT_FOUND");
    return { payment: updatedRows[0], duplicated: false };
  });
}

export async function getPaymentByIyzicoCheckoutToken(checkoutToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const token = checkoutToken.trim();
  if (!token || token.length > 512) throw new Error("PAYMENT_CHECKOUT_TOKEN_INVALID");

  const rows = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.gatewayProvider, "iyzico"),
        eq(payments.gatewayCheckoutToken, token),
      ),
    )
    .limit(1);
  const payment = rows[0];
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  return payment;
}

export async function listDueProviderCredentials(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(providerCredentials)
    .where(and(eq(providerCredentials.status, "verified"), isNotNull(providerCredentials.nextCheckAt), lte(providerCredentials.nextCheckAt, now)));
}

export async function blockCapabilitiesPendingCredentialReverification(input: {
  providerId: number;
  jurisdictionId: number;
  credentialId: number;
  now?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = input.now ?? new Date();
  return db
    .update(providerCapabilityStatuses)
    .set({
      status: "MANUAL_REVIEW",
      evaluatedAt: now,
      scopeNote: "Credential reverification is due; capability is blocked pending human review.",
    })
    .where(
      and(
        eq(providerCapabilityStatuses.providerId, input.providerId),
        eq(providerCapabilityStatuses.jurisdictionId, input.jurisdictionId),
        eq(providerCapabilityStatuses.lastCredentialId, input.credentialId),
      ),
    );
}

export async function transitionPaymentStatus(data: {
  paymentId: number;
  actorUserId: number;
  nextStatus: EscrowPaymentStatus;
  requireAdmin?: boolean;
}) {
  if (data.nextStatus === "refunded") {
    throw new Error("PAYMENT_REFUND_GATEWAY_CALLBACK_REQUIRED");
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, data.paymentId))
      .limit(1);
    const payment = rows[0];
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (!data.requireAdmin && payment.userId !== data.actorUserId) throw new Error("PAYMENT_FORBIDDEN");
    if (payment.status === data.nextStatus) return { payment, duplicated: true };

    assertPaymentStatusTransition(payment.status, data.nextStatus);

    const requestRows = await tx
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, payment.requestId))
      .limit(1);
    const request = requestRows[0];
    if (!request) throw new Error("PAYMENT_REQUEST_NOT_FOUND");
    if (data.nextStatus === "released" && request.status !== "completed") {
      throw new Error("PAYMENT_JOB_NOT_COMPLETED");
    }

    await tx
      .update(payments)
      .set({ status: data.nextStatus })
      .where(and(eq(payments.id, data.paymentId), eq(payments.status, payment.status)));

    const updatedRows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, data.paymentId))
      .limit(1);
    if (!updatedRows[0]) throw new Error("PAYMENT_UPDATE_FAILED");
    return { payment: updatedRows[0], duplicated: false };
  });
}

// Get payments for a user
export async function getUserPayments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId));
}

export type PaymentWebhookProvider = "iyzico" | "stripe";

export async function resolvePaymentForGatewayWebhook(data: {
  provider: PaymentWebhookProvider;
  gatewayPaymentId: string;
  internalPaymentId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const byReference = await tx
      .select()
      .from(payments)
      .where(eq(payments.gatewayPaymentId, data.gatewayPaymentId))
      .limit(1);
    let payment = byReference[0];

    if (!payment && data.internalPaymentId) {
      const byId = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, data.internalPaymentId))
        .limit(1);
      payment = byId[0];
    }
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.gatewayProvider && payment.gatewayProvider !== data.provider) {
      throw new Error("PAYMENT_GATEWAY_PROVIDER_CONFLICT");
    }
    if (
      payment.gatewayPaymentId &&
      payment.gatewayPaymentId !== data.gatewayPaymentId
    ) {
      throw new Error("PAYMENT_GATEWAY_TRANSACTION_CONFLICT");
    }

    if (!payment.gatewayProvider || !payment.gatewayPaymentId) {
      const updateResult = await tx
        .update(payments)
        .set({
          gatewayProvider: data.provider,
          gatewayPaymentId: data.gatewayPaymentId,
        })
        .where(
          and(
            eq(payments.id, payment.id),
            payment.gatewayProvider
              ? eq(payments.gatewayProvider, data.provider)
              : isNull(payments.gatewayProvider),
            payment.gatewayPaymentId
              ? eq(payments.gatewayPaymentId, data.gatewayPaymentId)
              : isNull(payments.gatewayPaymentId),
          ),
        );
      if (updateResult[0].affectedRows !== 1) {
        throw new Error("PAYMENT_GATEWAY_TRANSACTION_CONFLICT");
      }
      const updatedRows = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, payment.id))
        .limit(1);
      if (!updatedRows[0]) throw new Error("PAYMENT_NOT_FOUND");
      payment = updatedRows[0];
    }

    return payment;
  });
}

export async function transitionPaymentFromVerifiedWebhook(data: {
  paymentId: number;
  nextStatus: "held" | "refunded";
  gatewayReference?: string;
  partialRefund?: { refundAmount: number; gatewayReference: string };
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, data.paymentId))
      .limit(1);
    const payment = rows[0];
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.status === data.nextStatus) return { payment, duplicated: true };

    if (data.partialRefund) {
      if (data.nextStatus !== "refunded") throw new Error("PAYMENT_PARTIAL_REFUND_STATUS_INVALID");
      if (payment.status === "released") return { payment, duplicated: true };
      await getAgreementForPaymentInTransaction(tx, payment);
      await resolvePartialRefundCancellationInTransaction(tx, payment, data.partialRefund);
      const settledRows = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, payment.id))
        .limit(1);
      if (!settledRows[0]) throw new Error("PAYMENT_UPDATE_FAILED");
      return { payment: settledRows[0], duplicated: false };
    }

    if (data.nextStatus === "held") {
      const requestRows = await tx
        .select({ status: serviceRequests.status })
        .from(serviceRequests)
        .where(eq(serviceRequests.id, payment.requestId))
        .limit(1);
      if (requestRows[0]?.status !== "active") throw new Error("PAYMENT_REQUEST_NOT_ACTIVE");
    }

    assertPaymentStatusTransition(payment.status, data.nextStatus);
    await getAgreementForPaymentInTransaction(tx, payment);
    const updateResult = await tx
      .update(payments)
      .set({ status: data.nextStatus })
      .where(and(eq(payments.id, payment.id), eq(payments.status, payment.status)));
    if (updateResult[0].affectedRows !== 1) throw new Error("PAYMENT_UPDATE_CONFLICT");

    const updatedRows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, payment.id))
      .limit(1);
    if (!updatedRows[0]) throw new Error("PAYMENT_UPDATE_FAILED");

    if (data.nextStatus === "held") {
      await postFinancialLedgerEntry(tx, buildPaymentHeldLedgerEntry(updatedRows[0]));
    } else if (data.nextStatus === "refunded" && payment.status === "held") {
      if (!data.gatewayReference?.trim()) throw new Error("PAYMENT_REFUND_GATEWAY_REFERENCE_REQUIRED");
      await postFinancialLedgerEntry(tx, buildRefundLedgerEntry(updatedRows[0]));
      await resolveRefundCancellationInTransaction(tx, updatedRows[0]);
      await resolveCompletionDisputeRefundInTransaction(tx, updatedRows[0], data.gatewayReference.trim());
    }

    return { payment: updatedRows[0], duplicated: false };
  });
}

export async function claimPaymentWebhookEvent(data: {
  provider: PaymentWebhookProvider;
  eventId: string;
  eventType: string;
  payloadHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.insert(paymentWebhookEvents).values({
      provider: data.provider,
      eventId: data.eventId,
      eventType: data.eventType,
      payloadHash: data.payloadHash,
      status: "processing",
    });
    const rows = await db
      .select()
      .from(paymentWebhookEvents)
      .where(eq(paymentWebhookEvents.id, result[0].insertId))
      .limit(1);
    if (!rows[0]) throw new Error("PAYMENT_WEBHOOK_CLAIM_FAILED");
    return { event: rows[0], claimed: true, duplicated: false };
  } catch (error) {
    const mysqlCode = (error as { code?: string } | null)?.code;
    if (mysqlCode !== "ER_DUP_ENTRY") throw error;
  }

  const existingRows = await db
    .select()
    .from(paymentWebhookEvents)
    .where(
      and(
        eq(paymentWebhookEvents.provider, data.provider),
        eq(paymentWebhookEvents.eventId, data.eventId),
      ),
    )
    .limit(1);
  const existing = existingRows[0];
  if (!existing) throw new Error("PAYMENT_WEBHOOK_CLAIM_FAILED");
  if (existing.payloadHash !== data.payloadHash) {
    throw new Error("PAYMENT_WEBHOOK_PAYLOAD_MISMATCH");
  }

  if (existing.status === "failed") {
    const retryResult = await db
      .update(paymentWebhookEvents)
      .set({
        status: "processing",
        error: null,
        receivedAt: new Date(),
        processedAt: null,
      })
      .where(
        and(
          eq(paymentWebhookEvents.id, existing.id),
          eq(paymentWebhookEvents.status, "failed"),
        ),
      );
    if (retryResult[0].affectedRows === 1) {
      return {
        event: { ...existing, status: "processing" as const, error: null, processedAt: null },
        claimed: true,
        duplicated: true,
      };
    }
  }

  return { event: existing, claimed: false, duplicated: true };
}

export async function completePaymentWebhookEvent(data: {
  provider: PaymentWebhookProvider;
  eventId: string;
  status: "processed" | "failed";
  error?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(paymentWebhookEvents)
    .set({
      status: data.status,
      error: data.status === "failed" ? data.error?.slice(0, 2_000) ?? "Unknown processing error" : null,
      processedAt: new Date(),
    })
    .where(
      and(
        eq(paymentWebhookEvents.provider, data.provider),
        eq(paymentWebhookEvents.eventId, data.eventId),
        eq(paymentWebhookEvents.status, "processing"),
      ),
    );

  if (result[0].affectedRows !== 1) throw new Error("PAYMENT_WEBHOOK_STATE_CONFLICT");
}

export async function ensureWalletAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(walletAccounts)
    .values({ userId, currency: "TRY" })
    .onDuplicateKeyUpdate({ set: { userId } });

  const rows = await db
    .select()
    .from(walletAccounts)
    .where(eq(walletAccounts.userId, userId))
    .limit(1);

  if (!rows[0]) throw new Error("Wallet account could not be initialized");
  return rows[0];
}

export async function getWalletSummary(userId: number) {
  const account = await ensureWalletAccount(userId);
  return {
    ...account,
    totalBalance: account.availableBalance + account.pendingBalance,
  };
}

export async function getWalletTransactions(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt), desc(walletTransactions.id))
    .limit(limit)
    .offset(offset);
}

export class WalletWithdrawalError extends Error {
  constructor(
    public readonly reason: "INVALID_IBAN" | "PROVIDER_NOT_VERIFIED" | "INSUFFICIENT_BALANCE",
    message: string,
  ) {
    super(message);
    this.name = "WalletWithdrawalError";
  }
}

export function normalizeTurkishIban(bankAccountId: string) {
  const normalized = bankAccountId.trim().replace(/\s+/g, "").toUpperCase();
  return /^TR\d{24}$/.test(normalized) ? normalized : null;
}

export function isWalletWithdrawalProviderEligible(provider: {
  isVerified: number | null;
  verificationStatus: string;
  verificationReviewedAt: Date | null;
} | null | undefined) {
  return Boolean(
    provider &&
    provider.isVerified === 1 &&
    provider.verificationStatus === "approved" &&
    provider.verificationReviewedAt,
  );
}

export async function requestWalletWithdrawal(data: {
  userId: number;
  amount: number;
  bankAccountId: string;
  idempotencyKey: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedBankAccountId = normalizeTurkishIban(data.bankAccountId);
  if (!normalizedBankAccountId) {
    throw new WalletWithdrawalError(
      "INVALID_IBAN",
      "Para çekme için TR ile başlayan 26 karakterli geçerli bir IBAN gereklidir",
    );
  }

  const scopedKey = `${data.userId}:${data.idempotencyKey}`;
  const existing = await db
    .select()
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.userId, data.userId),
        eq(walletTransactions.idempotencyKey, scopedKey),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return { transaction: existing[0], duplicated: true };
  }

  return db.transaction(async (tx) => {
    const providerRows = await tx
      .select({
        id: providers.id,
        isVerified: providers.isVerified,
        verificationStatus: providers.verificationStatus,
        verificationReviewedAt: providers.verificationReviewedAt,
      })
      .from(providers)
      .where(eq(providers.userId, data.userId))
      .limit(1);
    const provider = providerRows[0];

    if (!isWalletWithdrawalProviderEligible(provider)) {
      throw new WalletWithdrawalError(
        "PROVIDER_NOT_VERIFIED",
        "Para çekme yalnızca doğrulanmış profesyonel hesaplara açıktır",
      );
    }

    await tx
      .insert(walletAccounts)
      .values({ userId: data.userId, currency: "TRY" })
      .onDuplicateKeyUpdate({ set: { userId: data.userId } });

    const debitResult = await tx
      .update(walletAccounts)
      .set({
        availableBalance: sql`${walletAccounts.availableBalance} - ${data.amount}`,
      })
      .where(
        and(
          eq(walletAccounts.userId, data.userId),
          gte(walletAccounts.availableBalance, data.amount),
        ),
      );

    const affectedRows = debitResult[0]?.affectedRows ?? 0;
    if (affectedRows !== 1) {
      throw new WalletWithdrawalError("INSUFFICIENT_BALANCE", "Yetersiz kullanılabilir bakiye");
    }

    const transactionResult = await tx.insert(walletTransactions).values({
      userId: data.userId,
      type: "withdrawal",
      status: "pending",
      amount: data.amount,
      description: "Banka hesabına para çekme talebi",
      idempotencyKey: scopedKey,
      metadata: JSON.stringify({ bankAccountId: normalizedBankAccountId }),
    });
    const transactionId = transactionResult[0].insertId;

    await tx.insert(walletWithdrawals).values({
      userId: data.userId,
      transactionId,
      amount: data.amount,
      bankAccountId: normalizedBankAccountId,
      status: "pending",
    });

    const rows = await tx
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.id, transactionId))
      .limit(1);

    if (!rows[0]) throw new Error("Withdrawal transaction could not be created");
    return { transaction: rows[0], duplicated: false };
  });
}

export async function creditWalletBalance(data: {
  userId: number;
  amount: number;
  type: "deposit" | "provider_payout" | "refund" | "adjustment";
  description: string;
  reference?: string;
  idempotencyKey: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const scopedKey = `${data.userId}:${data.idempotencyKey}`;

  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.idempotencyKey, scopedKey))
      .limit(1);
    if (existing[0]) return { transaction: existing[0], duplicated: true };

    await tx
      .insert(walletAccounts)
      .values({ userId: data.userId, currency: "TRY" })
      .onDuplicateKeyUpdate({ set: { userId: data.userId } });
    await tx
      .update(walletAccounts)
      .set({ availableBalance: sql`${walletAccounts.availableBalance} + ${data.amount}` })
      .where(eq(walletAccounts.userId, data.userId));

    const result = await tx.insert(walletTransactions).values({
      userId: data.userId,
      type: data.type,
      status: "completed",
      amount: data.amount,
      description: data.description,
      reference: data.reference,
      idempotencyKey: scopedKey,
    });
    const rows = await tx
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.id, result[0].insertId))
      .limit(1);
    if (!rows[0]) throw new Error("Wallet credit could not be recorded");
    return { transaction: rows[0], duplicated: false };
  });
}

type JobExpenseCategory = "fuel" | "toll" | "parking" | "material" | "part" | "paint" | "equipment" | "transport" | "packaging" | "other";

async function getExpenseJobContext(requestId: number, userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database.select({ request: serviceRequests, agreement: serviceAgreements }).from(serviceRequests)
    .innerJoin(serviceAgreements, eq(serviceAgreements.requestId, serviceRequests.id)).where(eq(serviceRequests.id, requestId)).limit(1);
  const context = rows[0];
  if (!context) throw new Error("EXPENSE_AGREEMENT_NOT_FOUND");
  const isCustomer = context.request.userId === userId;
  const isProvider = context.agreement.providerId === userId;
  if (!isCustomer && !isProvider) throw new Error("EXPENSE_ACCESS_DENIED");
  return { database, ...context, isCustomer, isProvider };
}

export async function assertExpenseMediaUpload(requestId: number, userId: number) {
  const context = await getExpenseJobContext(requestId, userId);
  if (!context.isProvider) throw new Error("EXPENSE_PROVIDER_ONLY");
  return { agreementId: context.agreement.id };
}

export async function createJobExpense(input: { requestId: number; providerUserId: number; category: JobExpenseCategory; amount: number; description: string; purchasedAt: Date; vendorName?: string; brand?: string; model?: string; quantity?: number; locationUrl?: string; mediaIds: number[] }) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error("EXPENSE_AMOUNT_INVALID");
  const context = await getExpenseJobContext(input.requestId, input.providerUserId);
  if (!context.isProvider) throw new Error("EXPENSE_PROVIDER_ONLY");
  const mediaIds = [...new Set(input.mediaIds)];
  return context.database.transaction(async (tx) => {
    if (mediaIds.length) {
      const media = await tx.select({ id: serviceRequestMedia.id }).from(serviceRequestMedia).where(and(eq(serviceRequestMedia.requestId, input.requestId), eq(serviceRequestMedia.ownerUserId, input.providerUserId), eq(serviceRequestMedia.purpose, "expense"), inArray(serviceRequestMedia.id, mediaIds)));
      if (media.length !== mediaIds.length) throw new Error("EXPENSE_MEDIA_NOT_OWNED");
    }
    const result = await tx.insert(jobExpenses).values({ requestId: input.requestId, agreementId: context.agreement.id, providerId: context.agreement.providerId, category: input.category, amount: input.amount, description: input.description, purchasedAt: input.purchasedAt, vendorName: input.vendorName, brand: input.brand, model: input.model, quantity: input.quantity, locationUrl: input.locationUrl });
    const expenseId = Number(result[0].insertId);
    if (mediaIds.length) await tx.insert(jobExpenseMedia).values(mediaIds.map((mediaId) => ({ expenseId, mediaId })));
    return expenseId;
  });
}

export async function listJobExpensesForParticipant(requestId: number, userId: number) {
  const context = await getExpenseJobContext(requestId, userId);
  const expenses = await context.database.select().from(jobExpenses).where(eq(jobExpenses.requestId, requestId)).orderBy(jobExpenses.createdAt, jobExpenses.id);
  return Promise.all(expenses.map(async (expense) => ({ ...expense, media: await context.database.select({ id: serviceRequestMedia.id, kind: serviceRequestMedia.kind, originalName: serviceRequestMedia.originalName, mimeType: serviceRequestMedia.mimeType, sizeBytes: serviceRequestMedia.sizeBytes }).from(jobExpenseMedia).innerJoin(serviceRequestMedia, eq(jobExpenseMedia.mediaId, serviceRequestMedia.id)).where(eq(jobExpenseMedia.expenseId, expense.id)) })));
}

export async function submitExpenseRefundRequest(input: { expenseId: number; providerUserId: number; requestedAmount: number; materialAssessmentJson: string }) {
  if (!Number.isInteger(input.requestedAmount) || input.requestedAmount <= 0) throw new Error("EXPENSE_REFUND_AMOUNT_INVALID");
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database.select().from(jobExpenses).where(eq(jobExpenses.id, input.expenseId)).limit(1);
  const expense = rows[0];
  if (!expense || expense.providerId !== input.providerUserId) throw new Error("EXPENSE_REFUND_ACCESS_DENIED");
  if (input.requestedAmount > expense.amount) throw new Error("EXPENSE_REFUND_EXCEEDS_EXPENSE");
  const result = await database.insert(expenseRefundRequests).values({ requestId: expense.requestId, expenseId: expense.id, providerId: expense.providerId, requestedAmount: input.requestedAmount, materialAssessmentJson: input.materialAssessmentJson, status: "submitted" });
  return Number(result[0].insertId);
}

export async function listExpenseRefundRequestsForParticipant(requestId: number, userId: number) {
  const context = await getExpenseJobContext(requestId, userId);
  return context.database
    .select()
    .from(expenseRefundRequests)
    .where(eq(expenseRefundRequests.requestId, requestId))
    .orderBy(expenseRefundRequests.createdAt, expenseRefundRequests.id);
}

/**
 * An expense-reimbursement decision records customer consent only. It never
 * creates a customer charge, wallet movement, or payment-gateway action.
 */
export async function resolveExpenseRefundRequest(input: {
  refundRequestId: number;
  customerUserId: number;
  decision: "approved" | "rejected";
  resolutionNote?: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select()
    .from(expenseRefundRequests)
    .where(eq(expenseRefundRequests.id, input.refundRequestId))
    .limit(1);
  const refundRequest = rows[0];
  if (!refundRequest) throw new Error("EXPENSE_REFUND_NOT_FOUND");

  const context = await getExpenseJobContext(refundRequest.requestId, input.customerUserId);
  if (!context.isCustomer) throw new Error("EXPENSE_CUSTOMER_ONLY");

  const result = await database
    .update(expenseRefundRequests)
    .set({
      status: input.decision,
      reviewedByUserId: input.customerUserId,
      resolutionNote: input.resolutionNote,
      resolvedAt: new Date(),
    })
    .where(
      and(
        eq(expenseRefundRequests.id, input.refundRequestId),
        inArray(expenseRefundRequests.status, ["submitted", "under_review"]),
      ),
    );
  if (Number(result[0].affectedRows) !== 1) throw new Error("EXPENSE_REFUND_NOT_ACTIONABLE");
  return { id: input.refundRequestId, status: input.decision };
}

type MoveAiDraftPayload = {
  categoryId: number;
  title: string;
  description: string;
  suggestions: string[];
};

function parseMoveAiDraftPayload(value: string): MoveAiDraftPayload {
  try {
    const parsed: unknown = JSON.parse(value);
    const record = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
    if (
      record &&
      typeof record.categoryId === "number" &&
      Number.isInteger(record.categoryId) &&
      record.categoryId > 0 &&
      typeof record.title === "string" &&
      typeof record.description === "string" &&
      Array.isArray(record.suggestions)
    ) {
      return {
        categoryId: record.categoryId,
        title: record.title,
        description: record.description,
        suggestions: record.suggestions.filter(
          (item): item is string => typeof item === "string",
        ),
      };
    }
  } catch {
    // A malformed persisted AI payload must never become an executable request.
  }
  throw new Error("MOVE_AI_DRAFT_INVALID");
}

async function getOrCreateTrustProfile(database: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number) {
  const existing = await database.select().from(trustProfiles).where(eq(trustProfiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  await database.insert(trustProfiles).values({ userId, score: 100, status: "active" });
  const created = await database.select().from(trustProfiles).where(eq(trustProfiles.userId, userId)).limit(1);
  if (!created[0]) throw new Error("TRUST_PROFILE_CREATE_FAILED");
  return created[0];
}

/** AI output is data only. This stores a user-owned proposal and never creates a service request. */
export async function createMoveAiDraft(input: {
  userId: number;
  sourceMessage: string;
  assistantSummary: string;
  categoryId: number;
  suggestions: string[];
  riskLevel: "low" | "medium" | "high";
  attachedMediaOpaqueIds?: string[];
  mediaConsentGrantedAt?: Date;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const attachedMediaOpaqueIds = [...new Set(input.attachedMediaOpaqueIds ?? [])];
  if (attachedMediaOpaqueIds.length > 4) throw new Error("MOVE_AI_MEDIA_LIMIT_EXCEEDED");
  if (attachedMediaOpaqueIds.length > 0 && !input.mediaConsentGrantedAt) {
    throw new Error("MOVE_AI_MEDIA_CONSENT_REQUIRED");
  }
  const trust = await getOrCreateTrustProfile(database, input.userId);
  const blocked = trust.status !== "active" || input.riskLevel === "high";
  const status = blocked ? "blocked" : "draft";
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const payload: MoveAiDraftPayload = {
    categoryId: input.categoryId,
    title: input.sourceMessage.slice(0, 100),
    description: input.sourceMessage,
    suggestions: input.suggestions.slice(0, 6),
  };
  return database.transaction(async (tx) => {
    const stagedMedia = attachedMediaOpaqueIds.length === 0
      ? []
      : await tx
          .select()
          .from(moveAiDraftMedia)
          .where(and(
            eq(moveAiDraftMedia.ownerUserId, input.userId),
            eq(moveAiDraftMedia.status, "staged"),
            inArray(moveAiDraftMedia.opaqueId, attachedMediaOpaqueIds),
          ));
    if (stagedMedia.length !== attachedMediaOpaqueIds.length) {
      throw new Error("MOVE_AI_MEDIA_NOT_OWNED_OR_UNAVAILABLE");
    }
    const result = await tx.insert(moveAiDrafts).values({
      userId: input.userId,
      sourceMessage: input.sourceMessage,
      assistantSummary: input.assistantSummary,
      categoryId: input.categoryId,
      draftJson: JSON.stringify(payload),
      riskLevel: input.riskLevel,
      status,
      expiresAt,
      attachedMediaOpaqueIds: attachedMediaOpaqueIds.length > 0 ? attachedMediaOpaqueIds : null,
      mediaConsentGrantedAt: attachedMediaOpaqueIds.length > 0 ? input.mediaConsentGrantedAt : null,
      hasAudioInput: stagedMedia.some((media) => media.kind === "audio") ? 1 : 0,
    });
    const id = Number(result[0].insertId);
    if (stagedMedia.length > 0) {
      const attached = await tx
        .update(moveAiDraftMedia)
        .set({ draftId: id, status: "attached", attachedAt: new Date() })
        .where(and(
          eq(moveAiDraftMedia.ownerUserId, input.userId),
          eq(moveAiDraftMedia.status, "staged"),
          inArray(moveAiDraftMedia.opaqueId, attachedMediaOpaqueIds),
        ));
      if (Number(attached[0].affectedRows) !== stagedMedia.length) {
        throw new Error("MOVE_AI_MEDIA_NOT_OWNED_OR_UNAVAILABLE");
      }
    }
    if (input.riskLevel === "high") {
      await tx.insert(riskFlags).values({
        subjectUserId: input.userId,
        source: "move_ai",
        reasonCode: "MOVE_AI_HIGH_RISK_DRAFT",
        severity: "high",
        detailsJson: JSON.stringify({ draftId: id }),
      });
    }
    return { id, status, expiresAt, riskLevel: input.riskLevel, payload };
  });
}

/** Stores only owner-scoped opaque metadata for a pending MoveAI draft. */
export async function stageMoveAiDraftMedia(input: {
  ownerUserId: number;
  opaqueId: string;
  kind: "image" | "audio";
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const activeRows = await database
    .select({ id: moveAiDraftMedia.id })
    .from(moveAiDraftMedia)
    .where(and(
      eq(moveAiDraftMedia.ownerUserId, input.ownerUserId),
      inArray(moveAiDraftMedia.status, ["staged", "attached"]),
    ));
  if (activeRows.length >= 4) throw new Error("MOVE_AI_MEDIA_LIMIT_EXCEEDED");
  await database.insert(moveAiDraftMedia).values({ ...input, status: "staged" });
  return { opaqueId: input.opaqueId, kind: input.kind, sizeBytes: input.sizeBytes };
}

export async function getMoveAiDraftForUser(draftId: number, userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select()
    .from(moveAiDrafts)
    .where(and(eq(moveAiDrafts.id, draftId), eq(moveAiDrafts.userId, userId)))
    .limit(1);
  const draft = rows[0];
  if (!draft) throw new Error("MOVE_AI_DRAFT_NOT_FOUND");
  if (draft.status === "draft" && draft.expiresAt.getTime() <= Date.now()) {
    await database.update(moveAiDrafts).set({ status: "expired" }).where(eq(moveAiDrafts.id, draft.id));
    return { ...draft, status: "expired" as const, payload: parseMoveAiDraftPayload(draft.draftJson) };
  }
  return { ...draft, payload: parseMoveAiDraftPayload(draft.draftJson) };
}

/** Confirmation conditionally claims a draft and inserts the service request in the same transaction. */
export async function confirmMoveAiDraft(input: { draftId: number; userId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(moveAiDrafts)
      .where(and(eq(moveAiDrafts.id, input.draftId), eq(moveAiDrafts.userId, input.userId)))
      .limit(1);
    const draft = rows[0];
    if (!draft) throw new Error("MOVE_AI_DRAFT_NOT_FOUND");
    if (draft.status !== "draft" || draft.expiresAt.getTime() <= Date.now()) throw new Error("MOVE_AI_DRAFT_NOT_CONFIRMABLE");
    if (draft.riskLevel === "high") throw new Error("MOVE_AI_DRAFT_RISK_BLOCKED");
    const trust = await getOrCreateTrustProfile(database, input.userId);
    if (trust.status !== "active") throw new Error("MOVE_AI_TRUST_RESTRICTED");
    const payload = parseMoveAiDraftPayload(draft.draftJson);
    const claimed = await tx
      .update(moveAiDrafts)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(and(eq(moveAiDrafts.id, draft.id), eq(moveAiDrafts.status, "draft")));
    if (Number(claimed[0].affectedRows) !== 1) throw new Error("MOVE_AI_DRAFT_NOT_CONFIRMABLE");
    const requestResult = await tx.insert(serviceRequests).values({
      userId: input.userId,
      categoryId: payload.categoryId,
      title: payload.title,
      description: payload.description,
    });
    const requestId = Number(requestResult[0].insertId);
    const attachedMediaOpaqueIds = Array.isArray(draft.attachedMediaOpaqueIds)
      ? draft.attachedMediaOpaqueIds
      : [];
    if (attachedMediaOpaqueIds.length > 0 && !draft.mediaConsentGrantedAt) {
      throw new Error("MOVE_AI_MEDIA_CONSENT_REQUIRED");
    }
    if (attachedMediaOpaqueIds.length > 0) {
      const attachedMedia = await tx
        .select()
        .from(moveAiDraftMedia)
        .where(and(
          eq(moveAiDraftMedia.draftId, draft.id),
          eq(moveAiDraftMedia.ownerUserId, input.userId),
          eq(moveAiDraftMedia.status, "attached"),
          inArray(moveAiDraftMedia.opaqueId, attachedMediaOpaqueIds),
        ));
      if (attachedMedia.length !== attachedMediaOpaqueIds.length) {
        throw new Error("MOVE_AI_MEDIA_NOT_OWNED_OR_UNAVAILABLE");
      }
      await tx.insert(serviceRequestMedia).values(attachedMedia.map((media) => ({
        publicId: media.opaqueId,
        requestId,
        ownerUserId: input.userId,
        purpose: "request" as const,
        kind: media.kind,
        storageKey: media.storageKey,
        originalName: media.originalName,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
        sha256: media.sha256,
      })));
      const transferred = await tx
        .update(moveAiDraftMedia)
        .set({ status: "transferred", transferredAt: new Date() })
        .where(and(
          eq(moveAiDraftMedia.draftId, draft.id),
          eq(moveAiDraftMedia.ownerUserId, input.userId),
          eq(moveAiDraftMedia.status, "attached"),
          inArray(moveAiDraftMedia.opaqueId, attachedMediaOpaqueIds),
        ));
      if (Number(transferred[0].affectedRows) !== attachedMedia.length) {
        throw new Error("MOVE_AI_MEDIA_TRANSFER_FAILED");
      }
    }
    await tx.update(moveAiDrafts).set({ confirmedRequestId: requestId }).where(eq(moveAiDrafts.id, draft.id));
    return { requestId, draftId: draft.id };
  });
}

export async function listRiskFlagsForAdmin(limit = 100) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database.select().from(riskFlags).orderBy(riskFlags.createdAt, riskFlags.id).limit(Math.min(Math.max(limit, 1), 100));
}

export async function reviewRiskFlag(input: {
  riskFlagId: number;
  adminUserId: number;
  decision: "resolved" | "dismissed";
  reviewNote: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const reviewed = await database.transaction(async (tx) => {
    const rows = await tx.select().from(riskFlags).where(eq(riskFlags.id, input.riskFlagId)).limit(1);
    const flag = rows[0];
    if (!flag || !["open", "under_review"].includes(flag.status)) {
      throw new Error("RISK_FLAG_NOT_ACTIONABLE");
    }

    const result = await tx.update(riskFlags).set({
      status: input.decision,
      reviewedByUserId: input.adminUserId,
      reviewNote: input.reviewNote.trim(),
      resolvedAt: new Date(),
    }).where(and(eq(riskFlags.id, input.riskFlagId), inArray(riskFlags.status, ["open", "under_review"])));
    if (Number(result[0].affectedRows) !== 1) throw new Error("RISK_FLAG_NOT_ACTIONABLE");

    // Only a human-confirmed material signal can restrict a profile. A dismissed
    // flag deliberately leaves the pre-existing score/status untouched.
    if (input.decision === "resolved" && ["high", "critical"].includes(flag.severity)) {
      const profiles = await tx.select().from(trustProfiles).where(eq(trustProfiles.userId, flag.subjectUserId)).limit(1);
      const existing = profiles[0];
      if (existing) {
        const next = trustRestrictionForReviewedRisk({
          decision: input.decision,
          severity: flag.severity,
          currentScore: existing.score,
          currentStatus: existing.status,
        });
        await tx.update(trustProfiles).set({
          score: next.score,
          status: next.status,
          lastEvaluatedAt: new Date(),
        }).where(eq(trustProfiles.id, existing.id));
      } else {
        await tx.insert(trustProfiles).values({
          userId: flag.subjectUserId,
          score: 40,
          status: "restricted",
          lastEvaluatedAt: new Date(),
        });
      }
    }

    return { id: input.riskFlagId, status: input.decision };
  });
  await logOperationEvent({
    eventType: "risk_flag.reviewed",
    subjectId: input.riskFlagId,
    actorId: input.adminUserId,
    payload: { decision: input.decision },
  });
  return reviewed;
}

// Faz 6: Operational feature flags are append-only configuration records. A
// missing/expired/broken flag must never activate a protected capability.
export type FeatureFlagContext = {
  userId?: number;
  countryCode?: string;
};

function normalizeOperationalFlagKey(flagKey: string): string {
  const normalized = flagKey.trim();
  if (!/^[a-z][a-z0-9_.-]{0,95}$/.test(normalized)) {
    throw new Error("FEATURE_FLAG_KEY_INVALID");
  }
  return normalized;
}

/** Deterministic and dependency-free bucket suitable for non-security canary allocation. */
export function featureFlagBucket(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

export type FeatureFlagEvaluationRecord = {
  flagKey: string;
  enabled: number;
  killSwitch: number;
  rolloutPercent: number;
  audienceSeed: string;
};

/**
 * Evaluates a previously selected, currently active flag record. This remains
 * pure so that the security-critical fail-closed and canary rules are tested
 * without requiring a live database.
 */
export function evaluateFeatureFlag(
  flag: FeatureFlagEvaluationRecord | null | undefined,
  context: FeatureFlagContext = {},
): boolean {
  if (!flag || flag.enabled !== 1 || flag.killSwitch === 1) return false;
  if (!Number.isInteger(flag.rolloutPercent) || flag.rolloutPercent <= 0) return false;
  if (flag.rolloutPercent >= 100) return true;

  // A canary must be stable for one identity. Anonymous callers receive no
  // experimental capability rather than a random and unverifiable result.
  if (!Number.isSafeInteger(context.userId) || (context.userId ?? 0) <= 0) return false;
  const allocationKey = `${flag.audienceSeed}:${flag.flagKey}:${context.userId}:${context.countryCode ?? ""}`;
  return featureFlagBucket(allocationKey) < flag.rolloutPercent;
}

export async function resolveFeatureFlag(
  key: string,
  context: FeatureFlagContext = {},
): Promise<boolean> {
  let flagKey: string;
  try {
    flagKey = normalizeOperationalFlagKey(key);
  } catch {
    return false;
  }

  const database = await getDb();
  if (!database) return false;

  try {
    const now = new Date();
    const candidates = await database
      .select()
      .from(operationalFeatureFlags)
      .where(
        and(
          eq(operationalFeatureFlags.flagKey, flagKey),
          lte(operationalFeatureFlags.startsAt, now),
          or(isNull(operationalFeatureFlags.endsAt), gt(operationalFeatureFlags.endsAt, now)),
        ),
      )
      .orderBy(desc(operationalFeatureFlags.version))
      .limit(1);
    const flag = candidates[0];
    return evaluateFeatureFlag(flag, context);
  } catch (error) {
    console.error("[FeatureFlags] Failed to resolve operational flag", { key: flagKey, error });
    return false;
  }
}

export async function setFeatureFlag(input: {
  key: string;
  enabled: boolean;
  rolloutPct?: number;
  killSwitch?: boolean;
  audienceSeed?: string;
  reason?: string;
  adminUserId: number;
}) {
  const flagKey = normalizeOperationalFlagKey(input.key);
  if (!Number.isSafeInteger(input.adminUserId) || input.adminUserId <= 0) {
    throw new Error("FEATURE_FLAG_ADMIN_INVALID");
  }
  const rolloutPercent = input.rolloutPct ?? (input.enabled ? 100 : 0);
  if (!Number.isInteger(rolloutPercent) || rolloutPercent < 0 || rolloutPercent > 100) {
    throw new Error("FEATURE_FLAG_ROLLOUT_INVALID");
  }
  const audienceSeed = (input.audienceSeed ?? flagKey).trim();
  if (!audienceSeed || audienceSeed.length > 96) throw new Error("FEATURE_FLAG_AUDIENCE_SEED_INVALID");
  const reason = (input.reason ?? "Operational feature flag update").trim();
  if (!reason || reason.length > 280) throw new Error("FEATURE_FLAG_REASON_INVALID");

  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const flag = await database.transaction(async (tx) => {
    const latest = await tx
      .select()
      .from(operationalFeatureFlags)
      .where(eq(operationalFeatureFlags.flagKey, flagKey))
      .orderBy(desc(operationalFeatureFlags.version))
      .limit(1);
    const version = (latest[0]?.version ?? 0) + 1;
    const killSwitch = input.killSwitch ?? !input.enabled;
    await tx.insert(operationalFeatureFlags).values({
      flagKey,
      version,
      enabled: input.enabled ? 1 : 0,
      rolloutPercent,
      killSwitch: killSwitch ? 1 : 0,
      audienceSeed,
      createdByUserId: input.adminUserId,
      reason,
    });
    const inserted = await tx
      .select()
      .from(operationalFeatureFlags)
      .where(and(eq(operationalFeatureFlags.flagKey, flagKey), eq(operationalFeatureFlags.version, version)))
      .limit(1);
    if (!inserted[0]) throw new Error("FEATURE_FLAG_WRITE_FAILED");
    return inserted[0];
  });

  await logOperationEvent({
    eventType: "feature_flag.updated",
    subjectId: flag.id,
    actorId: input.adminUserId,
    payload: {
      key: flag.flagKey,
      version: flag.version,
      enabled: flag.enabled === 1,
      rolloutPercent: flag.rolloutPercent,
      killSwitch: flag.killSwitch === 1,
      reason: flag.reason,
    },
  });
  return flag;
}

/** Returns the latest immutable version for each flag, newest flags first. */
export async function listFeatureFlags(limit = 100) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select()
    .from(operationalFeatureFlags)
    .orderBy(desc(operationalFeatureFlags.createdAt), desc(operationalFeatureFlags.version))
    .limit(Math.min(Math.max(limit, 1), 200));
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.flagKey)) return false;
    seen.add(row.flagKey);
    return true;
  });
}

export async function logOperationEvent(input: {
  eventType: string;
  subjectId?: number;
  actorId?: number;
  payload?: Record<string, unknown>;
  severity?: "info" | "warning" | "error";
}): Promise<void> {
  const eventType = input.eventType.trim();
  if (!eventType || eventType.length > 96) {
    console.error("[Operations] Ignored invalid event type");
    return;
  }
  const database = await getDb();
  if (!database) return;
  try {
    await database.insert(operationalEvents).values({
      eventType,
      severity: input.severity ?? "info",
      requestId: input.subjectId == null ? undefined : String(input.subjectId),
      actorUserId: input.actorId,
      metadataJson: {
        subjectId: input.subjectId,
        ...(input.payload ?? {}),
      },
    });
  } catch (error) {
    // Observability must not change the outcome of a protected financial or
    // safety transition. The structured console error remains observable.
    console.error("[Operations] Failed to persist event", { eventType, error });
  }
}

type PhaseDRequestParticipant = {
  requestId: number;
  customerUserId: number;
  providerUserId: number | null;
  organizationId: number | null;
};

async function assertPhaseDRequestParticipant(requestId: number, userId: number): Promise<PhaseDRequestParticipant> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select({
      requestId: serviceRequests.id,
      customerUserId: serviceRequests.userId,
      providerUserId: providers.userId,
      organizationId: serviceRequests.organizationId,
    })
    .from(serviceRequests)
    .leftJoin(providers, eq(serviceRequests.assignedProviderId, providers.id))
    .where(eq(serviceRequests.id, requestId))
    .limit(1);
  const request = rows[0];
  if (!request) throw new Error("SERVICE_REQUEST_NOT_FOUND");
  if (request.customerUserId !== userId && request.providerUserId !== userId) {
    throw new Error("SERVICE_REQUEST_PARTICIPANT_FORBIDDEN");
  }
  return request;
}

/**
 * Requeste bağlı kanıt akışları için yalnız yetki kontrolü sunar; istek
 * verisini router katmanına açmadan katılımcı sınırını veri katmanında tutar.
 */
export async function assertServiceRequestParticipant(requestId: number, userId: number): Promise<void> {
  await assertPhaseDRequestParticipant(requestId, userId);
}

/** Writes one append-only Job Capsule event for an already-authoritative record. */
export async function recordJobTimelineEvent(input: {
  requestId: number;
  eventType: string;
  actorUserId?: number;
  referenceType: string;
  referenceId?: number;
  metadata: Record<string, unknown>;
}) {
  const eventType = input.eventType.trim();
  const referenceType = input.referenceType.trim();
  if (!eventType || eventType.length > 96 || !referenceType || referenceType.length > 64) {
    throw new Error("JOB_TIMELINE_EVENT_INVALID");
  }
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const existing = await database
    .select({ id: jobTimelineEvents.id })
    .from(jobTimelineEvents)
    .where(
      and(
        eq(jobTimelineEvents.requestId, input.requestId),
        eq(jobTimelineEvents.referenceType, referenceType),
        input.referenceId == null ? isNull(jobTimelineEvents.referenceId) : eq(jobTimelineEvents.referenceId, input.referenceId),
      ),
    )
    .limit(1);
  if (existing[0]) return { id: existing[0].id, created: false } as const;
  const result = await database.insert(jobTimelineEvents).values({
    requestId: input.requestId,
    eventType,
    actorUserId: input.actorUserId,
    referenceType,
    referenceId: input.referenceId,
    metadataJson: input.metadata,
  });
  return { id: result[0].insertId, created: true } as const;
}

/** Returns a participant-scoped, read-only Job Capsule. Source records remain authoritative. */
export async function getJobCapsule(input: { requestId: number; userId: number }) {
  await assertPhaseDRequestParticipant(input.requestId, input.userId);
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const [request] = await database
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, input.requestId))
    .limit(1);
  if (!request) throw new Error("SERVICE_REQUEST_NOT_FOUND");
  const [agreement] = await database
    .select()
    .from(serviceAgreements)
    .where(eq(serviceAgreements.requestId, input.requestId))
    .limit(1);
  const [payment] = await database
    .select()
    .from(payments)
    .where(eq(payments.requestId, input.requestId))
    .limit(1);
  const [completionProof] = await database
    .select()
    .from(jobCompletionProofs)
    .where(eq(jobCompletionProofs.requestId, input.requestId))
    .orderBy(desc(jobCompletionProofs.createdAt))
    .limit(1);
  const timeline = await database
    .select()
    .from(jobTimelineEvents)
    .where(eq(jobTimelineEvents.requestId, input.requestId))
    .orderBy(jobTimelineEvents.occurredAt);
  const reviewRows = await database
    .select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt })
    .from(reviews)
    .where(eq(reviews.requestId, input.requestId))
    .limit(1);
  return {
    request: {
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    },
    agreement: agreement
      ? {
          id: agreement.id,
          currency: agreement.currency,
          agreedAmount: agreement.agreedAmount,
          acceptedAt: agreement.acceptedAt,
          snapshotJson: agreement.snapshotJson,
        }
      : null,
    payment: payment
      ? { id: payment.id, status: payment.status, amount: payment.amount, gatewayProvider: payment.gatewayProvider }
      : null,
    completionProof: completionProof
      ? { id: completionProof.id, status: completionProof.status, createdAt: completionProof.createdAt, releasedAt: completionProof.releasedAt }
      : null,
    review: reviewRows[0] ?? null,
    timeline,
  };
}

/** A customer-safe trust passport: aggregate signals only, never raw complaints or documents. */
export async function getMoveTrustPassport(providerUserId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const profile = await getProviderProfile(providerUserId);
  if (!profile) throw new Error("PROVIDER_NOT_FOUND");
  const [trust] = await database
    .select()
    .from(trustProfiles)
    .where(eq(trustProfiles.userId, providerUserId))
    .limit(1);
  const documents = await database
    .select({ type: providerDocuments.type, status: providerDocuments.status })
    .from(providerDocuments)
    .where(eq(providerDocuments.providerId, profile.id));
  const [complaints] = await database
    .select({ count: sql<number>`COUNT(*)` })
    .from(riskFlags)
    .where(
      and(
        eq(riskFlags.subjectUserId, providerUserId),
        eq(riskFlags.source, "report"),
        inArray(riskFlags.status, ["open", "under_review"]),
      ),
    );
  return {
    provider: {
      id: profile.id,
      displayName: profile.displayName,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
      completedJobs: profile.completedJobs,
      isAvailable: profile.isAvailable === 1,
    },
    verification: {
      isVerified: profile.isVerified === 1,
      documentStatus: documents.map((document) => ({ type: document.type, status: document.status })),
    },
    trust: {
      score: trust?.score ?? 100,
      status: trust?.status ?? "active",
      activeComplaintCount: Number(complaints?.count ?? 0),
      lastEvaluatedAt: trust?.lastEvaluatedAt ?? null,
    },
  };
}

function percentile(sortedAmounts: number[], p: number) {
  const index = Math.max(0, Math.min(sortedAmounts.length - 1, Math.round((sortedAmounts.length - 1) * p)));
  return sortedAmounts[index] ?? null;
}

/** Creates an auditable, non-binding price range from completed settled jobs only. */
export async function createPriceIntelligenceAssessment(input: {
  requestedByUserId: number;
  requestId?: number;
  categoryId: number;
  countryCode?: string;
  currency?: string;
}) {
  const currency = (input.currency ?? "TRY").toUpperCase();
  if (currency !== "TRY") throw new Error("PRICE_INTELLIGENCE_CURRENCY_NOT_SUPPORTED");
  const countryCode = (input.countryCode ?? "TR").toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode) || input.categoryId < 1) {
    throw new Error("PRICE_INTELLIGENCE_INPUT_INVALID");
  }
  if (input.requestId != null) await assertPhaseDRequestParticipant(input.requestId, input.requestedByUserId);
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select({ amount: serviceAgreements.agreedAmount, acceptedAt: serviceAgreements.acceptedAt })
    .from(serviceAgreements)
    .innerJoin(serviceRequests, eq(serviceRequests.id, serviceAgreements.requestId))
    .innerJoin(payments, eq(payments.requestId, serviceAgreements.requestId))
    .where(
      and(
        eq(serviceRequests.categoryId, input.categoryId),
        eq(serviceAgreements.currency, currency),
        eq(payments.status, "released"),
      ),
    )
    .orderBy(serviceAgreements.acceptedAt)
    .limit(200);
  const amounts = rows.map((row) => row.amount).filter((amount) => amount > 0).sort((a, b) => a - b);
  const isAvailable = amounts.length >= 5;
  const first = rows[0]?.acceptedAt ?? null;
  const last = rows.at(-1)?.acceptedAt ?? null;
  const explanationJson = {
    method: "completed_released_agreement_percentiles_v1",
    nonBinding: true,
    sampleThreshold: 5,
    sampleSize: amounts.length,
    excluded: "pending, held, refunded, cancelled, external quotes",
  };
  const result = {
    status: isAvailable ? "available" as const : "insufficient_data" as const,
    sampleSize: amounts.length,
    medianAmount: isAvailable ? percentile(amounts, 0.5) : null,
    lowAmount: isAvailable ? percentile(amounts, 0.25) : null,
    highAmount: isAvailable ? percentile(amounts, 0.75) : null,
    explanationJson,
  };
  const insert = await database.insert(priceIntelligenceAssessments).values({
    requestId: input.requestId,
    requestedByUserId: input.requestedByUserId,
    categoryId: input.categoryId,
    countryCode,
    currency,
    ...result,
    dataWindowStartedAt: first,
    dataWindowEndedAt: last,
  });
  return { id: insert[0].insertId, ...result, currency, countryCode, dataWindowStartedAt: first, dataWindowEndedAt: last };
}

export async function createSafetyTrustedContact(input: {
  userId: number;
  name: string;
  phone: string;
  label?: string;
}) {
  const normalizedName = input.name.trim();
  const normalizedPhone = input.phone.replace(/[^0-9+]/g, "");
  if (!normalizedName || normalizedName.length > 120 || !/^\+?[0-9]{7,20}$/.test(normalizedPhone)) {
    throw new Error("SAFETY_CONTACT_INVALID");
  }
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const encryptedContactJson = new EncryptionService().encrypt(JSON.stringify({ name: normalizedName, phone: normalizedPhone }));
  const result = await database.insert(safetyTrustedContacts).values({
    userId: input.userId,
    encryptedContactJson,
    label: input.label?.trim().slice(0, 80) || null,
  });
  return { id: result[0].insertId, label: input.label?.trim().slice(0, 80) || null, status: "active" as const };
}

export async function listSafetyTrustedContacts(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database
    .select({ id: safetyTrustedContacts.id, label: safetyTrustedContacts.label, status: safetyTrustedContacts.status, createdAt: safetyTrustedContacts.createdAt })
    .from(safetyTrustedContacts)
    .where(and(eq(safetyTrustedContacts.userId, userId), eq(safetyTrustedContacts.status, "active")))
    .orderBy(desc(safetyTrustedContacts.createdAt));
}

export async function revokeSafetyTrustedContact(input: { id: number; userId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database
    .update(safetyTrustedContacts)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(safetyTrustedContacts.id, input.id), eq(safetyTrustedContacts.userId, input.userId), eq(safetyTrustedContacts.status, "active")));
  if ((result[0]?.affectedRows ?? 0) !== 1) throw new Error("SAFETY_CONTACT_NOT_FOUND");
  return { success: true } as const;
}

export async function createSafetyCheckIn(input: { requestId: number; userId: number; dueAt: Date }) {
  await assertPhaseDRequestParticipant(input.requestId, input.userId);
  if (input.dueAt.getTime() <= Date.now() || input.dueAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new Error("SAFETY_CHECK_IN_DUE_INVALID");
  }
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(safetyCheckIns).values(input);
  await recordJobTimelineEvent({
    requestId: input.requestId,
    eventType: "safety_check_in_requested",
    actorUserId: input.userId,
    referenceType: "safety_check_in",
    referenceId: result[0].insertId,
    metadata: { dueAt: input.dueAt.toISOString() },
  });
  return { id: result[0].insertId, status: "requested" as const };
}

export async function acknowledgeSafetyCheckIn(input: { id: number; userId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database.select().from(safetyCheckIns).where(eq(safetyCheckIns.id, input.id)).limit(1);
  const checkIn = rows[0];
  if (!checkIn || checkIn.userId !== input.userId) throw new Error("SAFETY_CHECK_IN_NOT_FOUND");
  if (checkIn.status !== "requested") throw new Error("SAFETY_CHECK_IN_NOT_PENDING");
  await database.update(safetyCheckIns).set({ status: "acknowledged", acknowledgedAt: new Date() }).where(eq(safetyCheckIns.id, input.id));
  await recordJobTimelineEvent({
    requestId: checkIn.requestId,
    eventType: "safety_check_in_acknowledged",
    actorUserId: input.userId,
    referenceType: "safety_check_in_acknowledgement",
    referenceId: input.id,
    metadata: {},
  });
  return { success: true } as const;
}

export async function createSafetyIncident(input: {
  reporterUserId: number;
  requestId?: number;
  category: "conduct" | "identity" | "unsafe_condition" | "harassment" | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
}) {
  if (input.requestId != null) await assertPhaseDRequestParticipant(input.requestId, input.reporterUserId);
  const description = input.description.trim();
  if (description.length < 10 || description.length > 4000) throw new Error("SAFETY_INCIDENT_DESCRIPTION_INVALID");
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(safetyIncidents).values({ ...input, description });
  if (input.requestId != null) {
    await recordJobTimelineEvent({
      requestId: input.requestId,
      eventType: "safety_incident_reported",
      actorUserId: input.reporterUserId,
      referenceType: "safety_incident",
      referenceId: result[0].insertId,
      metadata: { category: input.category, severity: input.severity },
    });
  }
  await logOperationEvent({ eventType: "safety_incident_created", actorId: input.reporterUserId, subjectId: input.requestId, severity: input.severity === "critical" ? "error" : "warning" });
  return { id: result[0].insertId, status: "open" as const, externalDeliveryStatus: "not_configured" as const };
}

/**
 * Read-only Operations Control projection. It deliberately derives its values
 * from authoritative records instead of maintaining a second operational state.
 */
export async function getOperationsControlSnapshot(input?: { eventLimit?: number; caseLimit?: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const eventLimit = Math.max(1, Math.min(input?.eventLimit ?? 25, 100));
  const caseLimit = Math.max(1, Math.min(input?.caseLimit ?? 25, 100));

  const [requests, paymentsRows, riskRows, cancellationRows, safetyRows, featureFlags, recentEvents] = await Promise.all([
    database.select().from(serviceRequests),
    database.select().from(payments),
    database.select().from(riskFlags),
    database.select().from(jobCancellationCases).orderBy(desc(jobCancellationCases.createdAt)).limit(caseLimit),
    database.select().from(safetyIncidents).orderBy(desc(safetyIncidents.createdAt)).limit(caseLimit),
    database.select().from(operationalFeatureFlags),
    database.select().from(operationalEvents).orderBy(desc(operationalEvents.occurredAt)).limit(eventLimit),
  ]);

  const requestStatusCounts = requests.reduce<Record<string, number>>((summary, request) => {
    const status = String(request.status ?? "unknown");
    summary[status] = (summary[status] ?? 0) + 1;
    return summary;
  }, {});
  const paymentStatusCounts = paymentsRows.reduce<Record<string, number>>((summary, payment) => {
    const status = String(payment.status ?? "unknown");
    summary[status] = (summary[status] ?? 0) + 1;
    return summary;
  }, {});
  const openRiskCount = riskRows.filter((risk) => ["open", "under_review"].includes(String(risk.status))).length;
  const disabledFeatureFlagCount = featureFlags.filter((flag) => Number(flag.enabled) !== 1).length;

  return {
    generatedAt: new Date(),
    health: {
      database: "available" as const,
       externalApm: getApmConfigurationStatus(),
      activeFeatureFlags: featureFlags.length - disabledFeatureFlagCount,
      disabledFeatureFlags: disabledFeatureFlagCount,
    },
    workload: {
      requestStatusCounts,
      paymentStatusCounts,
      openRiskCount,
      cancellationCases: cancellationRows.length,
      safetyIncidents: safetyRows.length,
    },
    queues: {
      cancellations: cancellationRows,
      safetyIncidents: safetyRows,
      operationalEvents: recentEvents,
    },
  };
}

export async function listMySafetyIncidents(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database
    .select({ id: safetyIncidents.id, requestId: safetyIncidents.requestId, category: safetyIncidents.category, severity: safetyIncidents.severity, status: safetyIncidents.status, externalDeliveryStatus: safetyIncidents.externalDeliveryStatus, createdAt: safetyIncidents.createdAt, resolvedAt: safetyIncidents.resolvedAt })
    .from(safetyIncidents)
    .where(eq(safetyIncidents.reporterUserId, userId))
    .orderBy(desc(safetyIncidents.createdAt));
}

async function assertOrganizationManager(input: { organizationId: number; userId: number }) {
  const access = await getOrganizationAccess(input);
  if (access.member.role !== "owner" && access.member.role !== "admin") {
    throw new Error("ORGANIZATION_MANAGEMENT_FORBIDDEN");
  }
  return access;
}

async function assertOrganizationSite(input: { organizationId: number; siteId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select({ id: organizationSites.id })
    .from(organizationSites)
    .where(and(eq(organizationSites.id, input.siteId), eq(organizationSites.organizationId, input.organizationId), eq(organizationSites.status, "active")))
    .limit(1);
  if (!rows[0]) throw new Error("ORGANIZATION_SITE_NOT_FOUND");
}

async function assertOrganizationAsset(input: { organizationId: number; assetId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select({ id: organizationManagedAssets.id })
    .from(organizationManagedAssets)
    .where(and(eq(organizationManagedAssets.id, input.assetId), eq(organizationManagedAssets.organizationId, input.organizationId), eq(organizationManagedAssets.status, "active")))
    .limit(1);
  if (!rows[0]) throw new Error("ORGANIZATION_ASSET_NOT_FOUND");
}

export async function createOrganizationSite(input: {
  organizationId: number;
  actorUserId: number;
  name: string;
  address: string;
  latitude?: string;
  longitude?: string;
}) {
  await assertOrganizationManager({ organizationId: input.organizationId, userId: input.actorUserId });
  const name = input.name.trim();
  const address = input.address.trim();
  if (!name || name.length > 160 || !address || address.length > 2000) throw new Error("ORGANIZATION_SITE_INVALID");
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(organizationSites).values({
    organizationId: input.organizationId,
    name,
    address,
    latitude: input.latitude?.trim() || null,
    longitude: input.longitude?.trim() || null,
    createdByUserId: input.actorUserId,
  });
  return { id: result[0].insertId };
}

export async function listOrganizationSites(input: { organizationId: number; userId: number }) {
  await getOrganizationAccess({ organizationId: input.organizationId, userId: input.userId });
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database
    .select()
    .from(organizationSites)
    .where(and(eq(organizationSites.organizationId, input.organizationId), eq(organizationSites.status, "active")))
    .orderBy(organizationSites.name);
}

export async function createOrganizationManagedAsset(input: {
  organizationId: number;
  actorUserId: number;
  siteId?: number;
  kind: "property" | "vehicle" | "equipment" | "other";
  name: string;
  externalReference?: string;
  detailsJson?: Record<string, unknown>;
}) {
  await assertOrganizationManager({ organizationId: input.organizationId, userId: input.actorUserId });
  if (input.siteId != null) await assertOrganizationSite({ organizationId: input.organizationId, siteId: input.siteId });
  const name = input.name.trim();
  if (!name || name.length > 160) throw new Error("ORGANIZATION_ASSET_INVALID");
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(organizationManagedAssets).values({
    organizationId: input.organizationId,
    siteId: input.siteId ?? null,
    kind: input.kind,
    name,
    externalReference: input.externalReference?.trim().slice(0, 128) || null,
    detailsJson: input.detailsJson ?? {},
    createdByUserId: input.actorUserId,
  });
  return { id: result[0].insertId };
}

export async function listOrganizationManagedAssets(input: { organizationId: number; userId: number; siteId?: number }) {
  await getOrganizationAccess({ organizationId: input.organizationId, userId: input.userId });
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database
    .select()
    .from(organizationManagedAssets)
    .where(
      and(
        eq(organizationManagedAssets.organizationId, input.organizationId),
        eq(organizationManagedAssets.status, "active"),
        input.siteId == null ? undefined : eq(organizationManagedAssets.siteId, input.siteId),
      ),
    )
    .orderBy(organizationManagedAssets.name);
}

export async function createOrganizationMaintenanceSchedule(input: {
  organizationId: number;
  actorUserId: number;
  siteId?: number;
  assetId?: number;
  categoryId: number;
  title: string;
  description?: string;
  cadence: "weekly" | "monthly" | "quarterly" | "annual";
  nextRunAt: Date;
}) {
  await assertOrganizationManager({ organizationId: input.organizationId, userId: input.actorUserId });
  if (input.siteId != null) await assertOrganizationSite({ organizationId: input.organizationId, siteId: input.siteId });
  if (input.assetId != null) await assertOrganizationAsset({ organizationId: input.organizationId, assetId: input.assetId });
  const title = input.title.trim();
  if (!title || title.length > 255 || input.categoryId < 1 || input.nextRunAt.getTime() <= Date.now()) {
    throw new Error("ORGANIZATION_MAINTENANCE_SCHEDULE_INVALID");
  }
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(organizationMaintenanceSchedules).values({
    organizationId: input.organizationId,
    siteId: input.siteId ?? null,
    assetId: input.assetId ?? null,
    categoryId: input.categoryId,
    title,
    description: input.description?.trim().slice(0, 4000) || null,
    cadence: input.cadence,
    nextRunAt: input.nextRunAt,
    createdByUserId: input.actorUserId,
  });
  return { id: result[0].insertId };
}

export async function listOrganizationMaintenanceSchedules(input: { organizationId: number; userId: number }) {
  await getOrganizationAccess({ organizationId: input.organizationId, userId: input.userId });
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database
    .select()
    .from(organizationMaintenanceSchedules)
    .where(and(eq(organizationMaintenanceSchedules.organizationId, input.organizationId), eq(organizationMaintenanceSchedules.status, "active")))
    .orderBy(organizationMaintenanceSchedules.nextRunAt);
}

export async function createOrganizationRequestApproval(input: { requestId: number; actorUserId: number }) {
  const request = await getServiceRequestById(input.requestId);
  if (!request?.organizationId) throw new Error("ORGANIZATION_REQUEST_REQUIRED");
  const access = await getOrganizationAccess({ organizationId: request.organizationId, userId: input.actorUserId });
  if (request.userId !== input.actorUserId && access.member.role === "member") throw new Error("ORGANIZATION_APPROVAL_CREATE_FORBIDDEN");
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const existing = await database.select({ id: organizationRequestApprovals.id }).from(organizationRequestApprovals).where(eq(organizationRequestApprovals.requestId, input.requestId)).limit(1);
  if (existing[0]) throw new Error("ORGANIZATION_APPROVAL_ALREADY_EXISTS");
  const result = await database.insert(organizationRequestApprovals).values({
    requestId: input.requestId,
    organizationId: request.organizationId,
    requestedByUserId: input.actorUserId,
  });
  return { id: result[0].insertId, status: "pending" as const };
}

export async function decideOrganizationRequestApproval(input: {
  approvalId: number;
  actorUserId: number;
  decision: "approved" | "rejected" | "cancelled";
  note?: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database.select().from(organizationRequestApprovals).where(eq(organizationRequestApprovals.id, input.approvalId)).limit(1);
  const approval = rows[0];
  if (!approval) throw new Error("ORGANIZATION_APPROVAL_NOT_FOUND");
  const access = await getOrganizationAccess({ organizationId: approval.organizationId, userId: input.actorUserId });
  const isRequester = approval.requestedByUserId === input.actorUserId;
  if (input.decision === "cancelled") {
    if (!isRequester || approval.status !== "pending") throw new Error("ORGANIZATION_APPROVAL_CANCEL_FORBIDDEN");
  } else if (access.member.role !== "owner" && access.member.role !== "admin") {
    throw new Error("ORGANIZATION_APPROVAL_DECISION_FORBIDDEN");
  }
  if (approval.status !== "pending") throw new Error("ORGANIZATION_APPROVAL_NOT_PENDING");
  await database.update(organizationRequestApprovals).set({
    status: input.decision,
    reviewedByUserId: input.decision === "cancelled" ? null : input.actorUserId,
    decisionNote: input.note?.trim().slice(0, 1000) || null,
    decidedAt: new Date(),
  }).where(eq(organizationRequestApprovals.id, input.approvalId));
  await recordJobTimelineEvent({
    requestId: approval.requestId,
    eventType: `organization_approval_${input.decision}`,
    actorUserId: input.actorUserId,
    referenceType: "organization_request_approval",
    referenceId: approval.id,
    metadata: {},
  });
  return { success: true } as const;
}

export async function listOrganizationRequestApprovals(input: { organizationId: number; userId: number; status?: "pending" | "approved" | "rejected" | "cancelled" }) {
  await getOrganizationAccess({ organizationId: input.organizationId, userId: input.userId });
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database
    .select()
    .from(organizationRequestApprovals)
    .where(and(eq(organizationRequestApprovals.organizationId, input.organizationId), input.status == null ? undefined : eq(organizationRequestApprovals.status, input.status)))
    .orderBy(desc(organizationRequestApprovals.createdAt));
}

export async function createOrganizationRequestBatch(input: {
  organizationId: number;
  actorUserId: number;
  title: string;
  categoryId: number;
  siteId?: number;
  description?: string;
  requestedForAt?: Date;
}) {
  await assertOrganizationManager({ organizationId: input.organizationId, userId: input.actorUserId });
  if (input.siteId != null) await assertOrganizationSite({ organizationId: input.organizationId, siteId: input.siteId });
  const title = input.title.trim();
  if (!title || title.length > 255 || input.categoryId < 1 || (input.requestedForAt && input.requestedForAt.getTime() <= Date.now())) {
    throw new Error("ORGANIZATION_BATCH_INVALID");
  }
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(organizationRequestBatches).values({
    organizationId: input.organizationId,
    createdByUserId: input.actorUserId,
    title,
    categoryId: input.categoryId,
    siteId: input.siteId ?? null,
    description: input.description?.trim().slice(0, 4000) || null,
    requestedForAt: input.requestedForAt ?? null,
  });
  return { id: result[0].insertId, status: "draft" as const };
}

export async function addOrganizationRequestToBatch(input: { batchId: number; requestId: number; actorUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const batch = (await database.select().from(organizationRequestBatches).where(eq(organizationRequestBatches.id, input.batchId)).limit(1))[0];
  if (!batch) throw new Error("ORGANIZATION_BATCH_NOT_FOUND");
  await assertOrganizationManager({ organizationId: batch.organizationId, userId: input.actorUserId });
  if (batch.status !== "draft") throw new Error("ORGANIZATION_BATCH_NOT_EDITABLE");
  const request = await getServiceRequestById(input.requestId);
  if (!request || request.organizationId !== batch.organizationId) throw new Error("ORGANIZATION_BATCH_REQUEST_FORBIDDEN");
  try {
    const result = await database.insert(organizationRequestBatchItems).values({ batchId: batch.id, requestId: input.requestId });
    return { id: result[0].insertId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/duplicate|unique/i.test(message)) throw new Error("ORGANIZATION_BATCH_REQUEST_ALREADY_LINKED");
    throw error;
  }
}

export async function submitOrganizationRequestBatch(input: { batchId: number; actorUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const batch = (await database.select().from(organizationRequestBatches).where(eq(organizationRequestBatches.id, input.batchId)).limit(1))[0];
  if (!batch) throw new Error("ORGANIZATION_BATCH_NOT_FOUND");
  await assertOrganizationManager({ organizationId: batch.organizationId, userId: input.actorUserId });
  if (batch.status !== "draft") throw new Error("ORGANIZATION_BATCH_NOT_EDITABLE");
  const items = await database.select({ id: organizationRequestBatchItems.id }).from(organizationRequestBatchItems).where(eq(organizationRequestBatchItems.batchId, batch.id)).limit(1);
  if (!items[0]) throw new Error("ORGANIZATION_BATCH_EMPTY");
  await database.update(organizationRequestBatches).set({ status: "submitted" }).where(eq(organizationRequestBatches.id, batch.id));
  return { success: true as const, status: "submitted" as const };
}

export async function listOrganizationRequestBatches(input: { organizationId: number; userId: number }) {
  await getOrganizationAccess({ organizationId: input.organizationId, userId: input.userId });
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const batches = await database.select().from(organizationRequestBatches).where(eq(organizationRequestBatches.organizationId, input.organizationId)).orderBy(desc(organizationRequestBatches.createdAt));
  return Promise.all(batches.map(async (batch) => {
    const items = await database.select({ requestId: organizationRequestBatchItems.requestId }).from(organizationRequestBatchItems).where(eq(organizationRequestBatchItems.batchId, batch.id));
    return { ...batch, requestIds: items.map((item) => item.requestId) };
  }));
}

export async function issueOrganizationInvoiceForRequest(input: { organizationId: number; requestId: number; actorUserId: number }) {
  await assertOrganizationManager({ organizationId: input.organizationId, userId: input.actorUserId });
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const request = await getServiceRequestById(input.requestId);
  if (!request || request.organizationId !== input.organizationId) throw new Error("ORGANIZATION_INVOICE_REQUEST_FORBIDDEN");
  const payment = (await database.select().from(payments).where(eq(payments.requestId, input.requestId)).limit(1))[0];
  if (!payment || (payment.status !== "held" && payment.status !== "released")) throw new Error("ORGANIZATION_INVOICE_PAYMENT_NOT_SETTLED");
  const existing = await database.select({ id: organizationInvoices.id }).from(organizationInvoices).where(eq(organizationInvoices.requestId, input.requestId)).limit(1);
  if (existing[0]) throw new Error("ORGANIZATION_INVOICE_ALREADY_EXISTS");
  const invoiceNumber = `MF-${input.organizationId}-${input.requestId}-${payment.id}`;
  const result = await database.insert(organizationInvoices).values({
    organizationId: input.organizationId,
    requestId: input.requestId,
    invoiceNumber,
    currency: "TRY",
    subtotalAmount: payment.amount,
    taxAmount: 0,
    totalAmount: payment.amount,
    status: payment.status === "released" ? "paid" : "issued",
    issuedAt: new Date(),
    paidAt: payment.status === "released" ? new Date() : null,
    createdByUserId: input.actorUserId,
  });
  return { id: result[0].insertId, invoiceNumber, status: payment.status === "released" ? "paid" as const : "issued" as const };
}

export async function listOrganizationInvoices(input: { organizationId: number; userId: number }) {
  await getOrganizationAccess({ organizationId: input.organizationId, userId: input.userId });
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database.select().from(organizationInvoices).where(eq(organizationInvoices.organizationId, input.organizationId)).orderBy(desc(organizationInvoices.createdAt));
}

type SupportTicketCategory = "technical" | "payment" | "safety" | "service" | "account" | "other";
type SupportTicketPriority = "normal" | "high" | "urgent";
type InsuranceClaimCategory = "injury" | "property_damage" | "theft" | "liability" | "other";
type InsuranceClaimStatus = "submitted" | "under_review" | "more_information_required" | "accepted" | "rejected" | "withdrawn";

export async function createSupportTicket(input: {
  createdByUserId: number;
  requestId?: number;
  category: SupportTicketCategory;
  priority?: SupportTicketPriority;
  subject: string;
  description: string;
}) {
  const subject = input.subject.trim();
  const description = input.description.trim();
  if (!subject || subject.length > 180 || !description || description.length > 8_000) throw new Error("SUPPORT_TICKET_INPUT_INVALID");
  if (input.requestId) await assertPhaseDRequestParticipant(input.requestId, input.createdByUserId);
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  return database.transaction(async (tx) => {
    const inserted = await tx.insert(supportTickets).values({
      requestId: input.requestId ?? null,
      createdByUserId: input.createdByUserId,
      category: input.category,
      priority: input.priority ?? "normal",
      subject,
      description,
    });
    const id = Number(inserted[0].insertId);
    await tx.insert(supportTicketEvents).values({
      ticketId: id,
      actorUserId: input.createdByUserId,
      eventType: "opened",
      metadataJson: JSON.stringify({ category: input.category, priority: input.priority ?? "normal" }),
    });
    return { id, status: "open" as const };
  });
}

export async function listOwnSupportTickets(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  return database.select().from(supportTickets).where(eq(supportTickets.createdByUserId, userId)).orderBy(desc(supportTickets.updatedAt));
}

export async function getOwnSupportTicket(input: { ticketId: number; userId: number }) {
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  const ticket = (await database.select().from(supportTickets).where(and(eq(supportTickets.id, input.ticketId), eq(supportTickets.createdByUserId, input.userId))).limit(1))[0];
  if (!ticket) throw new Error("SUPPORT_TICKET_FORBIDDEN");
  const events = await database.select().from(supportTicketEvents).where(eq(supportTicketEvents.ticketId, ticket.id)).orderBy(supportTicketEvents.createdAt);
  return { ticket, events };
}

export async function listSupportTicketsForReview(limit = 100) {
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  return database.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt)).limit(Math.min(Math.max(limit, 1), 100));
}

export async function reviewSupportTicket(input: {
  ticketId: number;
  reviewerUserId: number;
  status: "in_review" | "resolved" | "closed";
  resolutionNote?: string;
}) {
  const note = input.resolutionNote?.trim() || null;
  if (input.status === "resolved" && !note) throw new Error("SUPPORT_TICKET_RESOLUTION_NOTE_REQUIRED");
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  const ticket = (await database.select().from(supportTickets).where(eq(supportTickets.id, input.ticketId)).limit(1))[0];
  if (!ticket) throw new Error("SUPPORT_TICKET_NOT_FOUND");
  if (ticket.status === "closed" || ticket.status === "resolved") throw new Error("SUPPORT_TICKET_FINALIZED");
  await database.transaction(async (tx) => {
    await tx.update(supportTickets).set({
      status: input.status,
      assignedAdminUserId: input.reviewerUserId,
      resolutionNote: note,
      resolvedAt: input.status === "resolved" ? new Date() : null,
    }).where(eq(supportTickets.id, ticket.id));
    await tx.insert(supportTicketEvents).values({
      ticketId: ticket.id,
      actorUserId: input.reviewerUserId,
      eventType: input.status === "in_review" ? "assignment" : "resolution",
      body: note,
      metadataJson: JSON.stringify({ status: input.status }),
    });
  });
  return { id: ticket.id, status: input.status };
}

export async function createInsuranceClaim(input: {
  requestId: number;
  openedByUserId: number;
  claimantRole: "customer" | "provider";
  category: InsuranceClaimCategory;
  description: string;
  incidentAt: Date;
  mediaIds?: number[];
}) {
  const participant = await assertPhaseDRequestParticipant(input.requestId, input.openedByUserId);
  const actualRole = participant.customerUserId === input.openedByUserId ? "customer" : "provider";
  if (input.claimantRole !== actualRole) throw new Error("INSURANCE_CLAIM_ROLE_FORBIDDEN");
  const description = input.description.trim();
  if (!description || description.length > 8_000 || !(input.incidentAt instanceof Date) || Number.isNaN(input.incidentAt.getTime()) || input.incidentAt.getTime() > Date.now() + 5 * 60_000) {
    throw new Error("INSURANCE_CLAIM_INPUT_INVALID");
  }
  const mediaIds = [...new Set(input.mediaIds ?? [])];
  if (mediaIds.length > 8) throw new Error("INSURANCE_CLAIM_MEDIA_LIMIT");
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  if (mediaIds.length) {
    const ownedClaimMedia = await database.select({ id: serviceRequestMedia.id }).from(serviceRequestMedia).where(and(
      eq(serviceRequestMedia.requestId, input.requestId),
      eq(serviceRequestMedia.ownerUserId, input.openedByUserId),
      eq(serviceRequestMedia.purpose, "claim"),
      inArray(serviceRequestMedia.id, mediaIds),
    ));
    if (ownedClaimMedia.length !== mediaIds.length) throw new Error("INSURANCE_CLAIM_MEDIA_FORBIDDEN");
  }
  return database.transaction(async (tx) => {
    const inserted = await tx.insert(insuranceClaims).values({
      requestId: input.requestId,
      openedByUserId: input.openedByUserId,
      claimantRole: actualRole,
      category: input.category,
      description,
      incidentAt: input.incidentAt,
    });
    const id = Number(inserted[0].insertId);
    if (mediaIds.length) await tx.insert(insuranceClaimMedia).values(mediaIds.map((mediaId) => ({ claimId: id, mediaId })));
    await recordJobTimelineEvent({ requestId: input.requestId, eventType: "insurance_claim_opened", actorUserId: input.openedByUserId, referenceType: "insurance_claim", referenceId: id, metadata: { category: input.category, claimantRole: actualRole } });
    return { id, status: "submitted" as const };
  });
}

export async function listOwnInsuranceClaims(input: { requestId: number; userId: number }) {
  await assertPhaseDRequestParticipant(input.requestId, input.userId);
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  return database.select().from(insuranceClaims).where(and(eq(insuranceClaims.requestId, input.requestId), eq(insuranceClaims.openedByUserId, input.userId))).orderBy(desc(insuranceClaims.createdAt));
}

export async function listInsuranceClaimsForReview(limit = 100) {
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  return database.select().from(insuranceClaims).orderBy(desc(insuranceClaims.updatedAt)).limit(Math.min(Math.max(limit, 1), 100));
}

export async function reviewInsuranceClaim(input: { claimId: number; reviewerUserId: number; status: Exclude<InsuranceClaimStatus, "submitted" | "withdrawn">; decisionNote?: string }) {
  const note = input.decisionNote?.trim() || null;
  if ((input.status === "accepted" || input.status === "rejected") && !note) throw new Error("INSURANCE_CLAIM_DECISION_NOTE_REQUIRED");
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  const claim = (await database.select().from(insuranceClaims).where(eq(insuranceClaims.id, input.claimId)).limit(1))[0];
  if (!claim) throw new Error("INSURANCE_CLAIM_NOT_FOUND");
  if (claim.status === "accepted" || claim.status === "rejected" || claim.status === "withdrawn") throw new Error("INSURANCE_CLAIM_FINALIZED");
  await database.update(insuranceClaims).set({ status: input.status, reviewedByUserId: input.reviewerUserId, decisionNote: note, decidedAt: input.status === "accepted" || input.status === "rejected" ? new Date() : null }).where(eq(insuranceClaims.id, input.claimId));
  await recordJobTimelineEvent({ requestId: claim.requestId, eventType: "insurance_claim_reviewed", actorUserId: input.reviewerUserId, referenceType: "insurance_claim", referenceId: claim.id, metadata: { status: input.status, hasDecisionNote: Boolean(note) } });
  return { id: claim.id, status: input.status };
}

export async function createTaxRule(input: {
  countryCode: string;
  categoryId?: number;
  version: string;
  rateBasisPoints: number;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  createdByUserId: number;
}) {
  const countryCode = input.countryCode.trim().toUpperCase();
  const version = input.version.trim();
  if (countryCode !== "TR" || !version || version.length > 64 || !Number.isSafeInteger(input.rateBasisPoints) || input.rateBasisPoints < 0 || input.rateBasisPoints > 10_000 || Number.isNaN(input.effectiveFrom.getTime()) || (input.effectiveUntil && input.effectiveUntil <= input.effectiveFrom)) {
    throw new Error("TAX_RULE_INPUT_INVALID");
  }
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  const inserted = await database.insert(taxRules).values({ ...input, countryCode, version, status: "draft" });
  return { id: Number(inserted[0].insertId), status: "draft" as const };
}

export async function activateTurkeyTaxRule(input: { taxRuleId: number; actorUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  const rule = (await database.select().from(taxRules).where(eq(taxRules.id, input.taxRuleId)).limit(1))[0];
  if (!rule || rule.countryCode !== "TR") throw new Error("TAX_RULE_NOT_FOUND");
  const categoryScope = rule.categoryId == null
    ? isNull(taxRules.categoryId)
    : eq(taxRules.categoryId, rule.categoryId);
  await database.update(taxRules).set({ status: "retired" }).where(and(eq(taxRules.countryCode, "TR"), categoryScope, eq(taxRules.status, "active")));
  await database.update(taxRules).set({ status: "active", createdByUserId: input.actorUserId }).where(eq(taxRules.id, rule.id));
  return { id: rule.id, status: "active" as const };
}

export async function quoteAndSnapshotTurkeyVat(input: { requestId: number; actorUserId: number; subtotalAmount: number; categoryId?: number }) {
  await assertPhaseDRequestParticipant(input.requestId, input.actorUserId);
  const database = await getDb();
  if (!database) throw new Error("DATABASE_NOT_AVAILABLE");
  const existing = (await database.select().from(serviceRequestTaxSnapshots).where(eq(serviceRequestTaxSnapshots.requestId, input.requestId)).limit(1))[0];
  if (existing) return existing;
  const now = new Date();
  const activeRules = await database.select().from(taxRules).where(and(eq(taxRules.countryCode, "TR"), eq(taxRules.status, "active"), lte(taxRules.effectiveFrom, now), or(isNull(taxRules.effectiveUntil), gt(taxRules.effectiveUntil, now)), input.categoryId ? or(eq(taxRules.categoryId, input.categoryId), isNull(taxRules.categoryId)) : isNull(taxRules.categoryId))).orderBy(desc(taxRules.categoryId), desc(taxRules.effectiveFrom)).limit(1);
  const rule = activeRules[0];
  if (!rule) throw new Error("TAX_RULE_NOT_CONFIGURED");
  const quote = quoteTurkeyVat({ subtotalAmount: input.subtotalAmount, rateBasisPoints: rule.rateBasisPoints });
  const inserted = await database.insert(serviceRequestTaxSnapshots).values({ requestId: input.requestId, taxRuleId: rule.id, taxRuleVersion: rule.version, currency: "TRY", subtotalAmount: quote.subtotalAmount, taxAmount: quote.taxAmount, totalAmount: quote.totalAmount });
  return { id: Number(inserted[0].insertId), taxRuleId: rule.id, taxRuleVersion: rule.version, ...quote, currency: "TRY" as const };
}
