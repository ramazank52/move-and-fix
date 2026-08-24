import { foreignKey, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
  phone: varchar("phone", { length: 32 }),
  // The active contact is never overwritten until the pending destination has
  // passed a one-time owner verification challenge.
  pendingEmailChange: varchar("pendingEmailChange", { length: 320 }),
  pendingEmailToken: varchar("pendingEmailToken", { length: 128 }),
  pendingEmailTokenExpiry: timestamp("pendingEmailTokenExpiry"),
  pendingPhoneChange: varchar("pendingPhoneChange", { length: 32 }),
  pendingPhoneToken: varchar("pendingPhoneToken", { length: 128 }),
  pendingPhoneTokenExpiry: timestamp("pendingPhoneTokenExpiry"),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Contact verification is deliberately independent from the legacy timestamp
// flags on users. It preserves the current lifecycle without treating a code
// request as proof of ownership.
export const contactVerificationStates = mysqlTable(
  "contact_verification_states",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    contactType: mysqlEnum("contactType", ["email", "phone"]).notNull(),
    contactValue: varchar("contactValue", { length: 320 }).notNull(),
    status: mysqlEnum("status", ["unverified", "pending", "verified"]).default("unverified").notNull(),
    challengeId: int("challengeId"),
    initiatedAt: timestamp("initiatedAt"),
    verifiedAt: timestamp("verifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("contact_verification_user_type_unique").on(table.userId, table.contactType),
    index("contact_verification_user_status_idx").on(table.userId, table.status),
  ],
);

// An organization is a separately auditable customer account. It never replaces
// the natural person who created a request: request.userId remains the acting
// member while organizationId identifies the billed/operating entity.
export const organizations = mysqlTable(
  "organizations",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    taxId: varchar("taxId", { length: 64 }),
    type: mysqlEnum("type", ["corporate", "fleet", "facility"]).notNull(),
    ownerId: int("ownerId").notNull(),
    status: mysqlEnum("status", ["active", "suspended", "archived"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("organizations_owner_status_idx").on(table.ownerId, table.status),
    uniqueIndex("organizations_owner_tax_id_unique").on(table.ownerId, table.taxId),
  ],
);

export const organizationMembers = mysqlTable(
  "organization_members",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["owner", "admin", "member"]).notNull(),
    invitedByUserId: int("invitedByUserId").notNull(),
    invitedAt: timestamp("invitedAt").defaultNow().notNull(),
    joinedAt: timestamp("joinedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_members_org_user_unique").on(table.organizationId, table.userId),
    index("organization_members_user_idx").on(table.userId, table.organizationId),
    index("organization_members_org_role_idx").on(table.organizationId, table.role),
  ],
);

// The primary platform role remains users.role for backward compatibility.
// This narrow table records the elevated administrative scope required for
// destructive, cross-tenant MoveOS actions.
export const adminRoles = mysqlTable(
  "admin_roles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["super_admin"]).notNull(),
    grantedByUserId: int("grantedByUserId").notNull(),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
    revokedAt: timestamp("revokedAt"),
  },
  (table) => [
    uniqueIndex("admin_roles_user_role_unique").on(table.userId, table.role),
    index("admin_roles_active_idx").on(table.role, table.revokedAt),
  ],
);

// Narrow, revocable scope for viewing provider document content during a review.
// It intentionally does not grant broader MoveOS or provider-management powers.
export const providerDocumentReviewerPermissions = mysqlTable(
  "provider_document_reviewer_permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    grantedByUserId: int("grantedByUserId").notNull(),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
    revokedAt: timestamp("revokedAt"),
  },
  (table) => [
    uniqueIndex("provider_doc_reviewer_user_unique").on(table.userId),
    index("provider_doc_reviewer_active_idx").on(table.userId, table.revokedAt),
  ],
);

// Financial completion-dispute settlement is distinct from document review.
// This revocable scope is required in addition to admin MFA for settlement plans.
export const completionDisputeReviewerPermissions = mysqlTable(
  "completion_dispute_reviewer_permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    grantedByUserId: int("grantedByUserId").notNull(),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
    revokedAt: timestamp("revokedAt"),
  },
  (table) => [
    uniqueIndex("completion_dispute_reviewer_user_unique").on(table.userId),
    index("completion_dispute_reviewer_active_idx").on(table.userId, table.revokedAt),
  ],
);

// Contains only an opaque provider-side reference; actual telephone numbers or
// message addresses are never copied into the application database. A proxy
// session can be created only for an assigned job's two participants.
export const maskedCommunicationSessions = mysqlTable(
  "masked_communication_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    customerUserId: int("customerUserId").notNull(),
    providerUserId: int("providerUserId").notNull(),
    channel: mysqlEnum("channel", ["phone", "message"]).notNull(),
    status: mysqlEnum("status", ["not_configured", "pending", "active", "released", "expired"])
      .default("not_configured")
      .notNull(),
    providerSessionReference: varchar("providerSessionReference", { length: 191 }),
    expiresAt: timestamp("expiresAt"),
    expiredAt: timestamp("expiredAt"),
    releasedAt: timestamp("releasedAt"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("masked_communication_request_channel_unique").on(table.requestId, table.channel),
    index("masked_communication_customer_idx").on(table.customerUserId, table.status),
    index("masked_communication_provider_idx").on(table.providerUserId, table.status),
    index("masked_communication_expiry_idx").on(table.status, table.expiresAt),
  ],
);

// Privacy-rights records preserve a data-subject request without changing the
// immutable consent, financial or audit ledgers. An erasure request is blocked
// only by a separately recorded active legal hold.
export const privacyRightsRequests = mysqlTable(
  "privacy_rights_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    requesterUserId: int("requesterUserId").notNull(),
    requestType: mysqlEnum("requestType", ["export", "erasure", "rectification"]).notNull(),
    status: mysqlEnum("status", ["open", "in_review", "blocked_legal_hold", "approved", "rejected", "completed"])
      .default("open")
      .notNull(),
    requestReason: varchar("requestReason", { length: 500 }),
    reviewNote: varchar("reviewNote", { length: 1000 }),
    reviewedByUserId: int("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("privacy_rights_requester_status_idx").on(table.requesterUserId, table.status),
    index("privacy_rights_status_created_idx").on(table.status, table.createdAt),
  ],
);

// Legal holds are explicit, reversible and reviewer-owned. They prevent only
// execution of an erasure request and never conceal that the request exists.
export const privacyLegalHolds = mysqlTable(
  "privacy_legal_holds",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    reason: varchar("reason", { length: 1000 }).notNull(),
    status: mysqlEnum("status", ["active", "released"]).default("active").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    releasedByUserId: int("releasedByUserId"),
    releasedAt: timestamp("releasedAt"),
  },
  (table) => [index("privacy_legal_hold_user_status_idx").on(table.userId, table.status)],
);

// Immutable, denormalized references to already-authoritative job records.
// This is a read model for the Job Capsule; it never replaces agreement,
// payment, media, completion, review or dispute source tables.
export const jobTimelineEvents = mysqlTable(
  "job_timeline_events",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    eventType: varchar("eventType", { length: 96 }).notNull(),
    actorUserId: int("actorUserId"),
    referenceType: varchar("referenceType", { length: 64 }).notNull(),
    referenceId: int("referenceId"),
    metadataJson: json("metadataJson").notNull(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("job_timeline_events_reference_unique").on(table.requestId, table.referenceType, table.referenceId),
    index("job_timeline_events_request_time_idx").on(table.requestId, table.occurredAt),
    index("job_timeline_events_actor_time_idx").on(table.actorUserId, table.occurredAt),
  ],
);

// An auditable, non-binding outcome of explainable statistical price analysis.
// It never writes a request, agreement, payment or settlement amount.
export const priceIntelligenceAssessments = mysqlTable(
  "price_intelligence_assessments",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId"),
    requestedByUserId: int("requestedByUserId").notNull(),
    categoryId: int("categoryId").notNull(),
    countryCode: varchar("countryCode", { length: 2 }).default("TR").notNull(),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    status: mysqlEnum("status", ["available", "insufficient_data", "unavailable", "failed"])
      .default("insufficient_data")
      .notNull(),
    sampleSize: int("sampleSize").default(0).notNull(),
    medianAmount: int("medianAmount"),
    lowAmount: int("lowAmount"),
    highAmount: int("highAmount"),
    explanationJson: json("explanationJson").notNull(),
    dataWindowStartedAt: timestamp("dataWindowStartedAt"),
    dataWindowEndedAt: timestamp("dataWindowEndedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("price_intelligence_request_idx").on(table.requestId, table.createdAt),
    index("price_intelligence_category_status_idx").on(table.categoryId, table.status, table.createdAt),
    index("price_intelligence_requester_idx").on(table.requestedByUserId, table.createdAt),
  ],
);

// Safety records are platform incidents and check-ins, not emergency-service
// dispatch records. Sensitive trusted-contact details are encrypted before write.
export const safetyTrustedContacts = mysqlTable(
  "safety_trusted_contacts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    encryptedContactJson: text("encryptedContactJson").notNull(),
    label: varchar("label", { length: 80 }),
    status: mysqlEnum("status", ["active", "revoked"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    revokedAt: timestamp("revokedAt"),
  },
  (table) => [
    index("safety_trusted_contacts_user_status_idx").on(table.userId, table.status, table.createdAt),
  ],
);

export const safetyCheckIns = mysqlTable(
  "safety_check_ins",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    userId: int("userId").notNull(),
    status: mysqlEnum("status", ["requested", "acknowledged", "missed", "cancelled"])
      .default("requested")
      .notNull(),
    dueAt: timestamp("dueAt").notNull(),
    acknowledgedAt: timestamp("acknowledgedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("safety_check_ins_request_user_idx").on(table.requestId, table.userId, table.status),
    index("safety_check_ins_due_idx").on(table.status, table.dueAt),
  ],
);

export const safetyIncidents = mysqlTable(
  "safety_incidents",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId"),
    reporterUserId: int("reporterUserId").notNull(),
    category: mysqlEnum("category", ["conduct", "identity", "unsafe_condition", "harassment", "other"]).notNull(),
    severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
    description: text("description").notNull(),
    status: mysqlEnum("status", ["open", "under_review", "resolved", "dismissed"])
      .default("open")
      .notNull(),
    externalDeliveryStatus: mysqlEnum("externalDeliveryStatus", ["not_configured", "not_requested", "queued", "delivered", "failed"])
      .default("not_configured")
      .notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    resolutionNote: text("resolutionNote"),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("safety_incidents_request_status_idx").on(table.requestId, table.status, table.createdAt),
    index("safety_incidents_reporter_idx").on(table.reporterUserId, table.createdAt),
    index("safety_incidents_status_severity_idx").on(table.status, table.severity, table.createdAt),
  ],
);

// Fleet/facility extensions intentionally reuse organizationId and the existing
// service request domain; none of these tables creates a parallel job system.
export const organizationSites = mysqlTable(
  "organization_sites",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    address: text("address").notNull(),
    latitude: varchar("latitude", { length: 20 }),
    longitude: varchar("longitude", { length: 20 }),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("organization_sites_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const organizationManagedAssets = mysqlTable(
  "organization_managed_assets",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull(),
    siteId: int("siteId"),
    kind: mysqlEnum("kind", ["property", "vehicle", "equipment", "other"]).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    externalReference: varchar("externalReference", { length: 128 }),
    detailsJson: json("detailsJson").notNull(),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("organization_assets_org_status_idx").on(table.organizationId, table.status),
    index("organization_assets_site_idx").on(table.siteId, table.status),
  ],
);

export const organizationMaintenanceSchedules = mysqlTable(
  "organization_maintenance_schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull(),
    siteId: int("siteId"),
    assetId: int("assetId"),
    categoryId: int("categoryId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    cadence: mysqlEnum("cadence", ["weekly", "monthly", "quarterly", "annual"]).notNull(),
    nextRunAt: timestamp("nextRunAt").notNull(),
    status: mysqlEnum("status", ["active", "paused", "archived"]).default("active").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("organization_maintenance_due_idx").on(table.status, table.nextRunAt),
    index("organization_maintenance_org_idx").on(table.organizationId, table.status),
  ],
);

export const organizationRequestApprovals = mysqlTable(
  "organization_request_approvals",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    organizationId: int("organizationId").notNull(),
    requestedByUserId: int("requestedByUserId").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    decisionNote: text("decisionNote"),
    decidedAt: timestamp("decidedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_request_approvals_request_unique").on(table.requestId),
    index("organization_request_approvals_org_status_idx").on(table.organizationId, table.status, table.createdAt),
  ],
);

