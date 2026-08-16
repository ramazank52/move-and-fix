import { and, desc, eq, gt, gte, inArray, isNotNull, isNull, like, lte, or, sql } from "drizzle-orm";
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

// TODO: add feature queries here as your schema grows.

import {
  serviceCategories,
  serviceSubcategories,
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
  trustProfiles,
  riskFlags,
  paymentProviderWatch,
} from "../drizzle/schema";
import {
  decidePaymentProviderOperationalStatus,
  type PaymentProviderId,
  type PaymentProviderOperationalRecord,
  type PaymentProviderOperationalStatus,
} from "./payments/ProviderOperationalPolicy";

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
  categoryId: number;
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
  const { details, ...requestData } = data;
  return db.transaction(async (tx) => {
    const result = await tx.insert(serviceRequests).values(requestData);
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
    ...row,
    url: `/manus-storage/${row.storageKey}`,
  }));
}

export async function createServiceRequestMedia(data: {
  requestId: number;
  ownerUserId: number;
  purpose: "request" | "before" | "after" | "completion" | "dispute" | "expense";
  kind: "image" | "video" | "document";
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

export async function getUserServiceRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const requestRows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.userId, userId))
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
  const existing = await db
    .select({ id: offers.id })
    .from(offers)
    .where(and(eq(offers.requestId, data.requestId), eq(offers.providerId, data.providerId)))
    .limit(1);
  if (existing[0]) throw new Error("Bu iş için daha önce teklif verdiniz");
  const result = await db.insert(offers).values(data);
  return result[0].insertId;
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

export async function sendMessage(data: {
  senderId: number;
  receiverId: number;
  requestId: number;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertMessageParticipant(db, data.requestId, data.senderId, data.receiverId);
  const result = await db.insert(messages).values(data);
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
    .where(and(eq(messages.id, messageId), eq(messages.kind, "audio")))
    .limit(1);
  return rows[0] ?? null;
}

export async function getConversation(requestId: number, userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return [];
  await assertMessageParticipant(db, requestId, userId1, userId2);
  const { or, and } = await import("drizzle-orm");
  return db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.requestId, requestId),
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
    .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId))!)
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

  return {
    ...context,
    viewerRole: isAssignedProvider ? ("provider" as const) : ("customer" as const),
    lifecycleStatus: tracking?.lifecycleStatus ?? fallbackLifecycle,
    providerLatitude: tracking?.providerLatitude ?? null,
    providerLongitude: tracking?.providerLongitude ?? null,
    accuracyMeters: tracking?.accuracyMeters ?? null,
    etaMinutes: tracking?.etaMinutes ?? null,
    lastLocationAt: tracking?.lastLocationAt ?? null,
    trackingUpdatedAt: tracking?.updatedAt ?? null,
  };
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

  const now = new Date();
  await db
    .insert(jobTracking)
    .values({
      requestId: data.requestId,
      providerLatitude: data.latitude,
      providerLongitude: data.longitude,
      accuracyMeters: data.accuracyMeters,
      lastLocationAt: now,
      updatedByUserId: data.userId,
    })
    .onDuplicateKeyUpdate({
      set: {
        providerLatitude: data.latitude,
        providerLongitude: data.longitude,
        accuracyMeters: data.accuracyMeters,
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
    } else {
      const refundResult = await tx
        .update(payments)
        .set({ status: "refunded" })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "held")));
      if ((refundResult[0]?.affectedRows ?? 0) !== 1) throw new Error("ESCROW_REFUND_CONFLICT");
      await tx
        .update(jobCompletionProofs)
        .set({ status: "resolved" })
        .where(eq(jobCompletionProofs.id, proof.id));
    }
    await tx
      .update(completionDisputes)
      .set({
        status: data.resolution === "provider" ? "resolved_provider" : "resolved_customer",
        reviewedByUserId: data.adminUserId,
        resolutionNote: data.resolutionNote.trim(),
        resolvedAt: now,
      })
      .where(eq(completionDisputes.id, dispute.id));
    return { requestId: data.requestId, resolution: data.resolution, resolvedAt: now };
  });
  await logOperationEvent({
    eventType: "completion_dispute.resolved",
    subjectId: data.requestId,
    actorId: data.adminUserId,
    severity: data.resolution === "customer" ? "warning" : "info",
    payload: { resolution: data.resolution },
  });
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

    return { success: true, offerId: offer.id, requestId: request.id, agreementId };
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership or assignment
  const rows = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).limit(1);
  if (rows.length === 0) throw new Error("Service request not found");
  const request = rows[0];

  // Only the job owner or assigned provider can update status
  if (request.userId !== userId && request.assignedProviderId !== userId) {
    throw new Error("Not authorized to update this job status");
  }

  await db.update(serviceRequests).set({ status }).where(eq(serviceRequests.id, requestId));
  return { success: true, requestId, status };
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

  await db.update(serviceRequests).set({ status: "completed" }).where(eq(serviceRequests.id, requestId));

  // Increment provider's completedJobs
  if (request.assignedProviderId) {
    const providerRows = await db.select().from(providers).where(eq(providers.id, request.assignedProviderId)).limit(1);
    if (providerRows.length > 0) {
      const currentCompleted = (providerRows[0].completedJobs ?? 0) as number;
      await db.update(providers).set({ completedJobs: currentCompleted + 1 }).where(eq(providers.id, request.assignedProviderId));
    }
  }

  return { success: true, requestId };
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

// Get new jobs for a provider (pending requests in their category)
export async function getNewJobsForProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  const providerRows = await db.select().from(providers).where(eq(providers.userId, providerId)).limit(1);
  if (providerRows.length === 0) return [];

  const provider = providerRows[0];
  const categoryId = provider.categoryId;
  if (!categoryId || provider.isAvailable !== 1) return [];

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

  return rankServiceOpportunitiesByLocation(
    candidates,
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
    commissionRateBps: agreement.commissionRateBps,
    commissionAmount: agreement.commissionAmount,
    providerPayout: agreement.providerPayout,
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
      await postFinancialLedgerEntry(tx, buildRefundLedgerEntry(updatedRows[0]));
      await resolveRefundCancellationInTransaction(tx, updatedRows[0]);
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
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
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
    const result = await tx.insert(moveAiDrafts).values({
      userId: input.userId,
      sourceMessage: input.sourceMessage,
      assistantSummary: input.assistantSummary,
      categoryId: input.categoryId,
      draftJson: JSON.stringify(payload),
      riskLevel: input.riskLevel,
      status,
      expiresAt,
    });
    const id = Number(result[0].insertId);
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
