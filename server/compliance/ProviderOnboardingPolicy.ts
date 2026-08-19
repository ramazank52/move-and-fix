export type ProviderOnboardingActivationInput = {
  profileComplete: boolean;
  canonicalServiceSelected: boolean;
  verifiedJurisdictionCount: number;
  verifiedCapabilityCount: number;
  dynamicCredentialsVerified: boolean;
  documentsApproved: boolean;
  countryLaunchEligible: boolean;
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
  return blockers.length === 0 ? { status: "ELIGIBLE", blockers: [] } : { status: "BLOCKED", blockers };
}
