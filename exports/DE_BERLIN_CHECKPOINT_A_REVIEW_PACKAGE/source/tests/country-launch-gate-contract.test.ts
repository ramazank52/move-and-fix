import { describe, expect, it } from "vitest";

import {
  COUNTRY_LAUNCH_REQUIREMENTS,
  createEmptyCountryLaunchChecklist,
  evaluateCountryLaunch,
  parseCountryLaunchChecklist,
} from "../server/compliance/CountryLaunchGateService";
import { countryMarketplaceTransitionBlockReason } from "../server/compliance/CountryComplianceRepository";

describe("country professional marketplace launch gate", () => {
  it("fails closed for an empty, incomplete or malformed checklist", () => {
    const empty = createEmptyCountryLaunchChecklist();
    expect(evaluateCountryLaunch({ checklist: empty, compliancePackageStatus: null, hasVerifiedOfficialSource: false })).toMatchObject({
      ready: false,
      status: "blocked",
    });
    expect(evaluateCountryLaunch({
      checklist: parseCountryLaunchChecklist("not-json"),
      compliancePackageStatus: "approved",
      hasVerifiedOfficialSource: true,
    }).ready).toBe(false);
  });

  it("requires every critical completion, an approved package and a reviewed official source", () => {
    const complete = createEmptyCountryLaunchChecklist();
    for (const key of COUNTRY_LAUNCH_REQUIREMENTS) complete[key] = true;

    expect(evaluateCountryLaunch({ checklist: complete, compliancePackageStatus: "legal_review", hasVerifiedOfficialSource: true }).ready).toBe(false);
    expect(evaluateCountryLaunch({ checklist: complete, compliancePackageStatus: "approved", hasVerifiedOfficialSource: false }).ready).toBe(false);
    expect(evaluateCountryLaunch({
      checklist: complete,
      compliancePackageStatus: "approved",
      hasVerifiedOfficialSource: true,
      countryCode: "DE",
    })).toMatchObject({
      ready: false,
      status: "blocked",
      missing: ["operational_payment_provider"],
    });
    expect(evaluateCountryLaunch({
      checklist: complete,
      compliancePackageStatus: "approved",
      hasVerifiedOfficialSource: true,
      countryCode: "TR",
      hasOperationalPaymentProvider: true,
    })).toEqual({
      ready: true,
      missing: [],
      status: "ready",
    });
  });

  it("requires an explicitly enabled country and operational payment readiness for every new marketplace transition", () => {
    const transitions = [
      "REQUEST_CREATION",
      "PROVIDER_ACTIVATION",
      "OPPORTUNITY_EXPOSURE",
      "OFFER_SUBMIT",
      "OFFER_ACCEPTANCE",
      "PAYMENT_INITIATION",
    ] as const;
    for (const transition of transitions) {
      expect(countryMarketplaceTransitionBlockReason({
        countryCode: "TR",
        gateStatus: "ready",
        paymentReady: true,
        transition,
      })).toBe(`COUNTRY_LAUNCH_GATE_BLOCKED:${transition}:GATE_READY`);
      expect(countryMarketplaceTransitionBlockReason({
        countryCode: "TR",
        gateStatus: "enabled",
        paymentReady: false,
        transition,
      })).toBe(`COUNTRY_LAUNCH_GATE_BLOCKED:${transition}:PAYMENT_NOT_READY`);
      expect(countryMarketplaceTransitionBlockReason({
        countryCode: "TR",
        gateStatus: "enabled",
        paymentReady: true,
        transition,
      })).toBeNull();
    }
  });
});
