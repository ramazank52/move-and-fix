export type MarketplaceTransition =
  | "OPPORTUNITY_EXPOSURE"
  | "OFFER_CREATE"
  | "OFFER_UPDATE"
  | "OFFER_SELECT"
  | "OFFER_ACCEPT"
  | "JOB_START";

export type ProviderMarketplaceEligibilityInput = {
  transition: MarketplaceTransition;
  /** Every value must be derived by the server from authoritative records. */
  countryTransitionAllowed: boolean;
  requestIsOpenAndUnassigned: boolean;
  providerIsVerified: boolean;
  providerIsAvailable: boolean;
  providerEnforcementClear: boolean;
  providerCapacityAvailable: boolean;
  capabilityAllowed: boolean;
  credentialAllowed: boolean;
  scopeAllowed: boolean;
  serviceAreaAllowed: boolean;
  safetyAllowed: boolean;
};

export type ProviderMarketplaceEligibilityDecision = {
  allowed: boolean;
  transition: MarketplaceTransition;
  blockers: readonly string[];
};

/**
 * Central, fail-closed eligibility decision used before opportunity exposure and
 * every offer/job transition. It intentionally accepts only server-derived
 * facts: clients cannot submit a boolean that causes an allow decision.
 */
export function decideProviderMarketplaceEligibility(
  input: ProviderMarketplaceEligibilityInput,
): ProviderMarketplaceEligibilityDecision {
  const blockers: string[] = [];
  if (!input.countryTransitionAllowed) blockers.push("COUNTRY_OR_JURISDICTION_BLOCKED");
  if (!input.requestIsOpenAndUnassigned && input.transition !== "JOB_START") {
    blockers.push("REQUEST_NOT_OPEN_OR_ALREADY_ASSIGNED");
  }
  if (!input.providerIsVerified) blockers.push("PROVIDER_NOT_VERIFIED");
  if (!input.providerIsAvailable) blockers.push("PROVIDER_UNAVAILABLE");
  if (!input.providerEnforcementClear) blockers.push("PROVIDER_ENFORCEMENT_BLOCKED");
  if (!input.providerCapacityAvailable) blockers.push("PROVIDER_CAPACITY_EXCEEDED");
  if (!input.capabilityAllowed) blockers.push("CAPABILITY_NOT_ELIGIBLE");
  if (!input.credentialAllowed) blockers.push("CREDENTIAL_NOT_ELIGIBLE");
  if (!input.scopeAllowed) blockers.push("CAPABILITY_SCOPE_MISMATCH");
  if (!input.serviceAreaAllowed) blockers.push("SERVICE_AREA_MISMATCH");
  if (!input.safetyAllowed) blockers.push("JOB_SAFETY_BLOCKED");
  return { allowed: blockers.length === 0, transition: input.transition, blockers };
}

export function assertProviderMarketplaceEligibility(
  input: ProviderMarketplaceEligibilityInput,
): void {
  const decision = decideProviderMarketplaceEligibility(input);
  if (!decision.allowed) throw new Error(`PROVIDER_MARKETPLACE_INELIGIBLE:${decision.blockers.join(",")}`);
}
