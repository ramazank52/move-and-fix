export type CountryDeploymentState =
  | "SCAFFOLD_ONLY"
  | "RESEARCHING"
  | "SOURCE_REVIEW"
  | "LEGAL_REVIEW"
  | "CONNECTOR_PENDING"
  | "STAGING_READY"
  | "PILOT_READY"
  | "PRODUCTION_PARTIAL"
  | "PRODUCTION_ACTIVE"
  | "SUSPENDED"
  | "INFRA_ONLY_NO_GO";

export type CountryDeploymentRuntime = {
  countryCode: string;
  state: CountryDeploymentState;
  localDataPlaneReady: number;
  countryShellEnabled: number;
  jurisdictionEnabled: number;
  consumerDiscoveryEnabled: number;
  providerOnboardingEnabled: number;
  bookingEnabled: number;
  paymentsEnabled: number;
  aiAssistantEnabled: number;
  supportEnabled: number;
  productionStateReachable: number;
};

export type CountryDeploymentTransition =
  | "REQUEST_CREATION"
  | "PROVIDER_ACTIVATION"
  | "OPPORTUNITY_EXPOSURE"
  | "OFFER_SUBMIT"
  | "OFFER_ACCEPTANCE"
  | "PAYMENT_INITIATION"
  | "CAPABILITY_ACTIVATION"
  | "VERIFIED_BADGE"
  | "PAYOUT"
  | "CAMPAIGN"
  | "OPERATION_NOTIFICATION";

export type LocalizedLegalRuntimeState =
  | "DRAFT_MACHINE"
  | "HUMAN_TRANSLATED"
  | "LEGAL_REVIEWED"
  | "LINGUIST_REVIEWED"
  | "APPROVED_STAGING"
  | "APPROVED_PRODUCTION"
  | "RETIRED";

/**
 * There is deliberately no language fallback for country legal documents.
 * A machine draft is internal review material, not a user-facing substitute.
 */
export function legalLocaleRuntimeBlockReason(input: {
  localizationState: LocalizedLegalRuntimeState;
  runtimeSelectable: number;
}) {
  if (input.localizationState === "DRAFT_MACHINE") return "LEGAL_LOCALE_BLOCKED:DRAFT_MACHINE";
  if (input.localizationState === "RETIRED") return "LEGAL_LOCALE_BLOCKED:RETIRED";
  if (input.localizationState !== "APPROVED_PRODUCTION") {
    return `LEGAL_LOCALE_BLOCKED:STATE_${input.localizationState}`;
  }
  if (input.runtimeSelectable !== 1) return "LEGAL_LOCALE_BLOCKED:RUNTIME_SELECTION_DISABLED";
  return null;
}

const flagForTransition: Record<CountryDeploymentTransition, keyof CountryDeploymentRuntime> = {
  REQUEST_CREATION: "bookingEnabled",
  PROVIDER_ACTIVATION: "providerOnboardingEnabled",
  OPPORTUNITY_EXPOSURE: "consumerDiscoveryEnabled",
  OFFER_SUBMIT: "bookingEnabled",
  OFFER_ACCEPTANCE: "bookingEnabled",
  PAYMENT_INITIATION: "paymentsEnabled",
  CAPABILITY_ACTIVATION: "providerOnboardingEnabled",
  VERIFIED_BADGE: "providerOnboardingEnabled",
  PAYOUT: "paymentsEnabled",
  CAMPAIGN: "supportEnabled",
  OPERATION_NOTIFICATION: "supportEnabled",
};

/**
 * A deployment record narrows the pre-existing country gate; it never creates
 * an enable path. Unknown/missing state, a separate-plane not ready signal and
 * every non-production state stay fail-closed.
 */