// A batch coordinates multiple normal service requests; it does not replace the
// existing request lifecycle. Each child request keeps its own actor, agreement,
// escrow and authorization checks.
export const organizationRequestBatches = mysqlTable(
  "organization_request_batches",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    categoryId: int("categoryId").notNull(),
    siteId: int("siteId"),
    description: text("description"),
    requestedForAt: timestamp("requestedForAt"),
    status: mysqlEnum("status", ["draft", "submitted", "cancelled", "completed"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("organization_request_batches_org_status_idx").on(table.organizationId, table.status, table.createdAt),
    index("organization_request_batches_creator_idx").on(table.createdByUserId, table.createdAt),
  ],
);

export const organizationRequestBatchItems = mysqlTable(
  "organization_request_batch_items",
  {
    id: int("id").autoincrement().primaryKey(),
    batchId: int("batchId").notNull(),
    requestId: int("requestId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_batch_items_request_unique").on(table.requestId),
    uniqueIndex("organization_batch_items_batch_request_unique").on(table.batchId, table.requestId),
    index("organization_batch_items_batch_idx").on(table.batchId, table.createdAt),
  ],
);

// Corporate invoices are financial documents generated from already-authoritative
// request/payment facts. All settlement remains TRY until a regulated FX source is
// explicitly configured and approved.
export const organizationInvoices = mysqlTable(
  "organization_invoices",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull(),
    requestId: int("requestId"),
    batchId: int("batchId"),
    invoiceNumber: varchar("invoiceNumber", { length: 96 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    subtotalAmount: int("subtotalAmount").notNull(),
    taxAmount: int("taxAmount").default(0).notNull(),
    totalAmount: int("totalAmount").notNull(),
    status: mysqlEnum("status", ["draft", "issued", "paid", "void"]).default("draft").notNull(),
    issuedAt: timestamp("issuedAt"),
    paidAt: timestamp("paidAt"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_invoices_number_unique").on(table.invoiceNumber),
    uniqueIndex("organization_invoices_request_unique").on(table.requestId),
    index("organization_invoices_org_status_idx").on(table.organizationId, table.status, table.createdAt),
    index("organization_invoices_batch_idx").on(table.batchId, table.createdAt),
  ],
);

// Append-only consent evidence. A withdrawal is a new event; previously granted
// evidence is intentionally never overwritten or deleted.
export const consentEvents = mysqlTable(
  "consent_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    consentKey: varchar("consentKey", { length: 96 }).notNull(),
    documentVersion: varchar("documentVersion", { length: 64 }).notNull(),
    purpose: mysqlEnum("purpose", ["legal", "marketing", "transactional"]).notNull(),
    action: mysqlEnum("action", ["granted", "withdrawn"]).notNull(),
    source: varchar("source", { length: 80 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("consent_events_user_key_created_idx").on(table.userId, table.consentKey, table.createdAt),
    index("consent_events_purpose_action_idx").on(table.purpose, table.action, table.createdAt),
  ],
);

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

// Explicit aliases are compatibility metadata only. Canonical service identity
// remains the active category/subcategory row; display-name matching is not a
// permitted fallback for compliance, onboarding or request validation.
export const serviceCatalogAliases = mysqlTable(
  "service_catalog_aliases",
  {
    id: int("id").autoincrement().primaryKey(),
    namespace: mysqlEnum("namespace", [
      "legacy_category",
      "external_service",
      "approved_source_service",
      "request_service_type",
    ]).notNull(),
    alias: varchar("alias", { length: 160 }).notNull(),
    categoryId: int("categoryId").notNull(),
    // Zero is the persisted, explicit category-wide sentinel. Positive values
    // reference a real service_subcategories row.
    subcategoryId: int("subcategoryId").default(0).notNull(),
    isActive: int("isActive").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_catalog_aliases_namespace_alias_target_unique").on(
      table.namespace,
      table.alias,
      table.categoryId,
      table.subcategoryId,
    ),
    index("service_catalog_aliases_lookup_idx").on(table.namespace, table.alias, table.isActive),
    index("service_catalog_aliases_target_idx").on(table.categoryId, table.subcategoryId, table.isActive),
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
  verificationStatus: mysqlEnum("verificationStatus", ["unsubmitted", "pending", "approved", "rejected"])
    .default("unsubmitted")
    .notNull(),
  verificationSubmittedAt: timestamp("verificationSubmittedAt"),
  verificationReviewedAt: timestamp("verificationReviewedAt"),
  isPremium: int("isPremium").default(0),
  isAvailable: int("isAvailable").default(1).notNull(),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  serviceRadiusKm: int("serviceRadiusKm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Provider-entered operating context for one exact canonical capability in one
 * jurisdiction. This is intentionally distinct from providerCapabilityStatuses:
 * the latter reflects credential evaluation; this record retains the declared
 * operating model and the independently recorded legal/product approvals that
 * must precede activation.
 */
export const providerCapabilityProfiles = mysqlTable(
  "provider_capability_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    providerId: int("providerId")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    capabilityKey: varchar("capabilityKey", { length: 120 }).notNull(),
    jurisdictionCode: varchar("jurisdictionCode", { length: 2 }).notNull(),
    operatingModel: mysqlEnum("operatingModel", ["individual", "company"]).notNull(),
    // 0084 keeps the 0083 enum for backwards reads while v2 retains the exact
    // declared business relationship required by the capability policy.
    operatingModelVersion: varchar("operatingModelVersion", { length: 32 }).default("v2").notNull(),
    operatingModelCode: varchar("operatingModelCode", { length: 80 }).default("independent_tradesperson").notNull(),
    operatingModelContextJson: json("operatingModelContextJson").$type<Record<string, unknown> | null>(),
    vehicleType: varchar("vehicleType", { length: 120 }),
    profileStatus: mysqlEnum("profileStatus", [
      "draft",
      "pending_legal_review",
      "source_unverified",
      "legal_approved",
      "active",
      "suspended",
    ])
      .default("draft")
      .notNull(),
    // These are deliberately separate; product/operational approval can never
    // substitute for a competent Türkiye legal/compliance approval.
    legalSourceApprovalRef: varchar("legalSourceApprovalRef", { length: 160 }),
    productReleaseApprovalRef: varchar("productReleaseApprovalRef", { length: 160 }),
    declarationState: mysqlEnum("declarationState", ["draft", "submitted", "withdrawn", "locked"]).default("draft").notNull(),
    sourceVerificationState: mysqlEnum("sourceVerificationState", ["unverified", "verified", "blocked"]).default("unverified").notNull(),
    legalApprovalState: mysqlEnum("legalApprovalState", ["pending", "approved", "revoked", "expired"]).default("pending").notNull(),
    releaseApprovalState: mysqlEnum("releaseApprovalState", ["pending", "approved", "revoked", "expired"]).default("pending").notNull(),
    voluntarySuspensionState: mysqlEnum("voluntarySuspensionState", ["active", "suspended"]).default("active").notNull(),
    enforcementState: mysqlEnum("enforcementState", ["clear", "suspended", "blocked"]).default("clear").notNull(),
    enforcementReasonCode: varchar("enforcementReasonCode", { length: 120 }),
    requiredRulePackVersion: varchar("requiredRulePackVersion", { length: 120 }).default("unknown").notNull(),
    requiredRequirementVersion: varchar("requiredRequirementVersion", { length: 120 }).default("unknown").notNull(),
    stateVersion: int("stateVersion").default(1).notNull(),
    enforcementUpdatedAt: timestamp("enforcementUpdatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("provider_capability_profiles_scope_unique").on(
      table.providerId,
      table.capabilityKey,
      table.jurisdictionCode,
    ),
    index("provider_capability_profiles_status_idx").on(table.providerId, table.profileStatus),
    index("provider_capability_profiles_enforcement_idx").on(table.providerId, table.enforcementState),
    index("provider_capability_profiles_capability_idx").on(
      table.jurisdictionCode,
      table.capabilityKey,
      table.profileStatus,
    ),
  ],
);

export const providerCapabilityApprovalLedger = mysqlTable(
  "provider_capability_approval_ledger",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => providerCapabilityProfiles.id, { onDelete: "cascade" }),
    approvalType: mysqlEnum("approvalType", ["legal_source", "product_release"]).notNull(),
    eventType: mysqlEnum("eventType", ["granted", "revoked", "expired", "superseded"]).notNull(),
    rulePackVersion: varchar("rulePackVersion", { length: 120 }).notNull(),
    requirementVersion: varchar("requirementVersion", { length: 120 }).notNull(),
    approverUserId: int("approverUserId").notNull(),
    approverRole: varchar("approverRole", { length: 120 }).notNull(),
    authorityScope: varchar("authorityScope", { length: 240 }).notNull(),
    evidenceHash: varchar("evidenceHash", { length: 128 }).notNull(),
    evidenceStatus: mysqlEnum("evidenceStatus", ["present", "deleted"]).default("present").notNull(),
    validFrom: timestamp("validFrom"),
    validUntil: timestamp("validUntil"),
    reasonCode: varchar("reasonCode", { length: 160 }),
    priorLedgerEventId: int("priorLedgerEventId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("provider_capability_approval_ledger_profile_type_idx").on(table.profileId, table.approvalType, table.createdAt),
    index("provider_capability_approval_ledger_approver_idx").on(table.approverUserId, table.createdAt),
  ],
);

export const providerCapabilityEnforcementEvents = mysqlTable(
  "provider_capability_enforcement_events",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull().references(() => providerCapabilityProfiles.id, { onDelete: "cascade" }),
    action: mysqlEnum("action", ["suspend", "block", "release"]).notNull(),
    reasonCode: varchar("reasonCode", { length: 160 }).notNull(),
    actorUserId: int("actorUserId").notNull(),
    actorRole: varchar("actorRole", { length: 120 }).notNull(),
    evidenceHash: varchar("evidenceHash", { length: 128 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("provider_capability_enforcement_profile_idx").on(table.profileId, table.createdAt)],
);

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

export const userCredentials = mysqlTable(
  "user_credentials",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    emailNormalized: varchar("emailNormalized", { length: 320 }),
    phoneE164: varchar("phoneE164", { length: 32 }),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    failedLoginCount: int("failedLoginCount").default(0).notNull(),
    lockedUntil: timestamp("lockedUntil"),
    passwordUpdatedAt: timestamp("passwordUpdatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_credentials_user_unique").on(table.userId),
    uniqueIndex("user_credentials_email_unique").on(table.emailNormalized),
    uniqueIndex("user_credentials_phone_unique").on(table.phoneE164),
  ],
);

export const authChallenges = mysqlTable(
  "auth_challenges",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    purpose: mysqlEnum("purpose", ["verify_email", "verify_phone", "password_reset", "sensitive_transaction", "admin_mfa"]).notNull(),
    channel: mysqlEnum("channel", ["email", "sms"]).notNull(),
    destination: varchar("destination", { length: 320 }).notNull(),
    codeHash: varchar("codeHash", { length: 128 }).notNull(),
    attempts: int("attempts").default(0).notNull(),
    maxAttempts: int("maxAttempts").default(5).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    consumedAt: timestamp("consumedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("auth_challenges_user_purpose_idx").on(table.userId, table.purpose),
    index("auth_challenges_expiry_idx").on(table.expiresAt),
  ],
);

/** Immutable, privacy-preserving evidence for staged contact-change events. */
export const contactChangeEvents = mysqlTable(
  "contact_change_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    contactType: mysqlEnum("contactType", ["email", "phone"]).notNull(),
    eventType: mysqlEnum("eventType", ["initiated", "confirmed", "expired", "cancelled"]).notNull(),
    // The mutable contact itself is never duplicated in immutable audit evidence.
    contactValueHash: varchar("contactValueHash", { length: 128 }).notNull(),
    challengeId: int("challengeId"),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("contact_change_events_user_created_idx").on(table.userId, table.createdAt),
    index("contact_change_events_challenge_idx").on(table.challengeId),
  ],
);

// Server-side session registry for locally authenticated accounts. OAuth sessions
// remain managed by the identity provider; locally minted sessions are revocable.
export const localAuthSessions = mysqlTable(
  "local_auth_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: int("userId").notNull(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    userAgent: varchar("userAgent", { length: 512 }),
    ipHash: varchar("ipHash", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    revokeReason: varchar("revokeReason", { length: 80 }),
  },
  (table) => [
    uniqueIndex("local_auth_sessions_token_hash_unique").on(table.tokenHash),
    index("local_auth_sessions_user_active_idx").on(table.userId, table.revokedAt, table.expiresAt),
  ],
);

// MFA grants are bound to the exact authenticated session fingerprint. They are
// intentionally short-lived and are invalidated when the underlying session changes.
export const adminMfaGrants = mysqlTable(
  "admin_mfa_grants",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: int("userId").notNull(),
    sessionFingerprint: varchar("sessionFingerprint", { length: 64 }).notNull(),
    challengeId: int("challengeId").notNull(),
    verifiedAt: timestamp("verifiedAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
  },
  (table) => [
    uniqueIndex("admin_mfa_grants_session_unique").on(table.userId, table.sessionFingerprint),
    index("admin_mfa_grants_active_idx").on(table.userId, table.expiresAt, table.revokedAt),
  ],
);

export const providerDocuments = mysqlTable(
  "provider_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    providerId: int("providerId").notNull(),
    ownerUserId: int("ownerUserId").notNull(),
    // Legacy records may remain unbound; new submissions must carry an exact
    // source-derived credential requirement identity.
    requirementId: int("requirementId"),
    // Source-derived credential identifiers are versioned by the approved
    // compliance pack. Router-side allow-listing prevents arbitrary values.
    type: varchar("type", { length: 160 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 96 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
    quarantineStatus: mysqlEnum("quarantineStatus", ["pending_scan", "scanning", "clean", "blocked", "scan_failed", "expired"])
      .default("pending_scan")
      .notNull(),
    quarantineReason: varchar("quarantineReason", { length: 500 }),
    scannedAt: timestamp("scannedAt"),
    releasedAt: timestamp("releasedAt"),
    rejectionReason: varchar("rejectionReason", { length: 500 }),
    reviewedByUserId: int("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    retentionDueAt: timestamp("retentionDueAt"),
    contentPurgedAt: timestamp("contentPurgedAt"),
    purgeStatus: mysqlEnum("purgeStatus", [
      "not_scheduled",
      "scheduled",
      "logical_purge_complete",
      "storage_erase_pending",
      "storage_erase_confirmed",
    ]).default("not_scheduled").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("provider_documents_provider_requirement_unique").on(table.providerId, table.requirementId),
    index("provider_documents_status_idx").on(table.status, table.createdAt),
    index("provider_documents_owner_idx").on(table.ownerUserId),
    index("provider_documents_requirement_idx").on(table.requirementId, table.status),
    index("provider_documents_retention_idx").on(table.retentionDueAt, table.contentPurgedAt, table.purgeStatus),
  ],
);

// A jurisdiction is the smallest geographic unit whose requirements may differ.
// Country-only records use `regionCode = null`; no marketplace is enabled by this
// table alone.
export const jurisdictions = mysqlTable(
  "jurisdictions",
  {
    id: int("id").autoincrement().primaryKey(),
    countryCode: varchar("countryCode", { length: 2 }).notNull(),
    regionCode: varchar("regionCode", { length: 16 }),
    displayName: varchar("displayName", { length: 160 }).notNull(),
    status: mysqlEnum("status", ["draft", "active", "suspended"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("jurisdictions_country_region_unique").on(table.countryCode, table.regionCode),
    index("jurisdictions_status_idx").on(table.status),
  ],
);

/**
 * Global country deployment shells are intentionally independent from the
 * legacy jurisdiction launch gate. A row is never a marketplace enablement:
 * every feature switch begins at false and every policy state begins blocked.
 */
export const countryDeployments = mysqlTable(
  "country_deployments",
  {
    id: int("id").autoincrement().primaryKey(),
    countryCode: varchar("countryCode", { length: 2 }).notNull(),
    displayName: varchar("displayName", { length: 160 }).notNull(),
    state: mysqlEnum("state", [
      "SCAFFOLD_ONLY",
      "RESEARCHING",
      "SOURCE_REVIEW",
      "LEGAL_REVIEW",
      "CONNECTOR_PENDING",
      "STAGING_READY",
      "PILOT_READY",
      "PRODUCTION_PARTIAL",
      "PRODUCTION_ACTIVE",
      "SUSPENDED",
      "INFRA_ONLY_NO_GO",
    ]).default("SCAFFOLD_ONLY").notNull(),
    dataPlaneClass: varchar("dataPlaneClass", { length: 80 }).notNull(),
    defaultLocale: varchar("defaultLocale", { length: 32 }).notNull(),
    defaultCurrency: varchar("defaultCurrency", { length: 3 }).notNull(),
    defaultTimeZone: varchar("defaultTimeZone", { length: 64 }).notNull(),
    rawCredentialGlobalTransferAllowed: int("rawCredentialGlobalTransferAllowed").default(0).notNull(),
    localDataPlaneReady: int("localDataPlaneReady").default(0).notNull(),
    countryShellEnabled: int("countryShellEnabled").default(0).notNull(),
    jurisdictionEnabled: int("jurisdictionEnabled").default(0).notNull(),
    consumerDiscoveryEnabled: int("consumerDiscoveryEnabled").default(0).notNull(),
    providerOnboardingEnabled: int("providerOnboardingEnabled").default(0).notNull(),
    bookingEnabled: int("bookingEnabled").default(0).notNull(),
    paymentsEnabled: int("paymentsEnabled").default(0).notNull(),
    aiAssistantEnabled: int("aiAssistantEnabled").default(0).notNull(),
    supportEnabled: int("supportEnabled").default(0).notNull(),
    productionStateReachable: int("productionStateReachable").default(0).notNull(),
    seedVersion: varchar("seedVersion", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_deployments_country_unique").on(table.countryCode),
    index("country_deployments_state_idx").on(table.state),
  ],
);

/**
 * Owner intent is deliberately separate from the server-derived effective
 * market state. A desired ACTIVE request never enables a market by itself.
 */
export const countryMarketControls = mysqlTable(
  "country_market_controls",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    desiredState: mysqlEnum("desiredState", ["INFRA_ONLY", "ACTIVE", "PAUSED", "EMERGENCY_DISABLED"]).default("INFRA_ONLY").notNull(),
    effectiveState: mysqlEnum("effectiveState", ["INFRA_ONLY", "READINESS_BLOCKED", "READY_PENDING_OWNER_APPROVAL", "ACTIVE", "PAUSED", "EMERGENCY_DISABLED", "INFRA_ONLY_NO_GO"]).default("INFRA_ONLY").notNull(),
    storeDistributionState: mysqlEnum("storeDistributionState", ["TR_ONLY_PLANNED", "NOT_LISTED", "EXTERNAL_STORE_GATE_REQUIRED"]).default("NOT_LISTED").notNull(),
    inAppProductionAllowlisted: int("inAppProductionAllowlisted").default(0).notNull(),
    requiresRevalidation: int("requiresRevalidation").default(1).notNull(),
    lastOwnerReason: text("lastOwnerReason"),
    lastChangedByUserId: int("lastChangedByUserId"),
    lastMfaGrantId: varchar("lastMfaGrantId", { length: 64 }),
    lastGateSnapshotHash: varchar("lastGateSnapshotHash", { length: 128 }),
    stateVersion: int("stateVersion").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_market_controls_deployment_unique").on(table.countryDeploymentId),
    index("country_market_controls_effective_idx").on(table.effectiveState, table.inAppProductionAllowlisted),
    foreignKey({ columns: [table.countryDeploymentId], foreignColumns: [countryDeployments.id], name: "fk_country_market_control_deployment" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

/** Application-layer append-only ledger; TiDB trigger support is not assumed. */
export const countryMarketControlEvents = mysqlTable(
  "country_market_control_events",
  {
    id: int("id").autoincrement().primaryKey(),
    countryMarketControlId: int("countryMarketControlId").notNull(),
    eventType: mysqlEnum("eventType", ["DESIRED_STATE_REQUESTED", "EFFECTIVE_STATE_EVALUATED", "EMERGENCY_DISABLED", "REVALIDATION_REQUIRED", "RELEASE_RUN_BLOCKED", "ROLLBACK_APPLIED"]).notNull(),
    previousDesiredState: varchar("previousDesiredState", { length: 48 }),
    nextDesiredState: varchar("nextDesiredState", { length: 48 }),
    previousEffectiveState: varchar("previousEffectiveState", { length: 48 }),
    nextEffectiveState: varchar("nextEffectiveState", { length: 48 }).notNull(),
    actorUserId: int("actorUserId"),
    mfaGrantId: varchar("mfaGrantId", { length: 64 }),
    reason: text("reason").notNull(),
    gateSnapshotHash: varchar("gateSnapshotHash", { length: 128 }),
    correlationId: varchar("correlationId", { length: 128 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("country_market_control_events_control_created_idx").on(table.countryMarketControlId, table.createdAt),
    uniqueIndex("country_market_control_events_correlation_unique").on(table.correlationId),
    foreignKey({ columns: [table.countryMarketControlId], foreignColumns: [countryMarketControls.id], name: "fk_country_market_event_control" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

/** Deployment/release evidence is distinct from market state and remains blocked until real gates pass. */
export const countryMarketReleaseRuns = mysqlTable(
  "country_market_release_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    countryMarketControlId: int("countryMarketControlId").notNull(),
    requestedDesiredState: varchar("requestedDesiredState", { length: 48 }).notNull(),
    result: mysqlEnum("result", ["BLOCKED", "ABORTED", "ACTIVE"]).default("BLOCKED").notNull(),
    stage: mysqlEnum("stage", ["PRECHECK", "DEPLOYMENT_HEALTH", "LEGACY_GATE", "COVERAGE_GATE", "OTHER_COUNTRY_ASSERTION", "ROLLED_BACK"]).default("PRECHECK").notNull(),
    blockersJson: json("blockersJson").$type<string[]>().notNull(),
    gateSnapshotHash: varchar("gateSnapshotHash", { length: 128 }).notNull(),
    actorUserId: int("actorUserId"),
    mfaGrantId: varchar("mfaGrantId", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("country_market_release_runs_control_created_idx").on(table.countryMarketControlId, table.createdAt),
    foreignKey({ columns: [table.countryMarketControlId], foreignColumns: [countryMarketControls.id], name: "fk_country_market_release_control" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

/** Hierarchical country, regional and municipal deployment boundary. */
export const jurisdictionNodes = mysqlTable(
  "jurisdiction_nodes",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    parentId: int("parentId"),
    nodeCode: varchar("nodeCode", { length: 96 }).notNull(),
    displayName: varchar("displayName", { length: 160 }).notNull(),
    nodeType: mysqlEnum("nodeType", ["country", "state", "province", "region", "city", "district", "municipality"]).notNull(),
    state: mysqlEnum("state", ["SCAFFOLD_ONLY", "SUSPENDED", "ACTIVE"]).default("SCAFFOLD_ONLY").notNull(),
    locale: varchar("locale", { length: 32 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    timeZone: varchar("timeZone", { length: 64 }).notNull(),
    addressProfile: varchar("addressProfile", { length: 80 }).default("UNKNOWN").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("jurisdiction_nodes_node_code_unique").on(table.nodeCode),
    index("jurisdiction_nodes_country_parent_idx").on(table.countryDeploymentId, table.parentId),
    index("jurisdiction_nodes_state_idx").on(table.state),
  ],
);

/**
 * Catalog-facing capability shell. Existing service_capabilities stay
 * authoritative for the legacy product; this table only adds country policy
 * dimensions and starts every service blocked.
 */
export const serviceCapabilityDefinitions = mysqlTable(
  "service_capability_definitions",
  {
    id: int("id").autoincrement().primaryKey(),
    canonicalServiceKey: varchar("canonicalServiceKey", { length: 120 }).notNull(),
    canonicalCategoryId: int("canonicalCategoryId"),
    // The existing service_capabilities table remains catalog-authoritative.
    // This nullable, unique link lets the global policy scaffold cover every
    // live capability without treating a category seed as its task definition.
    canonicalCapabilityId: int("canonicalCapabilityId"),
    displayName: varchar("displayName", { length: 160 }).notNull(),
    serviceLevel: mysqlEnum("serviceLevel", ["category", "subcategory", "task"]).default("category").notNull(),
    requiredDimensionsJson: json("requiredDimensionsJson").$type<string[]>().notNull(),
    blockedByDefault: int("blockedByDefault").default(1).notNull(),
    mappingState: mysqlEnum("mappingState", ["UNMAPPED_SERVICE_BLOCKED", "MAPPED_BLOCKED", "MAPPED_ELIGIBLE"]).default("UNMAPPED_SERVICE_BLOCKED").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_capability_definitions_key_unique").on(table.canonicalServiceKey),
    uniqueIndex("service_capability_definitions_canonical_capability_unique").on(table.canonicalCapabilityId),
    index("service_capability_definitions_category_idx").on(table.canonicalCategoryId, table.mappingState),
  ],
);

export const officialSources = mysqlTable(
  "official_sources",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    jurisdictionNodeId: int("jurisdictionNodeId"),
    sourceKey: varchar("sourceKey", { length: 160 }).notNull(),
    authorityName: varchar("authorityName", { length: 240 }).notNull(),
    sourceUrl: varchar("sourceUrl", { length: 2048 }).notNull(),
    sourceVersion: varchar("sourceVersion", { length: 160 }).notNull(),
    sourceHash: varchar("sourceHash", { length: 128 }),
    sourceStatus: mysqlEnum("sourceStatus", ["SOURCE_UNVERIFIED", "SOURCE_VERIFIED", "SUPERSEDED", "REVOKED"]).default("SOURCE_UNVERIFIED").notNull(),
    retrievalMethod: mysqlEnum("retrievalMethod", ["MANUAL_REFERENCE", "PERMITTED_API", "AUTHORIZED_EXPORT", "UNKNOWN"]).default("UNKNOWN").notNull(),
    verifiedByApprovalLedgerId: int("verifiedByApprovalLedgerId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("official_sources_scope_key_unique").on(table.countryDeploymentId, table.sourceKey, table.sourceVersion),
    index("official_sources_country_status_idx").on(table.countryDeploymentId, table.sourceStatus),
  ],
);

export const legalRequirements = mysqlTable(
  "legal_requirements",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    jurisdictionNodeId: int("jurisdictionNodeId"),
    capabilityDefinitionId: int("capabilityDefinitionId"),
    requirementKey: varchar("requirementKey", { length: 160 }).notNull(),
    requirementVersion: varchar("requirementVersion", { length: 80 }).notNull(),
    requirementState: mysqlEnum("requirementState", ["UNKNOWN", "REQUIRED", "CONDITIONAL", "NOT_REQUIRED", "PROHIBITED"]).default("UNKNOWN").notNull(),
    authoritative: int("authoritative").default(0).notNull(),
    sourceStatus: mysqlEnum("sourceStatus", ["SOURCE_UNVERIFIED", "SOURCE_VERIFIED"]).default("SOURCE_UNVERIFIED").notNull(),
    legalApprovalState: mysqlEnum("legalApprovalState", ["PENDING", "APPROVED", "REVOKED", "EXPIRED"]).default("PENDING").notNull(),
    officialSourceId: int("officialSourceId"),
    sourceReference: varchar("sourceReference", { length: 320 }),
    blockingReasonCode: varchar("blockingReasonCode", { length: 160 }).default("UNKNOWN_LEGAL_REQUIREMENT").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("legal_requirements_scope_key_version_unique").on(table.countryDeploymentId, table.requirementKey, table.requirementVersion),
    index("legal_requirements_capability_state_idx").on(table.capabilityDefinitionId, table.requirementState, table.authoritative),
  ],
);

export const credentialTypes = mysqlTable(
  "credential_types",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    credentialKey: varchar("credentialKey", { length: 160 }).notNull(),
    displayName: varchar("displayName", { length: 200 }).notNull(),
    rawCredentialClassification: varchar("rawCredentialClassification", { length: 80 }).default("UNCLASSIFIED").notNull(),
    extractionAllowed: int("extractionAllowed").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("credential_types_country_key_unique").on(table.countryDeploymentId, table.credentialKey)],
);

export const credentialIssuers = mysqlTable(
  "credential_issuers",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    credentialTypeId: int("credentialTypeId").notNull(),
    issuerKey: varchar("issuerKey", { length: 160 }).notNull(),
    displayName: varchar("displayName", { length: 240 }).notNull(),
    issuerStatus: mysqlEnum("issuerStatus", ["UNVERIFIED", "VERIFIED", "REVOKED"]).default("UNVERIFIED").notNull(),
    officialSourceId: int("officialSourceId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("credential_issuers_country_key_unique").on(table.countryDeploymentId, table.issuerKey)],
);

export const verificationConnectors = mysqlTable(
  "verification_connectors",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    jurisdictionNodeId: int("jurisdictionNodeId"),
    connectorKey: varchar("connectorKey", { length: 160 }).notNull(),
    displayName: varchar("displayName", { length: 240 }).notNull(),
    status: mysqlEnum("status", ["PENDING", "UNVERIFIED", "AUTHORIZED", "OPERATIONAL", "REVOKED", "NOT_CONFIGURED"]).default("PENDING").notNull(),
    assuranceLevel: mysqlEnum("assuranceLevel", ["NONE", "DOCUMENT_ONLY", "ISSUER_SIGNATURE", "REGISTRY_MATCH", "REGISTRY_STATUS"]).default("NONE").notNull(),
    forbiddenScraping: int("forbiddenScraping").default(1).notNull(),
    authorizationEvidenceHash: varchar("authorizationEvidenceHash", { length: 128 }),
    officialSourceId: int("officialSourceId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("verification_connectors_country_key_unique").on(table.countryDeploymentId, table.connectorKey),
    index("verification_connectors_status_idx").on(table.countryDeploymentId, table.status, table.assuranceLevel),
  ],
);

export const credentialEvidence = mysqlTable(
  "credential_evidence",
  {
    id: int("id").autoincrement().primaryKey(),
    providerCredentialId: int("providerCredentialId"),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    credentialTypeId: int("credentialTypeId"),
    evidenceLevel: mysqlEnum("evidenceLevel", ["SELF_ASSERTED", "DOCUMENT_UPLOADED", "DOCUMENT_EXTRACTED", "ISSUER_SIGNATURE_VERIFIED", "REGISTRY_MATCHED", "REGISTRY_STATUS_ACTIVE", "REVOCATION_MONITORED"]).default("SELF_ASSERTED").notNull(),
    evidenceHash: varchar("evidenceHash", { length: 128 }).notNull(),
    evidenceStatus: mysqlEnum("evidenceStatus", ["PENDING", "UNVERIFIED", "VERIFIED", "REVOKED", "EXPIRED"]).default("PENDING").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("credential_evidence_country_status_idx").on(table.countryDeploymentId, table.evidenceStatus, table.evidenceLevel)],
);

export const verificationEvents = mysqlTable(
  "verification_events",
  {
    id: int("id").autoincrement().primaryKey(),
    credentialEvidenceId: int("credentialEvidenceId"),
    verificationConnectorId: int("verificationConnectorId"),
    eventType: mysqlEnum("eventType", ["REQUESTED", "EXTRACTED", "MATCHED", "STATUS_CHECKED", "FAILED", "REVOKED"]).notNull(),
    resultState: mysqlEnum("resultState", ["UNVERIFIED", "MATCHED", "ACTIVE", "FAILED", "REVOKED"]).default("UNVERIFIED").notNull(),
    correlationId: varchar("correlationId", { length: 128 }).notNull(),
    evidenceHash: varchar("evidenceHash", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("verification_events_correlation_unique").on(table.correlationId),
    index("verification_events_connector_created_idx").on(table.verificationConnectorId, table.createdAt),
  ],
);

export const legalDocuments = mysqlTable(
  "legal_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    documentKey: varchar("documentKey", { length: 160 }).notNull(),
    documentVersion: varchar("documentVersion", { length: 80 }).notNull(),
    documentSurface: mysqlEnum("documentSurface", ["consumer_terms", "provider_agreement", "privacy_notice", "cookie_notice", "appeal_notice", "incident_notice"]).notNull(),
    legalApprovalState: mysqlEnum("legalApprovalState", ["PENDING", "APPROVED", "REVOKED", "EXPIRED"]).default("PENDING").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("legal_documents_country_key_version_unique").on(table.countryDeploymentId, table.documentKey, table.documentVersion)],
);

export const localizedLegalVersions = mysqlTable(
  "localized_legal_versions",
  {
    id: int("id").autoincrement().primaryKey(),
    legalDocumentId: int("legalDocumentId").notNull(),
    locale: varchar("locale", { length: 32 }).notNull(),
    localizationState: mysqlEnum("localizationState", ["DRAFT_MACHINE", "HUMAN_TRANSLATED", "LEGAL_REVIEWED", "LINGUIST_REVIEWED", "APPROVED_STAGING", "APPROVED_PRODUCTION", "RETIRED"]).default("DRAFT_MACHINE").notNull(),
    contentHash: varchar("contentHash", { length: 128 }),
    contentStorageKey: varchar("contentStorageKey", { length: 512 }),
    runtimeSelectable: int("runtimeSelectable").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("localized_legal_versions_document_locale_unique").on(table.legalDocumentId, table.locale)],
);

/** Generic country artifact approval ledger. Application policy treats it append-only. */
export const approvalLedger = mysqlTable(
  "approval_ledger",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    jurisdictionNodeId: int("jurisdictionNodeId"),
    subjectType: mysqlEnum("subjectType", ["OFFICIAL_SOURCE", "LEGAL_REQUIREMENT", "CONNECTOR", "LEGAL_DOCUMENT", "CAPABILITY_POLICY", "COUNTRY_ACTIVATION"]).notNull(),
    subjectKey: varchar("subjectKey", { length: 240 }).notNull(),
    approvalType: mysqlEnum("approvalType", ["SOURCE_VERIFICATION", "LOCAL_LEGAL", "LINGUIST", "CONNECTOR_AUTHORIZATION", "DATA_PRIVACY", "PAYMENT_FUNDS_FLOW", "PRODUCT_RELEASE"]).notNull(),
    eventType: mysqlEnum("eventType", ["GRANTED", "REVOKED", "EXPIRED", "SUPERSEDED"]).notNull(),
    approverUserId: int("approverUserId").notNull(),
    approverRole: varchar("approverRole", { length: 120 }).notNull(),
    authorityScope: varchar("authorityScope", { length: 240 }).notNull(),
    evidenceHash: varchar("evidenceHash", { length: 128 }).notNull(),
    validFrom: timestamp("validFrom"),
    validUntil: timestamp("validUntil"),
    priorLedgerEventId: int("priorLedgerEventId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("approval_ledger_subject_idx").on(table.countryDeploymentId, table.subjectType, table.subjectKey, table.createdAt),
    index("approval_ledger_approver_idx").on(table.approverUserId, table.createdAt),
  ],
);

export const capabilityPolicyDecisions = mysqlTable(
  "capability_policy_decisions",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    jurisdictionNodeId: int("jurisdictionNodeId"),
    capabilityDefinitionId: int("capabilityDefinitionId").notNull(),
    scopeKey: varchar("scopeKey", { length: 280 }).notNull(),
    decision: mysqlEnum("decision", ["BLOCKED", "REVIEW_REQUIRED", "POLICY_ELIGIBLE", "ACTIVE", "SUSPENDED"]).default("BLOCKED").notNull(),
    sourceState: mysqlEnum("sourceState", ["UNVERIFIED", "VERIFIED", "BLOCKED"]).default("UNVERIFIED").notNull(),
    legalState: mysqlEnum("legalState", ["PENDING", "APPROVED", "REVOKED", "EXPIRED"]).default("PENDING").notNull(),
    connectorState: mysqlEnum("connectorState", ["PENDING", "UNVERIFIED", "AUTHORIZED", "OPERATIONAL", "BLOCKED"]).default("PENDING").notNull(),
    releaseState: mysqlEnum("releaseState", ["PENDING", "APPROVED", "REVOKED", "EXPIRED"]).default("PENDING").notNull(),
    enforcementState: mysqlEnum("enforcementState", ["CLEAR", "SUSPENDED", "BLOCKED"]).default("CLEAR").notNull(),
    translationState: mysqlEnum("translationState", ["UNREVIEWED", "DRAFT_MACHINE", "APPROVED"]).default("UNREVIEWED").notNull(),
    dataResidencyState: mysqlEnum("dataResidencyState", ["UNKNOWN", "NOT_READY", "READY", "BLOCKED"]).default("UNKNOWN").notNull(),
    sanctionsState: mysqlEnum("sanctionsState", ["UNKNOWN", "CLEAR", "BLOCKED"]).default("UNKNOWN").notNull(),
    stateVersion: int("stateVersion").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("capability_policy_decisions_scope_unique").on(table.scopeKey),
    index("capability_policy_decisions_country_decision_idx").on(table.countryDeploymentId, table.decision, table.enforcementState),
  ],
);

export const countryCapabilityAppeals = mysqlTable(
  "country_capability_appeals",
  {
    id: int("id").autoincrement().primaryKey(),
    capabilityPolicyDecisionId: int("capabilityPolicyDecisionId").notNull(),
    providerId: int("providerId"),
    status: mysqlEnum("status", ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WITHDRAWN"]).default("SUBMITTED").notNull(),
    statement: text("statement").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("country_capability_appeals_decision_status_idx").on(table.capabilityPolicyDecisionId, table.status)],
);

export const incidentJurisdictionMatrix = mysqlTable(
  "incident_jurisdiction_matrix",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    jurisdictionNodeId: int("jurisdictionNodeId"),
    incidentType: varchar("incidentType", { length: 120 }).notNull(),
    notificationState: mysqlEnum("notificationState", ["UNKNOWN", "NOT_CONFIGURED", "CONFIGURED", "BLOCKED"]).default("NOT_CONFIGURED").notNull(),
    legalRequirementId: int("legalRequirementId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("incident_jurisdiction_matrix_scope_unique").on(table.countryDeploymentId, table.incidentType)],
);

export const incidentNotices = mysqlTable(
  "incident_notices",
  {
    id: int("id").autoincrement().primaryKey(),
    incidentJurisdictionMatrixId: int("incidentJurisdictionMatrixId").notNull(),
    locale: varchar("locale", { length: 32 }).notNull(),
    localizationState: mysqlEnum("localizationState", ["DRAFT_MACHINE", "HUMAN_TRANSLATED", "LEGAL_REVIEWED", "APPROVED_PRODUCTION", "RETIRED"]).default("DRAFT_MACHINE").notNull(),
    runtimeSelectable: int("runtimeSelectable").default(0).notNull(),
    contentHash: varchar("contentHash", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("incident_notices_matrix_locale_unique").on(table.incidentJurisdictionMatrixId, table.locale)],
);

export const countryActivationRuns = mysqlTable(
  "country_activation_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    requestedState: varchar("requestedState", { length: 40 }).notNull(),
    result: mysqlEnum("result", ["BLOCKED", "PASSED", "ABORTED"]).default("BLOCKED").notNull(),
    blockersJson: json("blockersJson").$type<string[]>().notNull(),
    actorUserId: int("actorUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("country_activation_runs_country_created_idx").on(table.countryDeploymentId, table.createdAt)],
);

/**
 * One immutable research-row binding per live country/jurisdiction/subservice.
 * A row is never an authorization: its initial state intentionally blocks every
 * provider transition until a separate, scoped evidence decision exists.
 */
export const countryServiceCoverage = mysqlTable(
  "country_service_coverage",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    jurisdictionNodeId: int("jurisdictionNodeId").notNull(),
    canonicalCategoryId: int("canonicalCategoryId").notNull(),
    canonicalSubcategoryId: int("canonicalSubcategoryId").notNull(),
    researchRowId: varchar("researchRowId", { length: 240 }).notNull(),
    researchRulePackVersion: varchar("researchRulePackVersion", { length: 80 }).notNull(),
    researchRowHash: varchar("researchRowHash", { length: 128 }).notNull(),
    mappingState: mysqlEnum("mappingState", ["MAPPED_BLOCKED", "UNMAPPED_SERVICE_BLOCKED"]).default("UNMAPPED_SERVICE_BLOCKED").notNull(),
    sourceState: mysqlEnum("sourceState", ["AI_RESEARCHED_UNVERIFIED", "SOURCE_UNVERIFIED", "SOURCE_VERIFIED"]).default("AI_RESEARCHED_UNVERIFIED").notNull(),
    legalState: mysqlEnum("legalState", ["NOT_REVIEWED", "PENDING", "APPROVED", "REVOKED", "EXPIRED"]).default("NOT_REVIEWED").notNull(),
    connectorState: mysqlEnum("connectorState", ["NOT_IMPLEMENTED_OR_NOT_AUTHORIZED", "PENDING", "AUTHORIZED", "OPERATIONAL", "REVOKED"]).default("NOT_IMPLEMENTED_OR_NOT_AUTHORIZED").notNull(),
    productionState: mysqlEnum("productionState", ["BLOCKED_PENDING_GATES", "NO_GO", "POLICY_ELIGIBLE", "ACTIVE"]).default("BLOCKED_PENDING_GATES").notNull(),
    riskLevel: mysqlEnum("riskLevel", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).notNull(),
    mandatoryEvidenceJson: json("mandatoryEvidenceJson").$type<string[]>().notNull(),
    intakeQuestionsJson: json("intakeQuestionsJson").$type<string[]>().notNull(),
    sourceIdsJson: json("sourceIdsJson").$type<string[]>().notNull(),
    conditionalTriggerSummary: text("conditionalTriggerSummary"),
    missingEvidenceDecision: varchar("missingEvidenceDecision", { length: 120 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_service_coverage_scope_subservice_unique").on(table.countryDeploymentId, table.jurisdictionNodeId, table.canonicalSubcategoryId),
    uniqueIndex("country_service_coverage_research_row_unique").on(table.countryDeploymentId, table.researchRowId, table.researchRulePackVersion),
    index("country_service_coverage_policy_idx").on(table.countryDeploymentId, table.productionState, table.mappingState),
    foreignKey({ columns: [table.countryDeploymentId], foreignColumns: [countryDeployments.id], name: "fk_country_service_coverage_deployment" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.jurisdictionNodeId], foreignColumns: [jurisdictionNodes.id], name: "fk_country_service_coverage_jurisdiction" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.canonicalCategoryId], foreignColumns: [serviceCategories.id], name: "fk_country_service_coverage_category" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.canonicalSubcategoryId], foreignColumns: [serviceSubcategories.id], name: "fk_country_service_coverage_subcategory" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const countryRulePackVersions = mysqlTable(
  "country_rule_pack_versions",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    jurisdictionNodeId: int("jurisdictionNodeId").notNull(),
    version: varchar("version", { length: 80 }).notNull(),
    researchSeedHash: varchar("researchSeedHash", { length: 128 }).notNull(),
    state: mysqlEnum("state", ["AI_RESEARCHED_UNVERIFIED", "SOURCE_REVIEW", "LEGAL_REVIEW", "APPROVED", "REVOKED"]).default("AI_RESEARCHED_UNVERIFIED").notNull(),
    legalApprovalLedgerId: int("legalApprovalLedgerId"),
    activatedAt: timestamp("activatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_rule_pack_versions_scope_unique").on(table.countryDeploymentId, table.jurisdictionNodeId, table.version),
    foreignKey({ columns: [table.countryDeploymentId], foreignColumns: [countryDeployments.id], name: "fk_country_rule_pack_deployment" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.jurisdictionNodeId], foreignColumns: [jurisdictionNodes.id], name: "fk_country_rule_pack_jurisdiction" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.legalApprovalLedgerId], foreignColumns: [approvalLedger.id], name: "fk_country_rule_pack_legal_ledger" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const countryRequirementBundles = mysqlTable(
  "country_requirement_bundles",
  {
    id: int("id").autoincrement().primaryKey(),
    countryDeploymentId: int("countryDeploymentId").notNull(),
    rulePackVersionId: int("rulePackVersionId").notNull(),
    bundleKey: varchar("bundleKey", { length: 160 }).notNull(),
    title: varchar("title", { length: 320 }).notNull(),
    riskLevel: mysqlEnum("riskLevel", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).notNull(),
    sourceState: mysqlEnum("sourceState", ["AI_RESEARCHED_UNVERIFIED", "SOURCE_UNVERIFIED", "SOURCE_VERIFIED"]).default("AI_RESEARCHED_UNVERIFIED").notNull(),
    legalState: mysqlEnum("legalState", ["NOT_REVIEWED", "PENDING", "APPROVED", "REVOKED", "EXPIRED"]).default("NOT_REVIEWED").notNull(),
    decisionIfMissing: varchar("decisionIfMissing", { length: 120 }).notNull(),
    triggerDescription: text("triggerDescription").notNull(),
    verificationDescription: text("verificationDescription").notNull(),
    requiredEvidenceJson: json("requiredEvidenceJson").$type<string[]>().notNull(),
    subjectTypesJson: json("subjectTypesJson").$type<string[]>().notNull(),
    note: text("note"),
    researchHash: varchar("researchHash", { length: 128 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_requirement_bundles_scope_unique").on(table.countryDeploymentId, table.rulePackVersionId, table.bundleKey),
    index("country_requirement_bundles_state_idx").on(table.countryDeploymentId, table.sourceState, table.legalState),
    foreignKey({ columns: [table.countryDeploymentId], foreignColumns: [countryDeployments.id], name: "fk_country_requirement_bundle_deployment" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.rulePackVersionId], foreignColumns: [countryRulePackVersions.id], name: "fk_country_requirement_bundle_rule_pack" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const countryCoverageBundleBindings = mysqlTable(
  "country_coverage_bundle_bindings",
  {
    id: int("id").autoincrement().primaryKey(),
    coverageId: int("coverageId").notNull(),
    bundleId: int("bundleId").notNull(),
    bindingKind: mysqlEnum("bindingKind", ["MANDATORY", "CONDITIONAL"]).notNull(),
    conditionSummary: text("conditionSummary"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_coverage_bundle_binding_unique").on(table.coverageId, table.bundleId, table.bindingKind),
    foreignKey({ columns: [table.coverageId], foreignColumns: [countryServiceCoverage.id], name: "fk_country_coverage_bundle_coverage" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.bundleId], foreignColumns: [countryRequirementBundles.id], name: "fk_country_coverage_bundle_bundle" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const countryRequirementSubjectBindings = mysqlTable(
  "country_requirement_subject_bindings",
  {
    id: int("id").autoincrement().primaryKey(),
    bundleId: int("bundleId").notNull(),
    subjectType: mysqlEnum("subjectType", ["PERSON", "BUSINESS", "QUALIFIED_MANAGER", "DRIVER", "VEHICLE", "SITE", "OPERATOR", "PROJECT", "CUSTOMER_AUTHORITY", "POLICY", "QUALIFIER"]).notNull(),
    required: int("required").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_requirement_subject_binding_unique").on(table.bundleId, table.subjectType),
    foreignKey({ columns: [table.bundleId], foreignColumns: [countryRequirementBundles.id], name: "fk_country_requirement_subject_bundle" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const countrySourceArchives = mysqlTable(
  "country_source_archives",
  {
    id: int("id").autoincrement().primaryKey(),
    officialSourceId: int("officialSourceId").notNull(),
    retrievalHash: varchar("retrievalHash", { length: 128 }).notNull(),
    archiveReference: varchar("archiveReference", { length: 512 }).notNull(),
    sectionReference: varchar("sectionReference", { length: 320 }),
    effectiveDateText: varchar("effectiveDateText", { length: 160 }),
    exceptionText: text("exceptionText"),
    researchState: mysqlEnum("researchState", ["AI_RESEARCHED_UNVERIFIED", "SOURCE_UNVERIFIED", "SOURCE_VERIFIED", "SUPERSEDED"]).default("AI_RESEARCHED_UNVERIFIED").notNull(),
    retrievedAt: timestamp("retrievedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_source_archives_source_hash_unique").on(table.officialSourceId, table.retrievalHash),
    foreignKey({ columns: [table.officialSourceId], foreignColumns: [officialSources.id], name: "fk_country_source_archive_source" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const countryRequirementSourceBindings = mysqlTable(
  "country_requirement_source_bindings",
  {
    id: int("id").autoincrement().primaryKey(),
    bundleId: int("bundleId").notNull(),
    officialSourceId: int("officialSourceId").notNull(),
    sourceArchiveId: int("sourceArchiveId").notNull(),
    requirementReference: varchar("requirementReference", { length: 320 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_requirement_source_binding_unique").on(table.bundleId, table.officialSourceId),
    foreignKey({ columns: [table.bundleId], foreignColumns: [countryRequirementBundles.id], name: "fk_country_requirement_source_bundle" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.officialSourceId], foreignColumns: [officialSources.id], name: "fk_country_requirement_source_source" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.sourceArchiveId], foreignColumns: [countrySourceArchives.id], name: "fk_country_requirement_source_archive" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const countryCoveragePolicyDecisions = mysqlTable(
  "country_coverage_policy_decisions",
  {
    id: int("id").autoincrement().primaryKey(),
    coverageId: int("coverageId").notNull(),
    rulePackVersionId: int("rulePackVersionId").notNull(),
    decision: mysqlEnum("decision", ["BLOCKED", "PROFILE_INCOMPLETE", "LEGAL_REVIEW_REQUIRED", "PENDING_OFFICIAL_VERIFICATION", "AUTHORITY_VERIFIED", "POLICY_ELIGIBLE", "VERIFIED_LIMITED_SCOPE", "REJECTED", "EXPIRED_OR_SUSPENDED", "NO_GO"]).default("BLOCKED").notNull(),
    assuranceLevel: mysqlEnum("assuranceLevel", ["SELF_ASSERTED", "DOCUMENT_UPLOADED", "DOCUMENT_EXTRACTED", "ISSUER_SIGNATURE_VERIFIED", "REGISTRY_MATCHED", "REGISTRY_STATUS_ACTIVE", "REVOCATION_MONITORED"]).default("SELF_ASSERTED").notNull(),
    sourceState: mysqlEnum("sourceState", ["AI_RESEARCHED_UNVERIFIED", "SOURCE_UNVERIFIED", "SOURCE_VERIFIED"]).default("AI_RESEARCHED_UNVERIFIED").notNull(),
    connectorState: mysqlEnum("connectorState", ["NOT_IMPLEMENTED_OR_NOT_AUTHORIZED", "PENDING", "AUTHORIZED", "OPERATIONAL", "REVOKED"]).default("NOT_IMPLEMENTED_OR_NOT_AUTHORIZED").notNull(),
    legalApprovalState: mysqlEnum("legalApprovalState", ["NOT_REVIEWED", "PENDING", "APPROVED", "REVOKED", "EXPIRED"]).default("NOT_REVIEWED").notNull(),
    productReleaseState: mysqlEnum("productReleaseState", ["PENDING", "APPROVED", "REVOKED", "EXPIRED"]).default("PENDING").notNull(),
    stateVersion: int("stateVersion").default(1).notNull(),
    reasonCodesJson: json("reasonCodesJson").$type<string[]>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_coverage_policy_decisions_coverage_unique").on(table.coverageId),
    index("country_coverage_policy_decisions_decision_idx").on(table.decision, table.sourceState, table.connectorState),
    foreignKey({ columns: [table.coverageId], foreignColumns: [countryServiceCoverage.id], name: "fk_country_coverage_policy_coverage" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.rulePackVersionId], foreignColumns: [countryRulePackVersions.id], name: "fk_country_coverage_policy_rule_pack" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const countryCoveragePolicyEvents = mysqlTable(
  "country_coverage_policy_events",
  {
    id: int("id").autoincrement().primaryKey(),
    coveragePolicyDecisionId: int("coveragePolicyDecisionId").notNull(),
    eventType: mysqlEnum("eventType", ["SEEDED", "REVIEW_REQUESTED", "SUSPENDED", "REVOKED", "EVIDENCE_REJECTED"]).notNull(),
    actorUserId: int("actorUserId"),
    reasonCode: varchar("reasonCode", { length: 160 }).notNull(),
    evidenceHash: varchar("evidenceHash", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("country_coverage_policy_events_decision_idx").on(table.coveragePolicyDecisionId, table.createdAt),
    foreignKey({ columns: [table.coveragePolicyDecisionId], foreignColumns: [countryCoveragePolicyDecisions.id], name: "fk_country_coverage_policy_event_decision" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.actorUserId], foreignColumns: [users.id], name: "fk_country_coverage_policy_event_actor" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const countryActiveProviderTransitions = mysqlTable(
  "country_active_provider_transitions",
  {
    id: int("id").autoincrement().primaryKey(),
    coverageId: int("coverageId").notNull(),
    providerId: int("providerId").notNull(),
    state: mysqlEnum("state", ["NOT_APPLICABLE", "PENDING_OWNER_APPROVAL", "WINDOW_APPROVED", "NOTIFIED", "BLOCKED", "EXPIRED_OR_SUSPENDED"]).default("NOT_APPLICABLE").notNull(),
    transitionWindowEndsAt: timestamp("transitionWindowEndsAt"),
    ownerApprovalLedgerId: int("ownerApprovalLedgerId"),
    notificationEvidenceHash: varchar("notificationEvidenceHash", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_active_provider_transition_unique").on(table.coverageId, table.providerId),
    foreignKey({ columns: [table.coverageId], foreignColumns: [countryServiceCoverage.id], name: "fk_country_active_provider_transition_coverage" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.providerId], foreignColumns: [providers.id], name: "fk_country_active_provider_transition_provider" }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ columns: [table.ownerApprovalLedgerId], foreignColumns: [approvalLedger.id], name: "fk_country_active_provider_transition_ledger" }).onDelete("restrict").onUpdate("cascade"),
  ],
);

// Capability is intentionally separate from a profile verification. For example,
// a single provider may be eligible for courier work but blocked for towing.
export const serviceCapabilities = mysqlTable(
  "service_capabilities",
  {
    id: int("id").autoincrement().primaryKey(),
    key: varchar("key", { length: 120 }).notNull(),
    displayName: varchar("displayName", { length: 160 }).notNull(),
    categoryId: int("categoryId"),
    subcategoryId: int("subcategoryId"),
    status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_capabilities_key_unique").on(table.key),
    index("service_capabilities_catalog_idx").on(table.categoryId, table.subcategoryId, table.status),
  ],
);

export const officialComplianceSources = mysqlTable(
  "official_compliance_sources",
  {
    id: int("id").autoincrement().primaryKey(),
    jurisdictionId: int("jurisdictionId").notNull(),
    authorityName: varchar("authorityName", { length: 200 }).notNull(),
    sourceUrl: varchar("sourceUrl", { length: 2048 }).notNull(),
    sourceVersion: varchar("sourceVersion", { length: 120 }).notNull(),
    sourcePublishedAt: timestamp("sourcePublishedAt"),
    retrievedAt: timestamp("retrievedAt").defaultNow().notNull(),
    checksum: varchar("checksum", { length: 128 }),
    status: mysqlEnum("status", ["draft", "verified", "superseded", "revoked"]).default("draft").notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("official_compliance_sources_jurisdiction_idx").on(table.jurisdictionId, table.status),
    index("official_compliance_sources_reviewer_idx").on(table.reviewedByUserId),
  ],
);

// A compliance package cannot be enabled until an administrator records a legal
// approval. It groups versioned capability rules for one jurisdiction.
export const jurisdictionCompliancePackages = mysqlTable(
  "jurisdiction_compliance_packages",
  {
    id: int("id").autoincrement().primaryKey(),
    jurisdictionId: int("jurisdictionId").notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["draft", "legal_review", "approved", "enabled", "blocked", "retired"])
      .default("draft")
      .notNull(),
    summary: text("summary"),
    legalApprovedByUserId: int("legalApprovedByUserId"),
    legalApprovedAt: timestamp("legalApprovedAt"),
    effectiveFrom: timestamp("effectiveFrom"),
    effectiveTo: timestamp("effectiveTo"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("jurisdiction_compliance_packages_version_unique").on(table.jurisdictionId, table.version),
    index("jurisdiction_compliance_packages_status_idx").on(table.jurisdictionId, table.status),
  ],
);

export const capabilityJurisdictionRules = mysqlTable(
  "capability_jurisdiction_rules",
  {
    id: int("id").autoincrement().primaryKey(),
    packageId: int("packageId").notNull(),
    capabilityId: int("capabilityId").notNull(),
    sourceId: int("sourceId"),
    requiredCredentialType: varchar("requiredCredentialType", { length: 120 }),
    minimumAssurance: mysqlEnum("minimumAssurance", ["A", "B", "C", "D", "E", "F"]).default("F").notNull(),
    requiresHumanReview: int("requiresHumanReview").default(1).notNull(),
    ruleStatus: mysqlEnum("ruleStatus", ["unknown", "required", "not_required", "prohibited", "conditional"])
      .default("unknown")
      .notNull(),
    scopeConstraintsJson: json("scopeConstraintsJson"),
    conditionalStatus: mysqlEnum("conditionalStatus", ["not_applicable", "conditional", "satisfied", "blocked"])
      .default("not_applicable")
      .notNull(),
    rationale: text("rationale"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("capability_jurisdiction_rules_package_capability_unique").on(table.packageId, table.capabilityId),
    index("capability_jurisdiction_rules_capability_idx").on(table.capabilityId, table.ruleStatus),
  ],
);

// A source-provenanced dynamic credential definition is separate from the
// capability rule because one capability may need multiple credentials and
// eligibility depends on the reviewed provider operating type.
export const credentialRequirementCatalog = mysqlTable(
  "credential_requirement_catalog",
  {
    id: int("id").autoincrement().primaryKey(),
    jurisdictionId: int("jurisdictionId").notNull(),
    categoryId: int("categoryId").notNull(),
    subcategoryId: int("subcategoryId").notNull(),
    capabilityId: int("capabilityId").notNull(),
    providerType: mysqlEnum("providerType", ["employee", "self_employed", "sole_trader", "company_owner", "company_worker"]).notNull(),
    credentialType: varchar("credentialType", { length: 160 }).notNull(),
    requirementState: mysqlEnum("requirementState", ["required", "conditional", "not_required", "prohibited", "unknown"]).default("unknown").notNull(),
    minimumAssurance: mysqlEnum("minimumAssurance", ["A", "B", "C", "D", "E", "F"]).default("F").notNull(),
    requiresHumanReview: int("requiresHumanReview").default(1).notNull(),
    officialSourceId: int("officialSourceId"),
    sourceReferenceIdsJson: json("sourceReferenceIdsJson").$type<string[]>().notNull(),
    sourceVersion: varchar("sourceVersion", { length: 160 }).notNull(),
    ruleVersion: varchar("ruleVersion", { length: 64 }).notNull(),
    provenanceJson: json("provenanceJson").$type<Record<string, unknown>>().notNull(),
    isActive: int("isActive").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("credential_requirement_catalog_key_unique").on(table.jurisdictionId, table.categoryId, table.subcategoryId, table.capabilityId, table.providerType, table.credentialType, table.ruleVersion),
    index("credential_requirement_catalog_lookup_idx").on(table.jurisdictionId, table.categoryId, table.subcategoryId, table.capabilityId, table.providerType, table.isActive),
    index("credential_requirement_catalog_source_idx").on(table.officialSourceId, table.ruleVersion),
  ],
);

// Immutable credential identity is minimised to hashes/metadata wherever possible.
// The file remains in the existing owner-scoped provider_documents store.
export const providerCredentials = mysqlTable(
  "provider_credentials",
  {
    id: int("id").autoincrement().primaryKey(),
    providerId: int("providerId").notNull(),
    jurisdictionId: int("jurisdictionId").notNull(),
    documentId: int("documentId"),
    credentialType: varchar("credentialType", { length: 120 }).notNull(),
    credentialReferenceHash: varchar("credentialReferenceHash", { length: 128 }),
    assuranceLevel: mysqlEnum("assuranceLevel", ["A", "B", "C", "D", "E", "F"]).default("F").notNull(),
    status: mysqlEnum("status", ["submitted", "verified", "rejected", "expired", "suspended", "revoked"])
      .default("submitted")
      .notNull(),
    issuingAuthority: varchar("issuingAuthority", { length: 200 }),
    issuedAt: timestamp("issuedAt"),
    validFrom: timestamp("validFrom"),
    expiresAt: timestamp("expiresAt"),
    verifiedAt: timestamp("verifiedAt"),
    nextCheckAt: timestamp("nextCheckAt"),
    lastRegistryCheckAt: timestamp("lastRegistryCheckAt"),
    revocationStatus: mysqlEnum("revocationStatus", ["unknown", "clear", "revoked", "check_failed"])
      .default("unknown")
      .notNull(),
    verificationSourceId: int("verificationSourceId"),
    sourceVersion: varchar("sourceVersion", { length: 120 }),
    ruleVersion: varchar("ruleVersion", { length: 64 }),
    retentionDueAt: timestamp("retentionDueAt"),
    evidencePurgedAt: timestamp("evidencePurgedAt"),
    reviewedByUserId: int("reviewedByUserId"),
    reviewNote: varchar("reviewNote", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("provider_credentials_provider_status_idx").on(table.providerId, table.status),
    index("provider_credentials_recheck_idx").on(table.status, table.nextCheckAt),
    index("provider_credentials_jurisdiction_type_idx").on(table.jurisdictionId, table.credentialType),
  ],
);

export const providerCapabilityStatuses = mysqlTable(
  "provider_capability_statuses",
  {
    id: int("id").autoincrement().primaryKey(),
    providerId: int("providerId").notNull(),
    capabilityId: int("capabilityId").notNull(),
    jurisdictionId: int("jurisdictionId").notNull(),
    status: mysqlEnum("status", [
      "VERIFIED",
      "VERIFIED_LIMITED_SCOPE",
      "MANUAL_REVIEW",
      "REJECTED",
      "EXPIRED_OR_SUSPENDED",
      "LEGAL_REVIEW_REQUIRED",
    ])
      .default("LEGAL_REVIEW_REQUIRED")
      .notNull(),
    assuranceLevel: mysqlEnum("assuranceLevel", ["A", "B", "C", "D", "E", "F"]).default("F").notNull(),
    ruleVersion: varchar("ruleVersion", { length: 64 }),
    scopeNote: varchar("scopeNote", { length: 500 }),
    scopeConstraintsJson: json("scopeConstraintsJson"),
    evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt"),
    nextCheckAt: timestamp("nextCheckAt"),
    lastCredentialId: int("lastCredentialId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("provider_capability_statuses_scope_unique").on(table.providerId, table.capabilityId, table.jurisdictionId),
    index("provider_capability_statuses_matching_idx").on(table.capabilityId, table.jurisdictionId, table.status),
    index("provider_capability_statuses_recheck_idx").on(table.nextCheckAt),
  ],
);

export const providerCapabilityReviews = mysqlTable(
  "provider_capability_reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    providerCapabilityStatusId: int("providerCapabilityStatusId").notNull(),
    credentialId: int("credentialId"),
    decision: mysqlEnum("decision", ["verified", "limited_scope", "manual_review", "rejected", "suspended"])
      .notNull(),
    reviewerUserId: int("reviewerUserId").notNull(),
    rationale: text("rationale").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("provider_capability_reviews_status_idx").on(table.providerCapabilityStatusId, table.createdAt),
    index("provider_capability_reviews_reviewer_idx").on(table.reviewerUserId),
  ],
);

export const providerCapabilityAppeals = mysqlTable(
  "provider_capability_appeals",
  {
    id: int("id").autoincrement().primaryKey(),
    providerCapabilityStatusId: int("providerCapabilityStatusId").notNull(),
    providerId: int("providerId").notNull(),
    type: mysqlEnum("type", ["appeal", "resubmission"]).notNull(),
    statement: text("statement").notNull(),
    status: mysqlEnum("status", ["submitted", "under_review", "accepted", "rejected", "withdrawn"])
      .default("submitted")
      .notNull(),
    resolvedByUserId: int("resolvedByUserId"),
    resolutionNote: text("resolutionNote"),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("provider_capability_appeals_provider_idx").on(table.providerId, table.status),
    index("provider_capability_appeals_status_idx").on(table.providerCapabilityStatusId, table.status),
  ],
);

export const jurisdictionLaunchGates = mysqlTable(
  "jurisdiction_launch_gates",
  {
    id: int("id").autoincrement().primaryKey(),
    jurisdictionId: int("jurisdictionId").notNull(),
    packageId: int("packageId"),
    status: mysqlEnum("status", ["blocked", "review", "ready", "enabled", "suspended"]).default("blocked").notNull(),
    checklistJson: text("checklistJson").notNull(),
    blockingReason: text("blockingReason"),
    evaluatedByUserId: int("evaluatedByUserId"),
    evaluatedAt: timestamp("evaluatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("jurisdiction_launch_gates_jurisdiction_unique").on(table.jurisdictionId),
    index("jurisdiction_launch_gates_status_idx").on(table.status),
  ],
);

// Service requests (jobs)
export const serviceRequests = mysqlTable("service_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId"),
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
  // Server-derived compliance context. Once a requirement is present, offer,
  // acceptance and job-start decisions use this immutable request context.
  jurisdictionId: int("jurisdictionId"),
  serviceCountryCode: varchar("serviceCountryCode", { length: 2 }),
  requiredCapabilityId: int("requiredCapabilityId"),
  complianceRequirementState: mysqlEnum("complianceRequirementState", [
    "not_required",
    "required",
    "blocked",
    "legal_review_required",
  ]).default("blocked").notNull(),
  requirementState: mysqlEnum("requirementState", [
    "REQUIRED",
    "NOT_REQUIRED",
    "CONDITIONAL",
    "PROHIBITED",
    "UNKNOWN",
    "LEGAL_REVIEW_REQUIRED",
    "JURISDICTION_UNRESOLVED",
    "CAPABILITY_UNMAPPED",
  ]).default("UNKNOWN").notNull(),
  compliancePackageId: int("compliancePackageId"),
  complianceRuleId: int("complianceRuleId"),
  officialSourceId: int("officialSourceId"),
  sourceStatus: mysqlEnum("sourceStatus", ["verified", "draft", "superseded", "revoked", "missing"]).default("missing").notNull(),
  currencyContext: varchar("currencyContext", { length: 3 }),
  requiredCredentialType: varchar("requiredCredentialType", { length: 120 }),
  requiredCredentialAssurance: mysqlEnum("requiredCredentialAssurance", ["A", "B", "C", "D", "E", "F"]),
  requiresCredentialHumanReview: int("requiresCredentialHumanReview"),
  credentialRequirementsJson: json("credentialRequirementsJson").$type<Record<string, unknown>[] | null>(),
  compliancePackageVersion: varchar("compliancePackageVersion", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("service_requests_organization_status_idx").on(table.organizationId, table.status),
  index("service_requests_capability_context_idx").on(table.jurisdictionId, table.requiredCapabilityId),
  index("service_requests_requirement_state_idx").on(table.jurisdictionId, table.complianceRequirementState),
  index("service_requests_jurisdiction_snapshot_idx").on(table.serviceCountryCode, table.jurisdictionId, table.requirementState),
  index("service_requests_credential_context_idx").on(table.jurisdictionId, table.requiredCredentialType),
]);

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
    publicId: varchar("publicId", { length: 64 }).notNull(),
    requestId: int("requestId").notNull(),
    ownerUserId: int("ownerUserId").notNull(),
    purpose: mysqlEnum("purpose", ["request", "before", "after", "completion", "expense", "dispute", "claim"])
      .default("request")
      .notNull(),
    kind: mysqlEnum("kind", ["image", "video", "audio", "document"]).notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    // Server-extracted duration for MP4/QuickTime expense evidence; null otherwise.
    durationMs: int("durationMs"),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    quarantineStatus: mysqlEnum("quarantineStatus", ["pending_scan", "scanning", "clean", "blocked", "scan_failed", "expired"])
      .default("pending_scan")
      .notNull(),
    quarantineReason: varchar("quarantineReason", { length: 500 }),
    scannedAt: timestamp("scannedAt"),
    releasedAt: timestamp("releasedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_request_media_storage_key_unique").on(table.storageKey),
    uniqueIndex("service_request_media_public_id_unique").on(table.publicId),
    index("service_request_media_request_purpose_idx").on(table.requestId, table.purpose),
    index("service_request_media_owner_idx").on(table.ownerUserId),
  ],
);

// Durable scanner outbox. Every quarantined media record has exactly one
// mutable delivery job keyed by its class-scoped media reference. The job
// contains no end-user PII and remains available for retry/reconciliation when
// an external malware scanner is not configured or cannot be reached.
export const mediaScannerJobs = mysqlTable(
  "media_scanner_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    mediaClass: mysqlEnum("mediaClass", [
      "provider_document",
      "service_request_media",
      "voice_message",
      "move_ai_draft_media",
    ]).notNull(),
    mediaId: varchar("mediaId", { length: 64 }).notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    status: mysqlEnum("status", ["queued", "dispatched", "retry_scheduled", "completed", "blocked", "scan_failed"])
      .default("queued")
      .notNull(),
    deliveryAttempts: int("deliveryAttempts").default(0).notNull(),
    lastDispatchAt: timestamp("lastDispatchAt"),
    nextAttemptAt: timestamp("nextAttemptAt").defaultNow().notNull(),
    scannerReference: varchar("scannerReference", { length: 191 }),
    // Regenerated for every dispatch. A callback is authoritative only for this exact attempt.
    dispatchAttemptToken: varchar("dispatchAttemptToken", { length: 64 }),
    outcome: mysqlEnum("outcome", ["clean", "blocked", "scan_failed"]),
    outcomeReason: varchar("outcomeReason", { length: 500 }),
    completedAt: timestamp("completedAt"),
    scanStartedAt: timestamp("scanStartedAt"),
    scanCompletedAt: timestamp("scanCompletedAt"),
    retryCount: int("retryCount").default(0).notNull(),
    scanFailureReason: varchar("scanFailureReason", { length: 512 }),
    maxRetries: int("maxRetries").default(3).notNull(),
    operationalReviewRequired: int("operationalReviewRequired").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("media_scanner_jobs_media_unique").on(table.mediaClass, table.mediaId),
    index("media_scanner_jobs_claim_idx").on(table.status, table.nextAttemptAt, table.id),
  ],
);

// A failed malware scan may never be manually released by a single person.
// Two distinct MFA-reauthenticated reviewers leave immutable reasoned approvals;
// only then may server-side remediation transition the exact media object clean.
export const mediaScannerManualReviews = mysqlTable(
  "media_scanner_manual_reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    mediaClass: mysqlEnum("mediaClass", [
      "provider_document",
      "service_request_media",
      "voice_message",
      "move_ai_draft_media",
    ]).notNull(),
    mediaId: varchar("mediaId", { length: 64 }).notNull(),
    reviewerUserId: int("reviewerUserId").notNull(),
    decision: mysqlEnum("decision", ["approve_clean"]).notNull(),
    rationale: varchar("rationale", { length: 1000 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("media_scanner_manual_reviews_unique").on(table.mediaClass, table.mediaId, table.reviewerUserId),
    index("media_scanner_manual_reviews_target_idx").on(table.mediaClass, table.mediaId, table.createdAt),
  ],
);

// A successful callback nonce may be acknowledged again but never processed
// twice. The unique nonce also turns concurrent replay races into a no-op.
export const mediaScannerCallbackReceipts = mysqlTable(
  "media_scanner_callback_receipts",
  {
    id: int("id").autoincrement().primaryKey(),
    nonce: varchar("nonce", { length: 128 }).notNull(),
    mediaClass: mysqlEnum("mediaClass", [
      "provider_document",
      "service_request_media",
      "voice_message",
      "move_ai_draft_media",
    ]).notNull(),
    mediaId: varchar("mediaId", { length: 64 }).notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    dispatchAttemptToken: varchar("dispatchAttemptToken", { length: 64 }).notNull(),
    outcome: mysqlEnum("outcome", ["clean", "blocked", "scan_failed"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("media_scanner_callback_receipts_nonce_unique").on(table.nonce),
    index("media_scanner_callback_receipts_target_idx").on(table.mediaClass, table.mediaId, table.createdAt),
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
    // Foreground location is opt-in per active job. Exact device coordinates are
    // never accepted unless this server-side, provider-owned consent state is enabled.
    locationSharingStatus: mysqlEnum("locationSharingStatus", ["disabled", "enabled", "stopped"])
      .default("disabled")
      .notNull(),
    locationConsentAt: timestamp("locationConsentAt"),
    locationSharingStoppedAt: timestamp("locationSharingStoppedAt"),
    updatedByUserId: int("updatedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("job_tracking_status_idx").on(table.lifecycleStatus),
    index("job_tracking_updated_at_idx").on(table.updatedAt),
    index("job_tracking_location_share_idx").on(table.locationSharingStatus, table.lastLocationAt),
  ],
);

// Provider-submitted completion proof. Customer approval or the 48-hour
// deadline is required before any associated escrow can be released.
export const jobCompletionProofs = mysqlTable(
  "job_completion_proofs",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    providerId: int("providerId").notNull(),
    submittedByUserId: int("submittedByUserId").notNull(),
    summary: text("summary").notNull(),
    status: mysqlEnum("status", ["submitted", "approved", "auto_approved", "disputed", "resolved"])
      .default("submitted")
      .notNull(),
    responseDueAt: timestamp("responseDueAt").notNull(),
    customerApprovedAt: timestamp("customerApprovedAt"),
    releasedAt: timestamp("releasedAt"),
    releaseReason: mysqlEnum("releaseReason", ["customer_approval", "auto_release", "admin_resolution"]),
    aiAnalysisStatus: mysqlEnum("aiAnalysisStatus", ["pending", "completed", "unavailable", "failed"])
      .default("pending")
      .notNull(),
    aiAnalysisSummary: text("aiAnalysisSummary"),
    aiAnalysisConfidence: int("aiAnalysisConfidence"),
    aiAnalysisFlags: text("aiAnalysisFlags"),
    aiAnalyzedAt: timestamp("aiAnalyzedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("job_completion_proofs_request_unique").on(table.requestId),
    index("job_completion_proofs_due_status_idx").on(table.status, table.responseDueAt),
    index("job_completion_proofs_provider_idx").on(table.providerId, table.createdAt),
  ],
);

// Explicit proof-to-media linkage prevents a completion from being approved
// without provider-owned evidence and keeps later dispute review traceable.
export const jobCompletionProofMedia = mysqlTable(
  "job_completion_proof_media",
  {
    id: int("id").autoincrement().primaryKey(),
    completionProofId: int("completionProofId").notNull(),
    mediaId: int("mediaId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("job_completion_proof_media_media_unique").on(table.mediaId),
    uniqueIndex("job_completion_proof_media_proof_media_unique").on(
      table.completionProofId,
      table.mediaId,
    ),
    index("job_completion_proof_media_proof_idx").on(table.completionProofId),
  ],
);

// A request can have one active dispute for its single completion proof.
// Evidence files remain in service_request_media with purpose="dispute".
export const completionDisputes = mysqlTable(
  "completion_disputes",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    completionProofId: int("completionProofId").notNull(),
    openedByUserId: int("openedByUserId").notNull(),
    reasonCode: mysqlEnum("reasonCode", ["incomplete_work", "quality_issue", "damage", "wrong_service", "other"])
      .notNull(),
    description: text("description").notNull(),
    status: mysqlEnum("status", ["open", "under_review", "resolved_customer", "resolved_provider", "resolved_partial"])
      .default("open")
      .notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    resolutionNote: text("resolutionNote"),
    // Customer-favoring decisions remain under review until a verified payment
    // gateway callback confirms that held escrow was actually refunded.
    refundGatewayReference: varchar("refundGatewayReference", { length: 191 }),
    refundVerifiedAt: timestamp("refundVerifiedAt"),
    // A reviewer creates this immutable split plan while escrow is held. A
    // verified gateway callback must match it exactly before settlement writes.
    partialCustomerRefundAmount: int("partialCustomerRefundAmount"),
    partialProviderGrossAmount: int("partialProviderGrossAmount"),
    partialCommissionAmount: int("partialCommissionAmount"),
    partialProviderPayoutAmount: int("partialProviderPayoutAmount"),
    partialGatewayReference: varchar("partialGatewayReference", { length: 191 }),
    partialSettledAt: timestamp("partialSettledAt"),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("completion_disputes_request_unique").on(table.requestId),
    index("completion_disputes_status_created_idx").on(table.status, table.createdAt),
    index("completion_disputes_proof_idx").on(table.completionProofId),
  ],
);

// Immutable payment-side idempotency record. The unique payment key prevents
// duplicate customer/system release calls from double-crediting a provider.
export const escrowReleaseEvents = mysqlTable(
  "escrow_release_events",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    paymentId: int("paymentId").notNull(),
    completionProofId: int("completionProofId").notNull(),
    reason: mysqlEnum("reason", ["customer_approval", "auto_release", "admin_resolution"]).notNull(),
    actorUserId: int("actorUserId"),
    idempotencyKey: varchar("idempotencyKey", { length: 160 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("escrow_release_events_payment_unique").on(table.paymentId),
    uniqueIndex("escrow_release_events_idempotency_unique").on(table.idempotencyKey),
    index("escrow_release_events_request_idx").on(table.requestId),
  ],
);

// Operational controls are evaluated server-side. They are deliberately
// append-only by version so that a rollback/kill-switch decision is auditable.
export const operationalFeatureFlags = mysqlTable(
  "operational_feature_flags",
  {
    id: int("id").autoincrement().primaryKey(),
    flagKey: varchar("flagKey", { length: 96 }).notNull(),
    version: int("version").notNull(),
    enabled: int("enabled").default(0).notNull(),
    rolloutPercent: int("rolloutPercent").default(0).notNull(),
    killSwitch: int("killSwitch").default(0).notNull(),
    audienceSeed: varchar("audienceSeed", { length: 96 }).notNull(),
    startsAt: timestamp("startsAt").defaultNow().notNull(),
    endsAt: timestamp("endsAt"),
    createdByUserId: int("createdByUserId").notNull(),
    reason: varchar("reason", { length: 280 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("operational_flags_version_unique").on(table.flagKey, table.version),
    index("operational_flags_lookup_idx").on(table.flagKey, table.startsAt),
  ],
);

export const operationalEvents = mysqlTable(
  "operational_events",
  {
    id: int("id").autoincrement().primaryKey(),
    eventType: varchar("eventType", { length: 96 }).notNull(),
    severity: mysqlEnum("severity", ["info", "warning", "error"]).default("info").notNull(),
    requestId: varchar("requestId", { length: 96 }),
    actorUserId: int("actorUserId"),
    metadataJson: json("metadataJson").notNull(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  (table) => [index("operational_events_type_time_idx").on(table.eventType, table.occurredAt)],
);

// Messages
export const messages = mysqlTable(
  "messages",
  {
    id: int("id").autoincrement().primaryKey(),
    senderId: int("senderId").notNull(),
    receiverId: int("receiverId").notNull(),
    requestId: int("requestId"),
    content: text("content").notNull(),
    kind: mysqlEnum("kind", ["text", "audio"]).default("text").notNull(),
    mediaStorageKey: varchar("mediaStorageKey", { length: 512 }),
    mediaUrl: text("mediaUrl"),
    mediaMimeType: varchar("mediaMimeType", { length: 96 }),
    mediaSizeBytes: int("mediaSizeBytes"),
    mediaDurationMs: int("mediaDurationMs"),
    mediaSha256: varchar("mediaSha256", { length: 64 }),
    // Voice payloads are not playable until an external scanner records an
    // explicit clean result. Text messages remain unaffected.
    quarantineStatus: mysqlEnum("quarantineStatus", ["pending_scan", "scanning", "clean", "blocked", "scan_failed", "expired"])
      .default("pending_scan")
      .notNull(),
    quarantineReason: varchar("quarantineReason", { length: 500 }),
    scannedAt: timestamp("scannedAt"),
    releasedAt: timestamp("releasedAt"),
    isRead: int("isRead").default(0),
    deletedAt: timestamp("deletedAt"),
    deletedByUserId: int("deletedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("messages_quarantine_audio_idx").on(table.kind, table.quarantineStatus, table.createdAt)],
);

// Cached translations preserve the original message as source of truth. The
// source hash avoids stale translation reuse without storing participant PII.
export const messageTranslationCache = mysqlTable(
  "message_translation_cache",
  {
    id: int("id").autoincrement().primaryKey(),
    messageId: int("messageId").notNull(),
    sourceLanguage: varchar("sourceLanguage", { length: 16 }).notNull(),
    targetLanguage: varchar("targetLanguage", { length: 16 }).notNull(),
    translatedText: text("translatedText").notNull(),
    sourceContentHash: varchar("sourceContentHash", { length: 64 }).notNull(),
    translationProvider: varchar("provider", { length: 96 }).default("unknown").notNull(),
    model: varchar("model", { length: 191 }).default("unknown").notNull(),
    modelVersion: varchar("modelVersion", { length: 191 }).default("unknown").notNull(),
    translationVersion: varchar("translationVersion", { length: 64 }).default("v1").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("message_translation_cache_message_language_unique").on(table.messageId, table.targetLanguage),
    index("message_translation_cache_source_idx").on(table.sourceLanguage, table.targetLanguage),
  ],
);

// Per-user, explicit opt-in only. Translation is never automatically enabled
// by locale selection or by a cached translated rendering.
export const userTranslationPreferences = mysqlTable(
  "user_translation_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    autoTranslateMessages: int("autoTranslateMessages").default(0).notNull(),
    preferredTranslationLanguage: varchar("preferredTranslationLanguage", { length: 8 }).default("tr").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("user_translation_preferences_user_unique").on(table.userId)],
);

// Per-viewer hiding never deletes the original message or affects another
// participant's conversation/dispute view.
export const messageVisibilityOverrides = mysqlTable(
  "message_visibility_overrides",
  {
    id: int("id").autoincrement().primaryKey(),
    messageId: int("messageId").notNull(),
    viewerUserId: int("viewerUserId").notNull(),
    hiddenAt: timestamp("hiddenAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("message_visibility_overrides_message_viewer_unique").on(table.messageId, table.viewerUserId),
    index("message_visibility_overrides_viewer_idx").on(table.viewerUserId, table.hiddenAt),
  ],
);

// Payments (escrow) — amounts are whole TRY major units. Gateway adapters convert at their boundary.
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

// Country and currency scoped readiness is separate from credential presence.
// Missing, stale, or suspended records must block new checkout initialization.
export const paymentProviderWatch = mysqlTable(
  "payment_provider_watch",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: mysqlEnum("provider", ["iyzico", "stripe"]).notNull(),
    countryCode: varchar("countryCode", { length: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: mysqlEnum("status", ["not_configured", "regulatory_review", "operational", "suspended"])
      .default("not_configured")
      .notNull(),
    configVersion: varchar("configVersion", { length: 64 }).notNull(),
    healthCheckedAt: timestamp("healthCheckedAt"),
    regulatoryReviewedAt: timestamp("regulatoryReviewedAt"),
    nextReviewAt: timestamp("nextReviewAt"),
    blockingReason: text("blockingReason"),
    reviewedByUserId: int("reviewedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("payment_provider_watch_scope_unique").on(table.provider, table.countryCode, table.currency),
    index("payment_provider_watch_status_idx").on(table.status, table.nextReviewAt),
  ],
);

// Immutable commercial snapshot captured when an offer is accepted. Financial
// policy changes apply prospectively; historical agreements keep their terms.
export const serviceAgreements = mysqlTable(
  "service_agreements",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    offerId: int("offerId").notNull(),
    customerUserId: int("customerUserId").notNull(),
    providerId: int("providerId").notNull(),
    paymentId: int("paymentId"),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    agreedAmount: int("agreedAmount").notNull(),
    commissionRateBps: int("commissionRateBps").notNull(),
    commissionAmount: int("commissionAmount").notNull(),
    providerPayout: int("providerPayout").notNull(),
    completionReviewHours: int("completionReviewHours").notNull(),
    snapshotJson: text("snapshotJson").notNull(),
    acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_agreements_request_unique").on(table.requestId),
    uniqueIndex("service_agreements_offer_unique").on(table.offerId),
    index("service_agreements_provider_idx").on(table.providerId, table.createdAt),
  ],
);

// A customer-visible, immutable price ceiling created alongside the accepted
// agreement. Any scope or amount change must remain separately auditable via a
// change order; no service flow may silently increase this amount.
export const priceGuarantees = mysqlTable(
  "price_guarantees",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    agreementId: int("agreementId").notNull(),
    customerUserId: int("customerUserId").notNull(),
    providerId: int("providerId").notNull(),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    guaranteedAmount: int("guaranteedAmount").notNull(),
    maximumAmount: int("maximumAmount").notNull(),
    status: mysqlEnum("status", ["active", "superseded", "cancelled", "completed"])
      .default("active")
      .notNull(),
    policyVersion: varchar("policyVersion", { length: 64 }).default("no_surprise_price_v1").notNull(),
    acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    supersededAt: timestamp("supersededAt"),
    cancellationReason: varchar("cancellationReason", { length: 255 }),
  },
  (table) => [
    uniqueIndex("price_guarantees_request_unique").on(table.requestId),
    uniqueIndex("price_guarantees_agreement_unique").on(table.agreementId),
    index("price_guarantees_customer_status_idx").on(table.customerUserId, table.status, table.createdAt),
    index("price_guarantees_provider_status_idx").on(table.providerId, table.status, table.createdAt),
  ],
);

// AI output is never an executable request. A user-owned draft must be
// explicitly confirmed before the normal service-request path may run.
export const moveAiDrafts = mysqlTable(
  "move_ai_drafts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    sourceMessage: text("sourceMessage").notNull(),
    assistantSummary: text("assistantSummary").notNull(),
    categoryId: int("categoryId"),
    draftJson: text("draftJson").notNull(),
    // Drafts hold only opaque IDs and consent metadata; raw media and model
    // input are intentionally kept outside this persisted proposal payload.
    attachedMediaOpaqueIds: json("attachedMediaOpaqueIds").$type<string[] | null>(),
    mediaConsentGrantedAt: timestamp("mediaConsentGrantedAt"),
    hasAudioInput: int("hasAudioInput").default(0).notNull(),
    riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"])
      .default("low")
      .notNull(),
    status: mysqlEnum("status", ["draft", "confirmed", "cancelled", "expired", "blocked"])
      .default("draft")
      .notNull(),
    confirmedRequestId: int("confirmedRequestId"),
    expiresAt: timestamp("expiresAt").notNull(),
    confirmedAt: timestamp("confirmedAt"),
    cancelledAt: timestamp("cancelledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("move_ai_drafts_user_status_idx").on(table.userId, table.status, table.createdAt),
    index("move_ai_drafts_expiry_idx").on(table.status, table.expiresAt),
  ],
);

// Short-lived, owner-scoped metadata for MoveAI images and audio. Storage keys
// are copied to a request only during explicit draft confirmation; no public
// media URL or raw media content is persisted in the MoveAI draft.
export const moveAiDraftMedia = mysqlTable(
  "move_ai_draft_media",
  {
    id: int("id").autoincrement().primaryKey(),
    draftId: int("draftId"),
    ownerUserId: int("ownerUserId").notNull(),
    opaqueId: varchar("opaqueId", { length: 64 }).notNull(),
    kind: mysqlEnum("kind", ["image", "audio"]).notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    // Staged MoveAI image/audio stays in quarantine until an authenticated
    // scanner callback releases it. Draft confirmation may only transfer clean media.
    quarantineStatus: mysqlEnum("quarantineStatus", ["pending_scan", "scanning", "clean", "blocked", "scan_failed", "expired"])
      .default("pending_scan")
      .notNull(),
    quarantineReason: varchar("quarantineReason", { length: 500 }),
    scannedAt: timestamp("scannedAt"),
    releasedAt: timestamp("releasedAt"),
    status: mysqlEnum("status", ["staged", "attached", "transferred", "purged"])
      .default("staged")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    attachedAt: timestamp("attachedAt"),
    transferredAt: timestamp("transferredAt"),
  },
  (table) => [
    uniqueIndex("move_ai_draft_media_opaque_unique").on(table.opaqueId),
    index("move_ai_draft_media_owner_status_idx").on(table.ownerUserId, table.status, table.createdAt),
    index("move_ai_draft_media_quarantine_idx").on(table.quarantineStatus, table.createdAt),
    index("move_ai_draft_media_draft_idx").on(table.draftId, table.status),
  ],
);

// Trust profiles are conservative aggregate state. Unknown users stay active
// with a neutral score, while any explicit restriction blocks privileged flows.
export const trustProfiles = mysqlTable(
  "trust_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    score: int("score").default(100).notNull(),
    status: mysqlEnum("status", ["active", "restricted", "blocked"])
      .default("active")
      .notNull(),
    lastEvaluatedAt: timestamp("lastEvaluatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("trust_profiles_status_score_idx").on(table.status, table.score)],
);

// Risk facts are append-only operational signals. Their resolution is a
// separate human-review action and never deletes the original signal.
export const riskFlags = mysqlTable(
  "risk_flags",
  {
    id: int("id").autoincrement().primaryKey(),
    subjectUserId: int("subjectUserId").notNull(),
    relatedRequestId: int("relatedRequestId"),
    source: mysqlEnum("source", ["move_ai", "system", "admin", "report"]).notNull(),
    reasonCode: varchar("reasonCode", { length: 96 }).notNull(),
    severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
    status: mysqlEnum("status", ["open", "under_review", "resolved", "dismissed"])
      .default("open")
      .notNull(),
    detailsJson: text("detailsJson").notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    reviewNote: text("reviewNote"),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("risk_flags_subject_status_idx").on(table.subjectUserId, table.status, table.createdAt),
    index("risk_flags_status_severity_idx").on(table.status, table.severity, table.createdAt),
  ],
);

// Settlement policies are prospective configuration. An accepted agreement
// serializes the resolved policy into its immutable snapshot, so changing a
// policy can never rewrite a historical commercial commitment.
export const settlementPolicies = mysqlTable(
  "settlement_policies",
  {
    id: int("id").autoincrement().primaryKey(),
    scopeKey: varchar("scopeKey", { length: 191 }).notNull().unique(),
    countryCode: varchar("countryCode", { length: 2 }).notNull(),
    categoryId: int("categoryId"),
    gatewayProvider: mysqlEnum("gatewayProvider", ["any", "iyzico", "stripe"])
      .default("any")
      .notNull(),
    contractType: varchar("contractType", { length: 48 }).default("standard").notNull(),
    precedence: int("precedence").default(0).notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    commissionRateBps: int("commissionRateBps").default(1000).notNull(),
    completionReviewHours: int("completionReviewHours").notNull(),
    cancellationPolicyJson: text("cancellationPolicyJson").notNull(),
    status: mysqlEnum("status", ["draft", "active", "retired", "suspended"])
      .default("draft")
      .notNull(),
    effectiveFrom: timestamp("effectiveFrom").defaultNow().notNull(),
    effectiveTo: timestamp("effectiveTo"),
    createdByUserId: int("createdByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("settlement_policies_lookup_idx").on(
      table.countryCode,
      table.categoryId,
      table.gatewayProvider,
      table.contractType,
      table.status,
      table.effectiveFrom,
    ),
  ],
);

// A change only becomes effective after the counterparty accepts it; it never
// mutates the accepted agreement snapshot or releases held funds.
export const jobChangeOrders = mysqlTable(
  "job_change_orders",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    agreementId: int("agreementId").notNull(),
    requestedByUserId: int("requestedByUserId").notNull(),
    kind: mysqlEnum("kind", ["scope", "schedule", "amount"]).notNull(),
    description: text("description").notNull(),
    amountDelta: int("amountDelta").default(0).notNull(),
    evidenceJson: text("evidenceJson"),
    status: mysqlEnum("status", ["requested", "accepted", "rejected", "withdrawn", "expired"])
      .default("requested")
      .notNull(),
    respondedByUserId: int("respondedByUserId"),
    respondedAt: timestamp("respondedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("job_change_orders_request_status_idx").on(table.requestId, table.status),
    index("job_change_orders_agreement_idx").on(table.agreementId, table.createdAt),
  ],
);

// Cancellation is modeled separately from completion disputes. Settlement is
// decided by an authorized workflow; cancellation alone can never release funds.
export const jobCancellationCases = mysqlTable(
  "job_cancellation_cases",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    agreementId: int("agreementId"),
    openedByUserId: int("openedByUserId").notNull(),
    reasonCode: mysqlEnum("reasonCode", ["schedule", "provider_unavailable", "customer_changed_mind", "safety", "other"])
      .notNull(),
    description: text("description").notNull(),
    evidenceJson: text("evidenceJson"),
    status: mysqlEnum("status", ["requested", "under_review", "resolved", "withdrawn"])
      .default("requested")
      .notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    resolvedByUserId: int("resolvedByUserId"),
    settlementOutcome: mysqlEnum("settlementOutcome", ["pending", "refund", "partial_refund", "provider_payable", "no_payment"])
      .default("pending")
      .notNull(),
    refundAmount: int("refundAmount"),
    providerGrossAmount: int("providerGrossAmount"),
    commissionAmount: int("commissionAmount"),
    providerPayoutAmount: int("providerPayoutAmount"),
    settlementGatewayReference: varchar("settlementGatewayReference", { length: 191 }),
    resolutionNote: text("resolutionNote"),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("job_cancellation_cases_request_unique").on(table.requestId),
    index("job_cancellation_cases_status_idx").on(table.status, table.createdAt),
  ],
);

// Provider-entered transparency records. These never create a customer debt or
// change an accepted agreement; a reimbursement claim is a separate workflow.
export const jobExpenses = mysqlTable(
  "job_expenses",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    agreementId: int("agreementId").notNull(),
    providerId: int("providerId").notNull(),
    category: mysqlEnum("category", [
      "fuel", "toll", "parking", "material", "part", "paint", "equipment", "transport", "packaging", "other",
    ]).notNull(),
    amount: int("amount").notNull(),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    description: text("description").notNull(),
    purchasedAt: timestamp("purchasedAt").notNull(),
    vendorName: varchar("vendorName", { length: 191 }),
    brand: varchar("brand", { length: 120 }),
    model: varchar("model", { length: 120 }),
    quantity: int("quantity"),
    locationUrl: varchar("locationUrl", { length: 500 }),
    sharedWithCustomer: int("sharedWithCustomer").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("job_expenses_request_created_idx").on(table.requestId, table.createdAt),
    index("job_expenses_provider_created_idx").on(table.providerId, table.createdAt),
  ],
);

// Media stays in service_request_media; this immutable link prevents expense
// evidence from being reused across records or exposed outside the job context.
export const jobExpenseMedia = mysqlTable(
  "job_expense_media",
  {
    id: int("id").autoincrement().primaryKey(),
    expenseId: int("expenseId").notNull(),
    mediaId: int("mediaId").notNull(),
    mediaRole: mysqlEnum("mediaRole", ["receipt", "invoice", "product", "material", "video", "other"])
      .default("receipt")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("job_expense_media_media_unique").on(table.mediaId),
    uniqueIndex("job_expense_media_expense_media_unique").on(table.expenseId, table.mediaId),
    index("job_expense_media_expense_idx").on(table.expenseId),
  ],
);

// A reimbursement request is deliberately distinct from the transparency entry.
export const expenseRefundRequests = mysqlTable(
  "expense_refund_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    expenseId: int("expenseId").notNull(),
    providerId: int("providerId").notNull(),
    requestedAmount: int("requestedAmount").notNull(),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    materialAssessmentJson: text("materialAssessmentJson").notNull(),
    status: mysqlEnum("status", ["draft", "submitted", "under_review", "approved", "rejected", "withdrawn"])
      .default("draft")
      .notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    resolutionNote: text("resolutionNote"),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("expense_refund_requests_expense_unique").on(table.expenseId),
    index("expense_refund_requests_request_status_idx").on(table.requestId, table.status),
  ],
);

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

// Immutable double-entry financial ledger. Balances are derived from posted
// lines; wallet snapshots remain an application-read model only.
export const financialAccounts = mysqlTable(
  "financial_accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 160 }).notNull(),
    accountType: mysqlEnum("accountType", ["asset", "liability", "revenue", "expense", "equity"])
      .notNull(),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    ownerUserId: int("ownerUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("financial_accounts_code_currency_unique").on(table.code, table.currency),
    index("financial_accounts_owner_idx").on(table.ownerUserId),
  ],
);

export const financialLedgerEntries = mysqlTable(
  "financial_ledger_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    eventType: mysqlEnum("eventType", [
      "payment_pending",
      "payment_succeeded",
      "hold",
      "commission",
      "provider_payable",
      "settlement",
      "refund",
      "partial_refund",
      "dispute_hold",
      "payout",
      "failed_payout",
      "reversal",
      "chargeback",
      "reimbursement",
      "adjustment",
    ]).notNull(),
    paymentId: int("paymentId"),
    requestId: int("requestId"),
    referenceType: varchar("referenceType", { length: 64 }).notNull(),
    referenceId: varchar("referenceId", { length: 191 }).notNull(),
    externalReference: varchar("externalReference", { length: 191 }),
    idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("financial_ledger_entries_idempotency_unique").on(table.idempotencyKey),
    index("financial_ledger_entries_payment_idx").on(table.paymentId, table.createdAt),
    index("financial_ledger_entries_request_idx").on(table.requestId, table.createdAt),
  ],
);

export const financialLedgerLines = mysqlTable(
  "financial_ledger_lines",
  {
    id: int("id").autoincrement().primaryKey(),
    entryId: int("entryId").notNull(),
    accountId: int("accountId").notNull(),
    direction: mysqlEnum("direction", ["debit", "credit"]).notNull(),
    amount: int("amount").notNull(),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("financial_ledger_lines_entry_idx").on(table.entryId),
    index("financial_ledger_lines_account_idx").on(table.accountId, table.currency),
  ],
);

export const financialReconciliationRuns = mysqlTable(
  "financial_reconciliation_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: mysqlEnum("provider", ["iyzico", "stripe"]).notNull(),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
    status: mysqlEnum("status", ["running", "completed", "failed"])
      .default("running")
      .notNull(),
    checkedCount: int("checkedCount").default(0).notNull(),
    mismatchCount: int("mismatchCount").default(0).notNull(),
    error: text("error"),
  },
  (table) => [index("financial_reconciliation_runs_provider_status_idx").on(table.provider, table.status)],
);

export const financialReconciliationAlerts = mysqlTable(
  "financial_reconciliation_alerts",
  {
    id: int("id").autoincrement().primaryKey(),
    runId: int("runId").notNull(),
    severity: mysqlEnum("severity", ["warning", "critical"]).default("critical").notNull(),
    code: varchar("code", { length: 64 }).default("FINANCIAL_RECONCILIATION_ALERT").notNull(),
    paymentId: int("paymentId"),
    externalReference: varchar("externalReference", { length: 191 }),
    details: text("details").notNull(),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("financial_reconciliation_alerts_run_idx").on(table.runId),
    index("financial_reconciliation_alerts_open_idx").on(table.resolvedAt, table.createdAt),
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

// User wallet balances — amounts are stored as whole TRY major units, matching the payment domain contract.
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

// Device-bound Expo push tokens. Tokens are owned by exactly one user at a time
// and can be safely revoked after an Expo delivery receipt reports an invalid device.
export const userPushTokens = mysqlTable(
  "user_push_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    platform: mysqlEnum("platform", ["ios", "android"]).notNull(),
    deviceId: varchar("deviceId", { length: 160 }),
    active: int("active").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_push_tokens_token_unique").on(table.token),
    index("user_push_tokens_user_active_idx").on(table.userId, table.active),
  ],
);

// A durable, owner-scoped in-app notification timeline. Payload JSON is limited
// by the application layer before persistence and is never trusted for authorization.
export const inAppNotifications = mysqlTable(
  "in_app_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    type: varchar("type", { length: 80 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    dataJson: text("dataJson"),
    status: mysqlEnum("status", ["pending", "sent", "failed", "read"]).default("sent").notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("in_app_notifications_user_created_idx").on(table.userId, table.createdAt),
    index("in_app_notifications_user_read_idx").on(table.userId, table.readAt),
  ],
);

// User-owned notification routing preferences. JSON payloads are validated by
// the application layer and allow new channels/types without schema churn.
export const userNotificationPreferences = mysqlTable(
  "user_notification_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    channelsJson: text("channelsJson").notNull(),
    notificationTypesJson: text("notificationTypesJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_notification_preferences_user_unique").on(table.userId),
  ],
);

// Support cases remain separate from service messages. Their append-only event
// timeline makes assignment and resolution auditable without changing the job.
export const supportTickets = mysqlTable(
  "support_tickets",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId"),
    createdByUserId: int("createdByUserId").notNull(),
    category: mysqlEnum("category", ["technical", "payment", "safety", "service", "account", "other"]).notNull(),
    priority: mysqlEnum("priority", ["normal", "high", "urgent"]).default("normal").notNull(),
    subject: varchar("subject", { length: 180 }).notNull(),
    description: text("description").notNull(),
    status: mysqlEnum("status", ["open", "in_review", "resolved", "closed"]).default("open").notNull(),
    assignedAdminUserId: int("assignedAdminUserId"),
    resolutionNote: text("resolutionNote"),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("support_tickets_creator_status_idx").on(table.createdByUserId, table.status, table.createdAt),
    index("support_tickets_request_idx").on(table.requestId, table.createdAt),
    index("support_tickets_admin_status_idx").on(table.assignedAdminUserId, table.status, table.updatedAt),
  ],
);

export const supportTicketEvents = mysqlTable(
  "support_ticket_events",
  {
    id: int("id").autoincrement().primaryKey(),
    ticketId: int("ticketId").notNull(),
    actorUserId: int("actorUserId").notNull(),
    eventType: mysqlEnum("eventType", ["opened", "message", "status_changed", "assignment", "resolution"]).notNull(),
    body: text("body"),
    metadataJson: text("metadataJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("support_ticket_events_ticket_created_idx").on(table.ticketId, table.createdAt)],
);

// Claim review is deliberately non-financial. Any coverage or reimbursement
// decision requires a separate, verified payment/settlement workflow.
export const insuranceClaims = mysqlTable(
  "insurance_claims",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    openedByUserId: int("openedByUserId").notNull(),
    claimantRole: mysqlEnum("claimantRole", ["customer", "provider"]).notNull(),
    category: mysqlEnum("category", ["injury", "property_damage", "theft", "liability", "other"]).notNull(),
    description: text("description").notNull(),
    incidentAt: timestamp("incidentAt").notNull(),
    status: mysqlEnum("status", ["submitted", "under_review", "more_information_required", "accepted", "rejected", "withdrawn"])
      .default("submitted")
      .notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    decisionNote: text("decisionNote"),
    decidedAt: timestamp("decidedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("insurance_claims_request_status_idx").on(table.requestId, table.status, table.createdAt),
    index("insurance_claims_opener_status_idx").on(table.openedByUserId, table.status, table.createdAt),
  ],
);

export const insuranceClaimMedia = mysqlTable(
  "insurance_claim_media",
  {
    id: int("id").autoincrement().primaryKey(),
    claimId: int("claimId").notNull(),
    mediaId: int("mediaId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("insurance_claim_media_media_unique").on(table.mediaId),
    uniqueIndex("insurance_claim_media_claim_media_unique").on(table.claimId, table.mediaId),
    index("insurance_claim_media_claim_idx").on(table.claimId),
  ],
);

// Tax rules are versioned configuration, never an implicit hard-coded rate.
// Unknown, inactive or expired rules must block tax quotation rather than guess.
export const taxRules = mysqlTable(
  "tax_rules",
  {
    id: int("id").autoincrement().primaryKey(),
    countryCode: varchar("countryCode", { length: 2 }).notNull(),
    taxType: mysqlEnum("taxType", ["vat"]).default("vat").notNull(),
    categoryId: int("categoryId"),
    version: varchar("version", { length: 64 }).notNull(),
    rateBasisPoints: int("rateBasisPoints").notNull(),
    effectiveFrom: timestamp("effectiveFrom").notNull(),
    effectiveUntil: timestamp("effectiveUntil"),
    status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("tax_rules_country_category_version_unique").on(table.countryCode, table.categoryId, table.version),
    index("tax_rules_lookup_idx").on(table.countryCode, table.categoryId, table.status, table.effectiveFrom),
  ],
);

export const serviceRequestTaxSnapshots = mysqlTable(
  "service_request_tax_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    taxRuleId: int("taxRuleId").notNull(),
    taxRuleVersion: varchar("taxRuleVersion", { length: 64 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    subtotalAmount: int("subtotalAmount").notNull(),
    taxAmount: int("taxAmount").notNull(),
    totalAmount: int("totalAmount").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_request_tax_snapshots_request_unique").on(table.requestId),
    index("service_request_tax_snapshots_rule_idx").on(table.taxRuleId, table.createdAt),
  ],
);

// Insurance records retain only a policy reference hash and a pointer to
// quarantined, provider-owned evidence. Review status is authoritative.
export const providerInsurancePolicies = mysqlTable(
  "provider_insurance_policies",
  {
    id: int("id").autoincrement().primaryKey(),
    providerId: int("providerId").notNull(),
    insurer: varchar("insurer", { length: 200 }).notNull(),
    policyType: varchar("policyType", { length: 120 }).notNull(),
    policyReferenceHash: varchar("policyReferenceHash", { length: 128 }).notNull(),
    coverageScopeJson: json("coverageScopeJson").$type<Record<string, unknown>>().notNull(),
    insuredEntityType: mysqlEnum("insuredEntityType", ["person", "vehicle", "company", "other"]).notNull(),
    insuredVehicleReference: varchar("insuredVehicleReference", { length: 128 }),
    jurisdictionCode: varchar("jurisdictionCode", { length: 16 }).notNull(),
    issueDate: timestamp("issueDate"),
    expiryDate: timestamp("expiryDate").notNull(),
    verificationStatus: mysqlEnum("verificationStatus", ["unverified", "pending", "verified", "rejected", "expired", "manual_approved"])
      .default("unverified")
      .notNull(),
    verificationSource: varchar("verificationSource", { length: 200 }),
    lastCheckedAt: timestamp("lastCheckedAt"),
    documentMediaId: int("documentMediaId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("provider_insurance_policies_provider_ref_unique").on(table.providerId, table.policyReferenceHash),
    index("provider_insurance_policies_provider_status_idx").on(table.providerId, table.verificationStatus, table.expiryDate),
    index("provider_insurance_policies_jurisdiction_idx").on(table.jurisdictionCode, table.verificationStatus),
  ],
);

export const providerOperatingModels = mysqlTable(
  "provider_operating_models",
  {
    id: int("id").autoincrement().primaryKey(),
    providerId: int("providerId").notNull(),
    jurisdictionCode: varchar("jurisdictionCode", { length: 16 }).notNull(),
    operatingModel: mysqlEnum("operatingModel", ["employee", "self_employed", "sole_trader", "company_owner", "company_worker", "unresolved"])
      .default("unresolved")
      .notNull(),
    classificationMetadataJson: json("classificationMetadataJson").$type<Record<string, unknown> | null>(),
    reviewStatus: mysqlEnum("reviewStatus", ["pending", "verified", "needs_legal_review", "rejected"])
      .default("pending")
      .notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("provider_operating_models_provider_jurisdiction_unique").on(table.providerId, table.jurisdictionCode),
    index("provider_operating_models_review_idx").on(table.jurisdictionCode, table.reviewStatus),
  ],
);

export const jobSafetyRules = mysqlTable(
  "job_safety_rules",
  {
    id: int("id").autoincrement().primaryKey(),
    jurisdictionCode: varchar("jurisdictionCode", { length: 16 }).notNull(),
    categoryId: int("categoryId"),
    serviceKey: varchar("serviceKey", { length: 120 }),
    activityStatus: mysqlEnum("activityStatus", ["allowed", "restricted", "high_risk", "prohibited", "emergency_only", "not_required", "unknown"])
      .notNull(),
    riskAttributesJson: json("riskAttributesJson").$type<Record<string, unknown>>().notNull(),
    prerequisitesJson: json("prerequisitesJson").$type<Record<string, unknown>>().notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("job_safety_rules_scope_version_unique").on(table.jurisdictionCode, table.categoryId, table.serviceKey, table.version),
    index("job_safety_rules_active_lookup_idx").on(table.jurisdictionCode, table.categoryId, table.status),
  ],
);

// Export types
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type UserCredential = typeof userCredentials.$inferSelect;
export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type FinancialLedgerEntry = typeof financialLedgerEntries.$inferSelect;
export type FinancialLedgerLine = typeof financialLedgerLines.$inferSelect;
export type AuthChallenge = typeof authChallenges.$inferSelect;
export type ProviderDocument = typeof providerDocuments.$inferSelect;
export type ProviderInsurancePolicy = typeof providerInsurancePolicies.$inferSelect;
export type ProviderOperatingModel = typeof providerOperatingModels.$inferSelect;
export type JobSafetyRule = typeof jobSafetyRules.$inferSelect;
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
export type UserPushToken = typeof userPushTokens.$inferSelect;
export type InAppNotification = typeof inAppNotifications.$inferSelect;
