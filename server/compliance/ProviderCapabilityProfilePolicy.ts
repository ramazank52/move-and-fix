import type { CanonicalServiceIdentity } from "./ServiceCatalogResolver";

export const TR_BLOCK1_CAPABILITY_PROFILE_KEYS = [
  "transport.freight",
  "towing.roadside",
  "moving.household",
] as const;

export const CAPABILITY_PROFILE_OPERATING_MODEL_VERSION = "v2" as const;
export const CAPABILITY_PROFILE_OPERATING_MODEL_CODES = [
  "independent_tradesperson",
  "sole_proprietorship",
  "company",
  "company_authorized_representative",
  "employee",
  "subcontractor",
  "owner_driver",
  "employee_driver",
  "fleet_operator",
] as const;
export const CAPABILITY_PROFILE_APPROVAL_TYPES = ["legal_source", "product_release"] as const;
export const CAPABILITY_PROFILE_AUTHORIZED_ROLES = {
  legal_source: ["turkiye_legal_compliance_officer"],
  product_release: ["product_release_authority"],
  enforcement: ["system_compliance", "compliance_officer", "super_admin"],
} as const;

export type TrBlock1CapabilityProfileKey = (typeof TR_BLOCK1_CAPABILITY_PROFILE_KEYS)[number];
export type CapabilityProfileOperatingModelCode = (typeof CAPABILITY_PROFILE_OPERATING_MODEL_CODES)[number];
export type CapabilityProfileApprovalType = (typeof CAPABILITY_PROFILE_APPROVAL_TYPES)[number];
export type ProviderCapabilityProfileStatus =
  | "draft"
  | "pending_legal_review"
  | "source_unverified"
  | "legal_approved"
  | "active"
  | "suspended";
export type OwnerSettableCapabilityProfileStatus = Extract<
  ProviderCapabilityProfileStatus,
  "draft" | "pending_legal_review" | "source_unverified" | "suspended"
>;
export type CapabilityProfileActivationState =
  | "not_required"
  | "missing"
  | "draft"
  | "pending_legal_review"
  | "source_unverified"
  | "legal_approved"
  | "active"
  | "suspended"
  | "voluntarily_suspended"
  | "enforcement_suspended"
  | "approval_invalid"
  | "scope_unresolved"
  | "hard_blocked";

export type CapabilityProfileApprovalLedgerEvent = {
  approvalType: CapabilityProfileApprovalType;
  eventType: "granted" | "revoked" | "expired" | "superseded";
  rulePackVersion: string;
  requirementVersion: string;
  approverRole: string;
  authorityScope: string;
  evidenceHash: string;
  evidenceStatus: "present" | "deleted";
  validFrom: Date | null;
  validUntil: Date | null;
  createdAt: Date;
};

export function isTrBlock1CapabilityProfileKey(value: string): value is TrBlock1CapabilityProfileKey {
  return (TR_BLOCK1_CAPABILITY_PROFILE_KEYS as readonly string[]).includes(value);
}

export function isCapabilityProfileOperatingModelCode(value: string): value is CapabilityProfileOperatingModelCode {
  return (CAPABILITY_PROFILE_OPERATING_MODEL_CODES as readonly string[]).includes(value);
}

/** Legacy 0083 values map conservatively to the more precise v2 vocabulary. */
export function mapLegacyOperatingModel(value: "individual" | "company"): CapabilityProfileOperatingModelCode {
  return value === "company" ? "company" : "independent_tradesperson";
}

/** Provider owners may submit facts and may voluntarily suspend themselves. They
 * can never self-record legal/product approval, enforcement, or activation. */
export function assertOwnerSettableCapabilityProfileStatus(
  status: ProviderCapabilityProfileStatus,
): asserts status is OwnerSettableCapabilityProfileStatus {
  if (status === "legal_approved" || status === "active") {
    throw new Error("CAPABILITY_PROFILE_LEGAL_APPROVAL_ACTOR_REQUIRED");
  }
}

export function assertAuthorizedCapabilityProfileActor(
  approvalType: CapabilityProfileApprovalType | "enforcement",
  role: string,
) {
  const permitted = CAPABILITY_PROFILE_AUTHORIZED_ROLES[approvalType] as readonly string[];
  if (!permitted.includes(role)) throw new Error("CAPABILITY_PROFILE_ACTOR_NOT_AUTHORIZED");
}

