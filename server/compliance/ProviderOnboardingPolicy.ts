import type { CapabilityProfileActivationState } from "./ProviderCapabilityProfilePolicy";

export type ProviderOnboardingActivationInput = {
  profileComplete: boolean;
  canonicalServiceSelected: boolean;
  verifiedJurisdictionCount: number;
  verifiedCapabilityCount: number;
  dynamicCredentialsVerified: boolean;
  documentsApproved: boolean;
  countryLaunchEligible: boolean;
  serviceAreaConfigured: boolean;
  /** Undefined preserves pre-Faz 8-A, non-scoped callers. Scoped callers must
   * pass the server-derived state and can never treat it as optional. */
  capabilityProfileStatus?: CapabilityProfileActivationState;
};

export type ProviderOnboardingActivationDecision =
  | { status: "ELIGIBLE"; blockers: [] }
  | { status: "BLOCKED"; blockers: string[] };

/**
 * Server-owned activation decision. Each lifecycle step is independently
 * mandatory: a partial profile, implicit service alias or unknown compliance
 * condition can never become provider activation.
 */
export function decideProviderOnboardingActivation(
  input: ProviderOnboardingActivationInput,
): ProviderOnboardingActivationDecision {
  const blockers: string[] = [];
  if (!input.profileComplete) blockers.push("PROFILE_INCOMPLETE");
  if (!input.canonicalServiceSelected) blockers.push("CANONICAL_SERVICE_NOT_SELECTED");
  if (input.verifiedJurisdictionCount < 1) blockers.push("JURISDICTION_NOT_VERIFIED");
  if (input.verifiedCapabilityCount < 1) blockers.push("CAPABILITY_NOT_VERIFIED");
  if (!input.dynamicCredentialsVerified) blockers.push("DYNAMIC_CREDENTIALS_NOT_VERIFIED");
  if (!input.documentsApproved) blockers.push("DOCUMENTS_NOT_APPROVED");
  if (!input.countryLaunchEligible) blockers.push("COUNTRY_LAUNCH_NOT_ELIGIBLE");
  if (!input.serviceAreaConfigured) blockers.push("SERVICE_AREA_NOT_CONFIGURED");
  switch (input.capabilityProfileStatus) {
    case "missing": blockers.push("CAPABILITY_PROFILE_MISSING"); break;
    case "draft": blockers.push("CAPABILITY_PROFILE_DRAFT"); break;
    case "pending_legal_review": blockers.push("CAPABILITY_PROFILE_PENDING_LEGAL_REVIEW"); break;
    case "source_unverified": blockers.push("CAPABILITY_PROFILE_SOURCE_UNVERIFIED"); break;
    case "legal_approved": blockers.push("CAPABILITY_PROFILE_PRODUCT_RELEASE_PENDING"); break;
    case "suspended": blockers.push("CAPABILITY_PROFILE_SUSPENDED"); break;
    case "scope_unresolved": blockers.push("CAPABILITY_PROFILE_SCOPE_UNRESOLVED"); break;
    case "hard_blocked": blockers.push("CAPABILITY_PROFILE_HARD_BLOCKED"); break;
  }
  return blockers.length === 0 ? { status: "ELIGIBLE", blockers: [] } : { status: "BLOCKED", blockers };
}
