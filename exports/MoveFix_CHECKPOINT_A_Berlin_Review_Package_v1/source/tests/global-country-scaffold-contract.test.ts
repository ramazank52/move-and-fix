import { describe, expect, it } from "vitest";

import { countryActivationPreflight, legalLocaleRuntimeBlockReason } from "../server/compliance/CountryDeploymentPolicy";

const berlinScaffold = {
  countryCode: "DE",
  state: "SCAFFOLD_ONLY" as const,
  localDataPlaneReady: 0,
  countryShellEnabled: 0,
  jurisdictionEnabled: 0,
  consumerDiscoveryEnabled: 0,
  providerOnboardingEnabled: 0,
  bookingEnabled: 0,
  paymentsEnabled: 0,
  aiAssistantEnabled: 0,
  supportEnabled: 0,
  productionStateReachable: 0,
};

describe("global country scaffold contract", () => {
  it("Berlin research-source, connector and machine-locale defaults cannot pass activation preflight", () => {
    const result = countryActivationPreflight({
      deployment: berlinScaffold,
      mandatorySourceVerified: false,
      localLegalApproved: false,
      approvedConnectorAvailable: false,
      legalLocaleReady: false,
      dataPaymentAndPrivacyReady: false,
      productReleaseApproved: false,
      catalogCoveragePercent: 100,
    });

    expect(result.allowed).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "MANDATORY_SOURCE_UNVERIFIED",
      "LOCAL_LEGAL_APPROVAL_MISSING",
      "OFFICIAL_CONNECTOR_UNAVAILABLE",
      "LEGAL_LOCALE_NOT_APPROVED",
      "DATA_PAYMENT_PRIVACY_GATE_BLOCKED",
      "PRODUCT_RELEASE_APPROVAL_MISSING",
    ]));
  });

  it("an incomplete canonical capability map remains a country activation blocker", () => {
    const result = countryActivationPreflight({
      deployment: berlinScaffold,
      mandatorySourceVerified: true,
      localLegalApproved: true,
      approvedConnectorAvailable: true,
      legalLocaleReady: true,
      dataPaymentAndPrivacyReady: true,
      productReleaseApproved: true,
      catalogCoveragePercent: 99,
    });

    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("LIVE_CATALOG_COVERAGE_INCOMPLETE");
  });

  it.each(["SCAFFOLD_ONLY", "RESEARCHING", "SUSPENDED", "INFRA_ONLY_NO_GO"] as const)(
    "%s state cannot pass preflight even when all approval inputs are asserted",
    (state) => {
      const result = countryActivationPreflight({
        deployment: { ...berlinScaffold, state },
        mandatorySourceVerified: true,
        localLegalApproved: true,
        approvedConnectorAvailable: true,
        legalLocaleReady: true,
        dataPaymentAndPrivacyReady: true,
        productReleaseApproved: true,
        catalogCoveragePercent: 100,
      });

      expect(result.allowed).toBe(false);
      expect(result.blockers).toContain(`COUNTRY_DEPLOYMENT_STATE_NOT_ACTIVATABLE:${state}`);
    },
  );

  it("never exposes a DRAFT_MACHINE legal locale or silently falls back to another legal text", () => {
    expect(legalLocaleRuntimeBlockReason({ localizationState: "DRAFT_MACHINE", runtimeSelectable: 0 })).toBe(
      "LEGAL_LOCALE_BLOCKED:DRAFT_MACHINE",
    );
    expect(legalLocaleRuntimeBlockReason({ localizationState: "LEGAL_REVIEWED", runtimeSelectable: 1 })).toBe(
      "LEGAL_LOCALE_BLOCKED:STATE_LEGAL_REVIEWED",
    );
    expect(legalLocaleRuntimeBlockReason({ localizationState: "APPROVED_PRODUCTION", runtimeSelectable: 0 })).toBe(
      "LEGAL_LOCALE_BLOCKED:RUNTIME_SELECTION_DISABLED",
    );
  });
});
