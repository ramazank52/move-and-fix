import { describe, expect, it } from "vitest";

import {
  countryMarketTransitionBlockReason,
  deriveCountryMarketEffectiveState,
  type CountryMarketGateSnapshot,
} from "../server/compliance/CountryMarketControlPolicy";

const readyTurkey: CountryMarketGateSnapshot = {
  countryCode: "TR",
  legacyCountryGateEnabled: true,
  legacyRuntimeFlagsEnabled: true,
  allCoveredCapabilitiesActive: true,
  localLegalApproved: true,
  officialSourceVerified: true,
  operationalConnectorPresent: true,
  legalLocaleApproved: true,
  paymentAndExternalCredentialsReady: true,
  scannerReady: true,
  securityAndRegressionReady: true,
  physicalDeviceE2eReady: true,
  monitoringBackupRollbackReady: true,
  ownerReleaseApprovalLedgerValid: false,
  nonTrMarketsClosed: true,
};

describe("Türkiye-only country market control policy", () => {
  it("keeps a fully ready Türkiye market pending until a distinct owner release approval exists", () => {
    expect(deriveCountryMarketEffectiveState({ countryCode: "TR", desiredState: "ACTIVE", snapshot: readyTurkey })).toEqual({
      effectiveState: "READY_PENDING_OWNER_APPROVAL",
      blockers: ["OWNER_RELEASE_APPROVAL_LEDGER_MISSING"],
    });
  });

  it("keeps any missing legal/source/connector gate fail-closed despite owner ACTIVE intent", () => {
    const result = deriveCountryMarketEffectiveState({
      countryCode: "TR",
      desiredState: "ACTIVE",
      snapshot: { ...readyTurkey, localLegalApproved: false, officialSourceVerified: false, operationalConnectorPresent: false },
    });
    expect(result.effectiveState).toBe("READINESS_BLOCKED");
    expect(result.blockers).toEqual(expect.arrayContaining(["LOCAL_LEGAL_APPROVAL_MISSING", "OFFICIAL_SOURCE_VERIFICATION_MISSING", "OFFICIAL_CONNECTOR_OR_MANUAL_AUTHORITY_CHANNEL_MISSING"]));
  });

  it("never opens Russia and keeps all non-TR market transitions blocked", () => {
    expect(deriveCountryMarketEffectiveState({ countryCode: "RU", desiredState: "ACTIVE", snapshot: { ...readyTurkey, countryCode: "RU", ownerReleaseApprovalLedgerValid: true } }).effectiveState).toBe("INFRA_ONLY_NO_GO");
    expect(countryMarketTransitionBlockReason({ countryCode: "DE", effectiveState: "ACTIVE", inAppProductionAllowlisted: 1, transition: "BOOKING" })).toContain("TR_ONLY_MARKET_ALLOWLIST");
  });

  it("lets an emergency owner control override every readiness input without making a market active", () => {
    expect(deriveCountryMarketEffectiveState({ countryCode: "TR", desiredState: "EMERGENCY_DISABLED", snapshot: readyTurkey })).toEqual({
      effectiveState: "EMERGENCY_DISABLED",
      blockers: ["OWNER_EMERGENCY_KILL_SWITCH"],
    });
  });
});
