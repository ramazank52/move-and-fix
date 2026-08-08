import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  walletAccounts,
  walletTransactions,
  walletWithdrawals,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

// TODO: add feature queries here as your schema grows.

import { serviceRequests, providers, offers, messages, payments } from "../drizzle/schema";

// Service Requests
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
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(serviceRequests).values(data);
  return result[0].insertId;
}

export async function getUserServiceRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceRequests).where(eq(serviceRequests.userId, userId));
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
export async function sendMessage(data: {
  senderId: number;
  receiverId: number;
  requestId?: number;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data);
  return result[0].insertId;
}

export async function getConversation(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return [];
  const { or, and } = await import("drizzle-orm");
  return db.select().from(messages).where(
    or(
      and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
      and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
    )!
  );
}

// Providers
export async function getProviderProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(providers).where(eq(providers.userId, userId));
  return rows[0] ?? null;
}

export async function getNearbyProviders(lat: string, lng: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(providers).limit(20);
}

// ── Job Lifecycle Functions ──

// Accept an offer and assign provider to the service request
export async function acceptOffer(offerId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the offer first
  const offerRows = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
  if (offerRows.length === 0) throw new Error("Offer not found");
  const offer = offerRows[0];

  // Verify the service request belongs to this user
  const requestRows = await db.select().from(serviceRequests).where(eq(serviceRequests.id, offer.requestId)).limit(1);
  if (requestRows.length === 0) throw new Error("Service request not found");
  if (requestRows[0].userId !== userId) throw new Error("Not authorized to accept this offer");

  // Update offer status to accepted
  await db.update(offers).set({ status: "accepted" }).where(eq(offers.id, offerId));

  // Update service request: assign provider and set status to active
  await db.update(serviceRequests)
    .set({ assignedProviderId: offer.providerId, status: "active" })
    .where(eq(serviceRequests.id, offer.requestId));

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

  // For now, store review as a message with special content
  // In a full implementation, we'd have a reviews table
  await db.insert(messages).values({
    senderId: data.userId,
    receiverId: data.providerId,
    requestId: data.requestId,
    content: `[REVIEW] Rating: ${data.rating}/5${data.comment ? ` — ${data.comment}` : ""}`,
  });

  // Update provider rating
  const providerRows = await db.select().from(providers).where(eq(providers.id, data.providerId)).limit(1);
  if (providerRows.length > 0) {
    const currentRating = (providerRows[0].rating ?? 0) as number;
    const currentJobs = (providerRows[0].completedJobs ?? 0) as number;
    const newRating = Math.round((currentRating * currentJobs + data.rating) / (currentJobs + 1));
    await db.update(providers).set({ rating: newRating }).where(eq(providers.id, data.providerId));
  }

  return { success: true };
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
  if (!db) return { totalEarnings: 0, pendingPayments: 0, completedJobs: 0 };

  const providerRows = await db.select().from(providers).where(eq(providers.userId, providerId)).limit(1);
  if (providerRows.length === 0) return { totalEarnings: 0, pendingPayments: 0, completedJobs: 0 };

  const providerRecordId = providerRows[0].id;

  // Get all payments for this provider
  const paymentRows = await db.select().from(payments).where(eq(payments.providerId, providerRecordId));

  const totalEarnings = paymentRows
    .filter(p => p.status === "released")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const pendingPayments = paymentRows
    .filter(p => p.status === "pending" || p.status === "held")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    totalEarnings,
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

  const categoryId = providerRows[0].categoryId;
  if (!categoryId) return [];

  // Get pending requests in the provider's category
  return db.select().from(serviceRequests).where(
    eq(serviceRequests.categoryId, categoryId)
  ).limit(20);
}

// Create payment record (escrow)
export async function createPayment(data: {
  requestId: number;
  userId: number;
  providerId: number;
  amount: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values(data);
  return result[0].insertId;
}

// Update payment status
export async function updatePaymentStatus(paymentId: number, status: "pending" | "held" | "released" | "refunded") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payments).set({ status }).where(eq(payments.id, paymentId));
  return { success: true, paymentId, status };
}

// Get payments for a user
export async function getUserPayments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId));
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

export async function requestWalletWithdrawal(data: {
  userId: number;
  amount: number;
  bankAccountId: string;
  idempotencyKey: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
      throw new Error("Yetersiz kullanılabilir bakiye");
    }

    const transactionResult = await tx.insert(walletTransactions).values({
      userId: data.userId,
      type: "withdrawal",
      status: "pending",
      amount: data.amount,
      description: "Banka hesabına para çekme talebi",
      idempotencyKey: scopedKey,
      metadata: JSON.stringify({ bankAccountId: data.bankAccountId }),
    });
    const transactionId = transactionResult[0].insertId;

    await tx.insert(walletWithdrawals).values({
      userId: data.userId,
      transactionId,
      amount: data.amount,
      bankAccountId: data.bankAccountId,
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
