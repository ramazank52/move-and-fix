import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Service categories
export const serviceCategories = mysqlTable("service_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 10 }),
  color: varchar("color", { length: 10 }),
  pricingType: mysqlEnum("pricingType", ["fixed", "km_based", "hourly"]).default("fixed").notNull(),
  kmRate: int("kmRate"),
  basePrice: int("basePrice"),
  isActive: int("isActive").default(1).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Optional child services managed under a top-level category.
export const serviceSubcategories = mysqlTable(
  "service_subcategories",
  {
    id: int("id").autoincrement().primaryKey(),
    categoryId: int("categoryId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    description: text("description"),
    isActive: int("isActive").default(1).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_subcategories_category_slug_unique").on(table.categoryId, table.slug),
    index("service_subcategories_category_active_sort_idx").on(
      table.categoryId,
      table.isActive,
      table.sortOrder,
    ),
  ],
);

// Provider profiles
export const providers = mysqlTable("providers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 200 }).notNull(),
  bio: text("bio"),
  categoryId: int("categoryId"),
  rating: int("rating").default(0),
  completedJobs: int("completedJobs").default(0),
  moveScore: int("moveScore").default(50),
  isVerified: int("isVerified").default(0),
  isPremium: int("isPremium").default(0),
  isAvailable: int("isAvailable").default(1).notNull(),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const providerFavorites = mysqlTable(
  "provider_favorites",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    providerId: int("providerId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("provider_favorites_user_provider_unique").on(table.userId, table.providerId),
  ],
);

// Service requests (jobs)
export const serviceRequests = mysqlTable("service_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "active", "completed", "cancelled"]).default("pending").notNull(),
  address: text("address"),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  budgetMin: int("budgetMin"),
  budgetMax: int("budgetMax"),
  distanceKm: int("distanceKm"),
  estimatedPrice: int("estimatedPrice"),
  assignedProviderId: int("assignedProviderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Structured, service-specific information kept outside the legacy request row.
export const serviceRequestDetails = mysqlTable(
  "service_request_details",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    subcategoryId: int("subcategoryId"),
    serviceType: mysqlEnum("serviceType", [
      "generic",
      "painting",
      "electrical",
      "plumbing",
      "cleaning",
      "moving",
      "courier",
      "tow_truck",
      "roadside",
    ])
      .default("generic")
      .notNull(),
    pickupAddress: text("pickupAddress"),
    destinationAddress: text("destinationAddress"),
    pickupLatitude: varchar("pickupLatitude", { length: 20 }),
    pickupLongitude: varchar("pickupLongitude", { length: 20 }),
    destinationLatitude: varchar("destinationLatitude", { length: 20 }),
    destinationLongitude: varchar("destinationLongitude", { length: 20 }),
    pickupFloor: int("pickupFloor"),
    destinationFloor: int("destinationFloor"),
    pickupHasElevator: int("pickupHasElevator"),
    destinationHasElevator: int("destinationHasElevator"),
    distanceKm: int("distanceKm"),
    attributesJson: text("attributesJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_request_details_request_unique").on(table.requestId),
    index("service_request_details_type_idx").on(table.serviceType),
  ],
);

// Immutable metadata for request images/videos uploaded through the authenticated API.
export const serviceRequestMedia = mysqlTable(
  "service_request_media",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    ownerUserId: int("ownerUserId").notNull(),
    purpose: mysqlEnum("purpose", ["request", "before", "after", "completion", "dispute"])
      .default("request")
      .notNull(),
    kind: mysqlEnum("kind", ["image", "video", "document"]).notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_request_media_storage_key_unique").on(table.storageKey),
    index("service_request_media_request_purpose_idx").on(table.requestId, table.purpose),
    index("service_request_media_owner_idx").on(table.ownerUserId),
  ],
);

// Offers from providers
export const offers = mysqlTable("offers", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  providerId: int("providerId").notNull(),
  price: int("price").notNull(),
  message: text("message"),
  estimatedTime: varchar("estimatedTime", { length: 100 }),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Active-job lifecycle and the assigned provider's latest foreground location.
export const jobTracking = mysqlTable(
  "job_tracking",
  {
    requestId: int("requestId").primaryKey(),
    lifecycleStatus: mysqlEnum("lifecycleStatus", [
      "scheduled",
      "on_the_way",
      "arrived",
      "in_progress",
      "completed",
      "cancelled",
    ])
      .default("scheduled")
      .notNull(),
    providerLatitude: varchar("providerLatitude", { length: 20 }),
    providerLongitude: varchar("providerLongitude", { length: 20 }),
    accuracyMeters: int("accuracyMeters"),
    etaMinutes: int("etaMinutes"),
    lastLocationAt: timestamp("lastLocationAt"),
    updatedByUserId: int("updatedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("job_tracking_status_idx").on(table.lifecycleStatus),
    index("job_tracking_updated_at_idx").on(table.updatedAt),
  ],
);

// Messages
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  receiverId: int("receiverId").notNull(),
  requestId: int("requestId"),
  content: text("content").notNull(),
  isRead: int("isRead").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Payments (escrow)
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().unique(),
  userId: int("userId").notNull(),
  providerId: int("providerId").notNull(),
  offerId: int("offerId"),
  amount: int("amount").notNull(),
  commissionRateBps: int("commissionRateBps"),
  commissionAmount: int("commissionAmount"),
  providerPayout: int("providerPayout"),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).unique(),
  gatewayProvider: mysqlEnum("gatewayProvider", ["iyzico", "stripe"]),
  gatewayCheckoutToken: varchar("gatewayCheckoutToken", { length: 191 }).unique(),
  gatewayPaymentId: varchar("gatewayPaymentId", { length: 191 }).unique(),
  status: mysqlEnum("status", ["pending", "held", "released", "refunded"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Payment webhook delivery ledger — provider event IDs are globally idempotent per provider.
export const paymentWebhookEvents = mysqlTable(
  "payment_webhook_events",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: mysqlEnum("provider", ["iyzico", "stripe"]).notNull(),
    eventId: varchar("eventId", { length: 191 }).notNull(),
    eventType: varchar("eventType", { length: 96 }).notNull(),
    payloadHash: varchar("payloadHash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["processing", "processed", "failed"])
      .default("processing")
      .notNull(),
    error: text("error"),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
  },
  (table) => [
    uniqueIndex("payment_webhook_provider_event_unique").on(table.provider, table.eventId),
  ],
);

// Verified reviews — exactly one review is allowed for each completed request.
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().unique(),
  userId: int("userId").notNull(),
  providerId: int("providerId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// User wallet balances — amounts are stored in the currency's minor unit.
export const walletAccounts = mysqlTable("wallet_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
  availableBalance: int("availableBalance").default(0).notNull(),
  pendingBalance: int("pendingBalance").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const walletTransactions = mysqlTable("wallet_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "deposit",
    "escrow_hold",
    "commission_deduction",
    "provider_payout",
    "withdrawal",
    "refund",
    "adjustment",
  ]).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "cancelled"]).notNull(),
  amount: int("amount").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  reference: varchar("reference", { length: 96 }),
  idempotencyKey: varchar("idempotencyKey", { length: 96 }).unique(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const walletWithdrawals = mysqlTable("wallet_withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  transactionId: int("transactionId").notNull(),
  amount: int("amount").notNull(),
  bankAccountId: varchar("bankAccountId", { length: 96 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "cancelled"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Export types
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type ProviderFavorite = typeof providerFavorites.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type JobTracking = typeof jobTracking.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PaymentWebhookEvent = typeof paymentWebhookEvents.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type WalletAccount = typeof walletAccounts.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type WalletWithdrawal = typeof walletWithdrawals.$inferSelect;
