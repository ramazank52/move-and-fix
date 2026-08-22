import { describe, expect, it } from "vitest";

import {
  countryActivationPreflight,
  countryDeploymentTransitionBlockReason,
  type CountryDeploymentRuntime,
} from "../server/compliance/CountryDeploymentPolicy";

const transitions = [
  "REQUEST_CREATION",
  "PROVIDER_ACTIVATION",
  "OPPORTUNITY_EXPOSURE",
  "OFFER_SUBMIT",
  "OFFER_ACCEPTANCE",
  "PAYMENT_INITIATION",
] as const;

function deployment(overrides: Partial<CountryDeploymentRuntime> = {}): CountryDeploymentRuntime {
  return {
    countryCode: "DE",
    state: "SCAFFOLD_ONLY",
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
    ...overrides,
  };
}

describe("global country deployment policy", () => {
  it("blocks every marketplace transition for a default-off scaffold", () => {
    for (const transition of transitions) {
      expect(countryDeploymentTransitionBlockReason({ deployment: deployment(), transition }))
        .toBe(`COUNTRY_DEPLOYMENT_BLOCKED:${transition}:STATE_SCAFFOLD_ONLY`);
    }
  });

  it("keeps China blocked without a separate ready local data plane and Russia infra-only", () => {
    const otherwiseOpenChina = deployment({
      countryCode: "CN",
      state: "PRODUCTION_ACTIVE",
      countryShellEnabled: 1,
      jurisdictionEnabled: 1,
      providerOnboardingEnabled: 1,
      consumerDiscoveryEnabled: 1,
      bookingEnabled: 1,
      paymentsEnabled: 1,
      productionStateReachable: 1,
    });
    expect(countryDeploymentTransitionBlockReason({
      deployment: otherwiseOpenChina,
      transition: "PAYMENT_INITIATION",
    })).toBe("COUNTRY_DEPLOYMENT_BLOCKED:PAYMENT_INITIATION:CN_LOCAL_DATA_PLANE_NOT_READY");

    expect(countryDeploymentTransitionBlockReason({
      deployment: deployment({ countryCode: "RU", state: "INFRA_ONLY_NO_GO" }),
      transition: "REQUEST_CREATION",
    })).toBe("COUNTRY_DEPLOYMENT_BLOCKED:REQUEST_CREATION:INFRA_ONLY_NO_GO");
  });

  it("requires complete independent activation evidence and exact catalog coverage", () => {
    const base = {
      deployment: deployment({ state: "PILOT_READY" }),
      mandatorySourceVerified: true,
      localLegalApproved: true,
      approvedConnectorAvailable: true,
      legalLocaleReady: true,
      dataPaymentAndPrivacyReady: true,
      productReleaseApproved: true,
    };
    expect(countryActivationPreflight({ ...base, catalogCoveragePercent: 99 })).toEqual({
      allowed: false,
      blockers: ["LIVE_CATALOG_COVERAGE_INCOMPLETE"],
    });
    expect(countryActivationPreflight({ ...base, catalogCoveragePercent: 100 })).toEqual({
      allowed: true,
      blockers: [],
    });
  });
});