export function isCurrentApprovalLedgerGrant(input: {
  approvalType: CapabilityProfileApprovalType;
  rulePackVersion: string;
  requirementVersion: string;
  events: CapabilityProfileApprovalLedgerEvent[];
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  const relevant = input.events
    .filter((event) => event.approvalType === input.approvalType)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  const latest = relevant[0];
  if (!latest || latest.eventType !== "granted") return false;
  if (latest.rulePackVersion !== input.rulePackVersion || latest.requirementVersion !== input.requirementVersion) return false;
  if (latest.evidenceStatus !== "present" || !/^[a-f0-9]{64}$/i.test(latest.evidenceHash)) return false;
  if (latest.validFrom && latest.validFrom > now) return false;
  if (latest.validUntil && latest.validUntil <= now) return false;
  try {
    assertAuthorizedCapabilityProfileActor(input.approvalType, latest.approverRole);
    return latest.authorityScope.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Resolves only exact, reviewable catalog scopes. Current moving catalog aliases
 * do not represent general freight; unknown moving scopes remain blocked.
 */
export function resolveTrBlock1CapabilityProfileScope(
  identity: CanonicalServiceIdentity,
): { profileKey: TrBlock1CapabilityProfileKey } | { state: "not_required" | "scope_unresolved" | "hard_blocked" } {
  if (identity.categorySlug === "moving") {
    if (["house-moving", "intercity-moving", "single-item-moving"].includes(identity.subcategorySlug ?? "")) {
      return { profileKey: "moving.household" };
    }
    return { state: "scope_unresolved" };
  }
  if (identity.categorySlug === "towing") return { profileKey: "towing.roadside" };
  if (identity.categorySlug === "roadside") {
    if (identity.subcategorySlug === "fuel-delivery") return { state: "hard_blocked" };
    return { profileKey: "towing.roadside" };
  }
  return { state: "not_required" };
}

export function evaluateCapabilityProfileActivationState(input: {
  scope: ReturnType<typeof resolveTrBlock1CapabilityProfileScope>;
  profile?: {
    profileStatus: ProviderCapabilityProfileStatus;
    sourceVerificationState?: "unverified" | "verified" | "blocked";
    voluntarySuspensionState?: "active" | "suspended";
    enforcementState?: "clear" | "suspended" | "blocked";
    requiredRulePackVersion?: string;
    requiredRequirementVersion?: string;
    approvalLedgerEvents?: CapabilityProfileApprovalLedgerEvent[];
    /** Deprecated 0083 presentation fields. They never constitute approval. */
    legalSourceApprovalRef?: string | null;
    productReleaseApprovalRef?: string | null;
  } | null;
  now?: Date;
}): CapabilityProfileActivationState {
  if ("state" in input.scope) return input.scope.state;
  if (!input.profile) return "missing";
  if (input.profile.enforcementState && input.profile.enforcementState !== "clear") return "enforcement_suspended";
  if (input.profile.voluntarySuspensionState === "suspended") return "voluntarily_suspended";
  if (input.profile.profileStatus === "suspended") return "suspended";
  if ((input.profile.sourceVerificationState ?? "unverified") !== "verified") return "source_unverified";
  if (input.profile.profileStatus !== "active") return input.profile.profileStatus;
  const rulePackVersion = input.profile.requiredRulePackVersion ?? "unknown";
  const requirementVersion = input.profile.requiredRequirementVersion ?? "unknown";
  const events = input.profile.approvalLedgerEvents ?? [];
  const legalCurrent = isCurrentApprovalLedgerGrant({
    approvalType: "legal_source", rulePackVersion, requirementVersion, events, now: input.now,
  });
  if (!legalCurrent) return events.length > 0 ? "approval_invalid" : "pending_legal_review";
  const productCurrent = isCurrentApprovalLedgerGrant({
    approvalType: "product_release", rulePackVersion, requirementVersion, events, now: input.now,
  });
  if (!productCurrent) return "legal_approved";
  return "active";
}
