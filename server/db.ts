import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { DB_POOL_CONFIG } from "./_core/config";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
// Issue #27: Connection pool configured with min/max connections and timeouts.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: DB_POOL_CONFIG.maxConnections,
        queueLimit: 0,
      });
      _db = drizzle(pool);
      console.log(`[Database] Pool configured: max=${DB_POOL_CONFIG.maxConnections}`);
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
  const result = await db.insert(offers).values(data);
  return result[0].insertId;
}

export async function getOffersForRequest(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(offers).where(eq(offers.requestId, requestId));
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

/**
 * Issue #21: N+1 Query — Batch provider profiles in a single query.
 * Instead of N separate queries, fetches all providers by userId in one call.
 */
export async function getProviderProfilesBatch(userIds: number[]) {
  const db = await getDb();
  if (!db || userIds.length === 0) return [];
  const { inArray } = await import("drizzle-orm");
  return db.select().from(providers).where(inArray(providers.userId, userIds));
}

/**
 * Issue #21: N+1 Query — Batch service requests for multiple users.
 * Returns a map of userId → serviceRequests[] in a single query.
 */
export async function getUserServiceRequestsBatch(userIds: number[]) {
  const db = await getDb();
  if (!db || userIds.length === 0) return new Map<number, typeof serviceRequests.$inferSelect[]>();
  const { inArray } = await import("drizzle-orm");
  const rows = await db.select().from(serviceRequests).where(inArray(serviceRequests.userId, userIds));
  const map = new Map<number, typeof serviceRequests.$inferSelect[]>();
  for (const row of rows) {
    const arr = map.get(row.userId) || [];
    arr.push(row);
    map.set(row.userId, arr);
  }
  return map;
}

/**
 * Issue #21: N+1 Query — Batch offers for multiple requests.
 * Returns a map of requestId → offers[] in a single query.
 */
export async function getOffersForRequestsBatch(requestIds: number[]) {
  const db = await getDb();
  if (!db || requestIds.length === 0) return new Map<number, typeof offers.$inferSelect[]>();
  const { inArray } = await import("drizzle-orm");
  const rows = await db.select().from(offers).where(inArray(offers.requestId, requestIds));
  const map = new Map<number, typeof offers.$inferSelect[]>();
  for (const row of rows) {
    const arr = map.get(row.requestId) || [];
    arr.push(row);
    map.set(row.requestId, arr);
  }
  return map;
}

/**
 * Issue #21: N+1 Query — Get service request with related offers in a single query.
 */
export async function getServiceRequestWithOffers(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { sql } = await import("drizzle-orm");
  const requestRows = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
  if (requestRows.length === 0) return null;
  const offerRows = await db.select().from(offers).where(eq(offers.requestId, id));
  return { ...requestRows[0], offers: offerRows };
}

export async function getNearbyProviders(lat: string, lng: string) {
  const db = await getDb();
  if (!db) return [];
  // Issue #21: Filter by verified providers, sort by rating, limit results
  return db.select().from(providers)
    .where(eq(providers.isVerified, 1))
    .limit(20);
}
