import { createHash } from "node:crypto";

export type CountryMarketDesiredState = "INFRA_ONLY" | "ACTIVE" | "PAUSED" | "EMERGENCY_DISABLED";
export type CountryMarketEffectiveState = "INFRA_ONLY" | "READINESS_BLOCKED" | "READY_PENDING_OWNER_APPROVAL" | "ACTIVE" | "PAUSED" | "EMERGENCY_DISABLED" | "INFRA_ONLY_NO_GO";
export type CountryMarketTransition = "REQUEST_CREATION" | "PROVIDER_ONBOARDING" | "PROVIDER_ACTIVATION" | "CAPABILITY_ACTIVATION" | "VERIFIED_BADGE" | "DISCOVERY" | "OPPORTUNITY_EXPOSURE" | "OFFER_SUBMIT" | "OFFER_ACCEPTANCE" | "BOOKING" | "JOB_ACCEPTANCE" | "PAYMENT" | "PAYMENT_INITIATION" | "PAYOUT" | "CAMPAIGN" | "OPERATION_NOTIFICATION";

export type CountryMarketGateSnapshot = {
  countryCode: string;
  legacyCountryGateEnabled: boolean;
  legacyRuntimeFlagsEnabled: boolean;
  allCoveredCapabilitiesActive: boolean;
  localLegalApproved: boolean;
  officialSourceVerified: boolean;
  operationalConnectorPresent: boolean;
  legalLocaleApproved: boolean;
  paymentAndExternalCredentialsReady: boolean;
  scannerReady: boolean;
  securityAndRegressionReady: boolean;
  physicalDeviceE2eReady: boolean;
  monitoringBackupRollbackReady: boolean;
  ownerReleaseApprovalLedgerValid: boolean;
  nonTrMarketsClosed: boolean;
};

export function countryMarketGateSnapshotHash(snapshot: CountryMarketGateSnapshot) {
  return createHash("sha256").update(JSON.stringify({ ...snapshot, countryCode: snapshot.countryCode.trim().toUpperCase() })).digest("hex");
}

export function countryMarketGateBlockers(snapshot: CountryMarketGateSnapshot): string[] {
  const blockers: string[] = [];
  const countryCode = snapshot.countryCode.trim().toUpperCase();
  if (countryCode !== "TR") blockers.push("TR_ONLY_MARKET_ALLOWLIST");
  if (!snapshot.legacyCountryGateEnabled) blockers.push("LEGACY_COUNTRY_LAUNCH_GATE_DISABLED");
  if (!snapshot.legacyRuntimeFlagsEnabled) blockers.push("COUNTRY_RUNTIME_FLAGS_DISABLED");
  if (!snapshot.allCoveredCapabilitiesActive) blockers.push("CAPABILITY_ALLOWLIST_OR_NO_GO_INCOMPLETE");
  if (!snapshot.localLegalApproved) blockers.push("LOCAL_LEGAL_APPROVAL_MISSING");
  if (!snapshot.officialSourceVerified) blockers.push("OFFICIAL_SOURCE_VERIFICATION_MISSING");
  if (!snapshot.operationalConnectorPresent) blockers.push("OFFICIAL_CONNECTOR_OR_MANUAL_AUTHORITY_CHANNEL_MISSING");
  if (!snapshot.legalLocaleApproved) blockers.push("TR_LEGAL_LOCALE_NOT_APPROVED");
  if (!snapshot.paymentAndExternalCredentialsReady) blockers.push("PAYMENT_OR_EXTERNAL_CREDENTIALS_NOT_READY");
  if (!snapshot.scannerReady) blockers.push("MALWARE_SCANNER_NOT_READY");
  if (!snapshot.securityAndRegressionReady) blockers.push("SECURITY_ACCESSIBILITY_OR_REGRESSION_NOT_READY");
  if (!snapshot.physicalDeviceE2eReady) blockers.push("PHYSICAL_DEVICE_E2E_NOT_COMPLETE");
  if (!snapshot.monitoringBackupRollbackReady) blockers.push("MONITORING_BACKUP_ROLLBACK_NOT_READY");
  if (!snapshot.nonTrMarketsClosed) blockers.push("NON_TR_MARKET_CLOSURE_ASSERTION_FAILED");
  return blockers;
}

export function deriveCountryMarketEffectiveState(input: {
  countryCode: string;
  desiredState: CountryMarketDesiredState;
  snapshot: CountryMarketGateSnapshot;
}): { effectiveState: CountryMarketEffectiveState; blockers: string[] } {
  const countryCode = input.countryCode.trim().toUpperCase();
  if (countryCode === "RU") return { effectiveState: "INFRA_ONLY_NO_GO", blockers: ["RUSSIA_INFRA_ONLY_NO_GO"] };
  if (input.desiredState === "EMERGENCY_DISABLED") return { effectiveState: "EMERGENCY_DISABLED", blockers: ["OWNER_EMERGENCY_KILL_SWITCH"] };
  if (input.desiredState === "PAUSED") return { effectiveState: "PAUSED", blockers: ["OWNER_MARKET_PAUSED_REVALIDATION_REQUIRED"] };
  if (input.desiredState === "INFRA_ONLY" || countryCode !== "TR") return { effectiveState: "INFRA_ONLY", blockers: [countryCode === "TR" ? "OWNER_INFRA_ONLY" : "TR_ONLY_MARKET_ALLOWLIST"] };
  const blockers = countryMarketGateBlockers(input.snapshot);
  if (blockers.length > 0) return { effectiveState: "READINESS_BLOCKED", blockers };
  if (!input.snapshot.ownerReleaseApprovalLedgerValid) return { effectiveState: "READY_PENDING_OWNER_APPROVAL", blockers: ["OWNER_RELEASE_APPROVAL_LEDGER_MISSING"] };
  return { effectiveState: "ACTIVE", blockers: [] };
}

export function countryMarketTransitionBlockReason(input: {
  countryCode: string;
  effectiveState: CountryMarketEffectiveState;
  inAppProductionAllowlisted: number;
  transition: CountryMarketTransition;
}) {
  const countryCode = input.countryCode.trim().toUpperCase();
  if (countryCode !== "TR") return `COUNTRY_MARKET_BLOCKED:${input.transition}:TR_ONLY_MARKET_ALLOWLIST`;
  if (input.effectiveState !== "ACTIVE") return `COUNTRY_MARKET_BLOCKED:${input.transition}:EFFECTIVE_${input.effectiveState}`;
  if (input.inAppProductionAllowlisted !== 1) return `COUNTRY_MARKET_BLOCKED:${input.transition}:IN_APP_ALLOWLIST_DISABLED`;
  return null;
}