export function countryDeploymentTransitionBlockReason(input: {
  deployment: CountryDeploymentRuntime;
  transition: CountryDeploymentTransition;
}) {
  const countryCode = input.deployment.countryCode.trim().toUpperCase();
  if (countryCode === "RU" || input.deployment.state === "INFRA_ONLY_NO_GO") {
    return `COUNTRY_DEPLOYMENT_BLOCKED:${input.transition}:INFRA_ONLY_NO_GO`;
  }
  if (input.deployment.state !== "PRODUCTION_ACTIVE") {
    return `COUNTRY_DEPLOYMENT_BLOCKED:${input.transition}:STATE_${input.deployment.state}`;
  }
  if (input.deployment.productionStateReachable !== 1) {
    return `COUNTRY_DEPLOYMENT_BLOCKED:${input.transition}:PRODUCTION_STATE_UNREACHABLE`;
  }
  if (input.deployment.countryShellEnabled !== 1 || input.deployment.jurisdictionEnabled !== 1) {
    return `COUNTRY_DEPLOYMENT_BLOCKED:${input.transition}:COUNTRY_SHELL_DISABLED`;
  }
  const transitionFlag = flagForTransition[input.transition];
  if (input.deployment[transitionFlag] !== 1) {
    return `COUNTRY_DEPLOYMENT_BLOCKED:${input.transition}:${transitionFlag.toUpperCase()}_DISABLED`;
  }
  if (countryCode === "CN" && input.deployment.localDataPlaneReady !== 1) {
    return `COUNTRY_DEPLOYMENT_BLOCKED:${input.transition}:CN_LOCAL_DATA_PLANE_NOT_READY`;
  }
  return null;
}

export function countryActivationPreflight(input: {
  deployment: CountryDeploymentRuntime;
  mandatorySourceVerified: boolean;
  localLegalApproved: boolean;
  approvedConnectorAvailable: boolean;
  legalLocaleReady: boolean;
  dataPaymentAndPrivacyReady: boolean;
  productReleaseApproved: boolean;
  catalogCoveragePercent: number;
}) {
  const blockers: string[] = [];
  const countryCode = input.deployment.countryCode.trim().toUpperCase();
  const activatableStates = new Set<CountryDeploymentState>(["PILOT_READY", "PRODUCTION_PARTIAL"]);
  if (input.deployment.state === "INFRA_ONLY_NO_GO" || countryCode === "RU") blockers.push("INFRA_ONLY_NO_GO");
  if (!activatableStates.has(input.deployment.state)) {
    blockers.push(`COUNTRY_DEPLOYMENT_STATE_NOT_ACTIVATABLE:${input.deployment.state}`);
  }
  if (input.catalogCoveragePercent !== 100) blockers.push("LIVE_CATALOG_COVERAGE_INCOMPLETE");
  if (!input.mandatorySourceVerified) blockers.push("MANDATORY_SOURCE_UNVERIFIED");
  if (!input.localLegalApproved) blockers.push("LOCAL_LEGAL_APPROVAL_MISSING");
  if (!input.approvedConnectorAvailable) blockers.push("OFFICIAL_CONNECTOR_UNAVAILABLE");
  if (!input.legalLocaleReady) blockers.push("LEGAL_LOCALE_NOT_APPROVED");
  if (!input.dataPaymentAndPrivacyReady) blockers.push("DATA_PAYMENT_PRIVACY_GATE_BLOCKED");
  if (!input.productReleaseApproved) blockers.push("PRODUCT_RELEASE_APPROVAL_MISSING");
  if ((countryCode === "CN" || countryCode === "RU") && input.deployment.localDataPlaneReady !== 1) {
    blockers.push("LOCAL_DATA_PLANE_NOT_READY");
  }
  return { allowed: blockers.length === 0, blockers } as const;
}

