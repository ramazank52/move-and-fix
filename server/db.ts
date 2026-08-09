import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  walletAccounts,
  walletTransactions,
  walletWithdrawals,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  assertPaymentStatusTransition,
  calculatePaymentBreakdown,
  commissionRateForProvider,
  type EscrowPaymentStatus,
} from "./payments/policy";
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
  providerFavorites,
  reviews,
  jobTracking,
} from "../drizzle/schema";

// Service Categories
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
  purpose: "request" | "before" | "after" | "completion" | "dispute";
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
  if (requestRows[0].status !== "pending") throw new Error("Service request is not accepting offers");
  if (offer.status !== "pending") throw new Error("Offer is not pending");

  // Close competing pending offers before accepting the selected offer.
  await db
    .update(offers)
    .set({ status: "rejected" })
    .where(and(eq(offers.requestId, offer.requestId), eq(offers.status, "pending")));

  // Update selected offer status to accepted
  await db.update(offers).set({ status: "accepted" }).where(eq(offers.id, offerId));

  // Update service request: assign provider and set status to active
  await db.update(serviceRequests)
    .set({ assignedProviderId: offer.providerId, status: "active" })
    .where(eq(serviceRequests.id, offer.requestId));

  return { success: true, offerId, requestId: offer.requestId };
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

  const offerRows = await db
    .select()
    .from(offers)
    .where(
      and(
        eq(offers.requestId, request.id),
        eq(offers.providerId, request.assignedProviderId),
        eq(offers.status, "accepted"),
      ),
    )
    .limit(1);
  const offer = offerRows[0];
  if (!offer) throw new Error("PAYMENT_ACCEPTED_OFFER_NOT_FOUND");

  const providerRows = await db
    .select()
    .from(providers)
    .where(eq(providers.id, request.assignedProviderId))
    .limit(1);
  const provider = providerRows[0];
  if (!provider) throw new Error("PAYMENT_PROVIDER_NOT_FOUND");

  const breakdown = calculatePaymentBreakdown(
    offer.price,
    commissionRateForProvider(provider.isPremium === 1),
  );

  return {
    requestId: request.id,
    requestTitle: request.title,
    providerId: provider.id,
    providerName: provider.displayName,
    offerId: offer.id,
    currency: "TRY" as const,
    ...breakdown,
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

    const result = await tx.insert(payments).values({
      requestId: quote.requestId,
      userId: data.userId,
      providerId: quote.providerId,
      offerId: quote.offerId,
      amount: quote.amount,
      commissionRateBps: quote.commissionRateBps,
      commissionAmount: quote.commissionAmount,
      providerPayout: quote.providerPayout,
      idempotencyKey: scopedKey,
      status: "pending",
    });
    const rows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, result[0].insertId))
      .limit(1);
    if (!rows[0]) throw new Error("PAYMENT_CREATE_FAILED");
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

    assertPaymentStatusTransition(payment.status, data.nextStatus);
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
