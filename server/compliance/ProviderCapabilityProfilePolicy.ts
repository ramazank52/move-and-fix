import type { CanonicalServiceIdentity } from "./ServiceCatalogResolver";

export const TR_BLOCK1_CAPABILITY_PROFILE_KEYS = [
  "transport.freight",
  "towing.roadside",
  "moving.household",
] as const;

export type TrBlock1CapabilityProfileKey = (typeof TR_BLOCK1_CAPABILITY_PROFILE_KEYS)[number];
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
  | "scope_unresolved"
  | "hard_blocked";

export function isTrBlock1CapabilityProfileKey(value: string): value is TrBlock1CapabilityProfileKey {
  return (TR_BLOCK1_CAPABILITY_PROFILE_KEYS as readonly string[]).includes(value);
}

/** Provider owners may supply facts and safely suspend themselves, but can never
 * self-record either legal approval or a production-active profile. */
export function assertOwnerSettableCapabilityProfileStatus(
  status: ProviderCapabilityProfileStatus,
): asserts status is OwnerSettableCapabilityProfileStatus {
  if (status === "legal_approved" || status === "active") {
    throw new Error("CAPABILITY_PROFILE_LEGAL_APPROVAL_ACTOR_REQUIRED");
  }
}

/**
 * Resolves only exact, reviewable catalog scopes. Current moving catalog aliases
 * do not represent general freight; unknown moving scopes therefore remain
 * blocked rather than being inferred as either freight or household moving.
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
    // TR Gold Master marks fuel delivery disabled until a dedicated dangerous-goods/fuel pack exists.
    if (identity.subcategorySlug === "fuel-delivery") return { state: "hard_blocked" };
    return { profileKey: "towing.roadside" };
  }
  return { state: "not_required" };
}

export function evaluateCapabilityProfileActivationState(input: {
  scope: ReturnType<typeof resolveTrBlock1CapabilityProfileScope>;
  profile?: {
    profileStatus: ProviderCapabilityProfileStatus;
    legalSourceApprovalRef: string | null;
    productReleaseApprovalRef: string | null;
  } | null;
}): CapabilityProfileActivationState {
  if ("state" in input.scope) return input.scope.state;
  if (!input.profile) return "missing";
  if (input.profile.profileStatus !== "active") return input.profile.profileStatus;
  // An active row without both independent approvals is corrupt or incomplete
  // state, never proof of activation eligibility.
  return input.profile.legalSourceApprovalRef && input.profile.productReleaseApprovalRef
    ? "active"
    : "source_unverified";
}