export type CountryCoverageActivationRuntime = {
  mappingState: "MAPPED_BLOCKED" | "UNMAPPED_SERVICE_BLOCKED";
  productionState: "BLOCKED_PENDING_GATES" | "NO_GO" | "POLICY_ELIGIBLE" | "ACTIVE";
  sourceState: "AI_RESEARCHED_UNVERIFIED" | "SOURCE_UNVERIFIED" | "SOURCE_VERIFIED";
  legalState: "NOT_REVIEWED" | "PENDING" | "APPROVED" | "REVOKED" | "EXPIRED";
  connectorState: "NOT_IMPLEMENTED_OR_NOT_AUTHORIZED" | "PENDING" | "AUTHORIZED" | "OPERATIONAL" | "REVOKED";
  decision: "BLOCKED" | "PROFILE_INCOMPLETE" | "LEGAL_REVIEW_REQUIRED" | "PENDING_OFFICIAL_VERIFICATION" | "AUTHORITY_VERIFIED" | "POLICY_ELIGIBLE" | "VERIFIED_LIMITED_SCOPE" | "REJECTED" | "EXPIRED_OR_SUSPENDED" | "NO_GO";
  assuranceLevel: "SELF_ASSERTED" | "DOCUMENT_UPLOADED" | "DOCUMENT_EXTRACTED" | "ISSUER_SIGNATURE_VERIFIED" | "REGISTRY_MATCHED" | "REGISTRY_STATUS_ACTIVE" | "REVOCATION_MONITORED";
  legalApprovalState: "NOT_REVIEWED" | "PENDING" | "APPROVED" | "REVOKED" | "EXPIRED";
  productReleaseState: "PENDING" | "APPROVED" | "REVOKED" | "EXPIRED";
};

/**
 * A country may pass a coarse preflight only when every covered service passes
 * this derived evaluator. Research material, self-assertion and a connector
 * merely configured for later use are never sufficient to activate a service.
 */
export function countryCoverageActivationBlockReasons(input: CountryCoverageActivationRuntime) {
  const blockers: string[] = [];
  if (input.mappingState !== "MAPPED_BLOCKED") blockers.push("CANONICAL_SERVICE_MAPPING_UNRESOLVED");
  if (input.productionState !== "ACTIVE") blockers.push(`COVERAGE_PRODUCTION_STATE_${input.productionState}`);
  if (input.sourceState !== "SOURCE_VERIFIED") blockers.push(`COVERAGE_SOURCE_${input.sourceState}`);
  if (input.legalState !== "APPROVED") blockers.push(`COVERAGE_LEGAL_STATE_${input.legalState}`);
  if (input.connectorState !== "OPERATIONAL") blockers.push(`COVERAGE_CONNECTOR_${input.connectorState}`);
  if (input.decision !== "AUTHORITY_VERIFIED" && input.decision !== "POLICY_ELIGIBLE" && input.decision !== "VERIFIED_LIMITED_SCOPE") {
    blockers.push(`COVERAGE_DECISION_${input.decision}`);
  }
  if (input.assuranceLevel !== "REGISTRY_STATUS_ACTIVE" && input.assuranceLevel !== "REVOCATION_MONITORED") {
    blockers.push(`COVERAGE_ASSURANCE_${input.assuranceLevel}`);
  }
  if (input.legalApprovalState !== "APPROVED") blockers.push(`LOCAL_LEGAL_APPROVAL_${input.legalApprovalState}`);
  if (input.productReleaseState !== "APPROVED") blockers.push(`PRODUCT_RELEASE_APPROVAL_${input.productReleaseState}`);
  return { allowed: blockers.length === 0, blockers } as const;
}

export function activeProviderTransitionWindowBlockReason(input: {
  coverageProductionState: CountryCoverageActivationRuntime["productionState"];
  coverageDecision: CountryCoverageActivationRuntime["decision"];
  ownerApprovalLedgerValid: boolean;
  notificationEvidencePresent: boolean;
}) {
  if (input.coverageProductionState !== "ACTIVE") return `ACTIVE_PROVIDER_TRANSITION_BLOCKED:COVERAGE_${input.coverageProductionState}`;
  if (input.coverageDecision !== "POLICY_ELIGIBLE" && input.coverageDecision !== "VERIFIED_LIMITED_SCOPE") {
    return `ACTIVE_PROVIDER_TRANSITION_BLOCKED:DECISION_${input.coverageDecision}`;
  }
  if (!input.ownerApprovalLedgerValid) return "ACTIVE_PROVIDER_TRANSITION_BLOCKED:OWNER_APPROVAL_LEDGER_MISSING";
  if (!input.notificationEvidencePresent) return "ACTIVE_PROVIDER_TRANSITION_BLOCKED:NOTICE_EVIDENCE_MISSING";
  return null;
}
