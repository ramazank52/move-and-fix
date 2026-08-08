import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

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
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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
  requestId: int("requestId").notNull(),
  userId: int("userId").notNull(),
  providerId: int("providerId").notNull(),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["pending", "held", "released", "refunded"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type WalletAccount = typeof walletAccounts.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type WalletWithdrawal = typeof walletWithdrawals.$inferSelect;
