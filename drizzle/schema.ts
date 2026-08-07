import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, index, uniqueIndex } from "drizzle-orm/mysql-core";

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
}, (table) => ({
  // Issue #20: Database indexes for frequently queried columns
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
  roleIdx: index("users_role_idx").on(table.role),
}));

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
}, (table) => ({
  // Issue #20: Database indexes
  userIdIdx: index("providers_userId_idx").on(table.userId),
  categoryIdIdx: index("providers_categoryId_idx").on(table.categoryId),
  ratingIdx: index("providers_rating_idx").on(table.rating),
  isVerifiedIdx: index("providers_isVerified_idx").on(table.isVerified),
}));

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
}, (table) => ({
  // Issue #20: Database indexes
  userIdIdx: index("service_requests_userId_idx").on(table.userId),
  statusIdx: index("service_requests_status_idx").on(table.status),
  categoryIdIdx: index("service_requests_categoryId_idx").on(table.categoryId),
  assignedProviderIdx: index("service_requests_assignedProviderId_idx").on(table.assignedProviderId),
}));

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
}, (table) => ({
  // Issue #20: Database indexes
  requestIdIdx: index("offers_requestId_idx").on(table.requestId),
  providerIdIdx: index("offers_providerId_idx").on(table.providerId),
  statusIdx: index("offers_status_idx").on(table.status),
}));

// Messages
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  receiverId: int("receiverId").notNull(),
  requestId: int("requestId"),
  content: text("content").notNull(),
  isRead: int("isRead").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  // Issue #20: Database indexes
  senderIdIdx: index("messages_senderId_idx").on(table.senderId),
  receiverIdIdx: index("messages_receiverId_idx").on(table.receiverId),
  requestIdIdx: index("messages_requestId_idx").on(table.requestId),
  isReadIdx: index("messages_isRead_idx").on(table.isRead),
}));

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
}, (table) => ({
  // Issue #20: Database indexes
  requestIdIdx: index("payments_requestId_idx").on(table.requestId),
  userIdIdx: index("payments_userId_idx").on(table.userId),
  providerIdIdx: index("payments_providerId_idx").on(table.providerId),
  statusIdx: index("payments_status_idx").on(table.status),
}));

// Export types
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Payment = typeof payments.$inferSelect;
