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
  phone: varchar("phone", { length: 32 }),
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
  verificationStatus: mysqlEnum("verificationStatus", ["unsubmitted", "pending", "approved", "rejected"])
    .default("unsubmitted")
    .notNull(),
  verificationSubmittedAt: timestamp("verificationSubmittedAt"),
  verificationReviewedAt: timestamp("verificationReviewedAt"),
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
    type: mysqlEnum("type", ["identity", "driver_license", "src_certificate", "psychotechnic"]).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 96 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
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
    uniqueIndex("provider_documents_provider_type_unique").on(table.providerId, table.type),
    index("provider_documents_status_idx").on(table.status, table.createdAt),
    index("provider_documents_owner_idx").on(table.ownerUserId),
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
    ruleStatus: mysqlEnum("ruleStatus", ["unknown", "required", "not_required", "prohibited"])
      .default("unknown")
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
    status: mysqlEnum("status", ["open", "under_review", "resolved_customer", "resolved_provider"])
      .default("open")
      .notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    resolutionNote: text("resolutionNote"),
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

// Messages
export const messages = mysqlTable("messages", {
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
  isRead: int("isRead").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

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

// Export types
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type UserCredential = typeof userCredentials.$inferSelect;
export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type FinancialLedgerEntry = typeof financialLedgerEntries.$inferSelect;
export type FinancialLedgerLine = typeof financialLedgerLines.$inferSelect;
export type AuthChallenge = typeof authChallenges.$inferSelect;
export type ProviderDocument = typeof providerDocuments.$inferSelect;
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
