import { describe, expect, it } from "vitest";

import { evaluateProfessionalAiBoundary } from "../server/ai/ProfessionalAiBoundary";
import { createPolicyBoundMoveAiResponse } from "../server/ai/MoveAiResponsePolicy";
import { countryMarketplaceTransitionBlockReason } from "../server/compliance/CountryComplianceRepository";
import { redactObservabilityData } from "../server/_core/observability";

describe("P15 authorization and resilience matrix", () => {
  it("rejects unauthenticated, unrelated, contact-leaking and action-taking professional AI contexts", () => {
    const common = { isAssignedProvider: true, jobStatus: "active" as const, requestedCapability: "job_summary" as const, containsCustomerContactData: false, attemptsExternalAction: false };

    expect(evaluateProfessionalAiBoundary({ ...common, actorRole: null })).toMatchObject({ allowed: false, reason: "PROFESSIONAL_AI_PROVIDER_REQUIRED" });
    expect(evaluateProfessionalAiBoundary({ ...common, actorRole: "customer" })).toMatchObject({ allowed: false, reason: "PROFESSIONAL_AI_PROVIDER_REQUIRED" });
    expect(evaluateProfessionalAiBoundary({ ...common, actorRole: "provider", isAssignedProvider: false })).toMatchObject({ allowed: false, reason: "PROFESSIONAL_AI_ASSIGNED_JOB_REQUIRED" });
    expect(evaluateProfessionalAiBoundary({ ...common, actorRole: "provider", containsCustomerContactData: true })).toMatchObject({ allowed: false, reason: "PROFESSIONAL_AI_CONTACT_DATA_FORBIDDEN" });
    expect(evaluateProfessionalAiBoundary({ ...common, actorRole: "provider", attemptsExternalAction: true })).toMatchObject({ allowed: false, reason: "PROFESSIONAL_AI_AUTOMATION_FORBIDDEN" });
    expect(evaluateProfessionalAiBoundary({ ...common, actorRole: "provider", requestedCapability: "price_quote" })).toMatchObject({ allowed: false, reason: "PROFESSIONAL_AI_CAPABILITY_FORBIDDEN" });
  });

  it("keeps permitted MoveAI text non-authoritative and draft-only", () => {
    const result = createPolicyBoundMoveAiResponse({
      category: "plumbing",
      categoryLabel: "Tesisat",
      draftCreated: true,
    });
    const serialized = JSON.stringify(result).toLowerCase();

    expect(result.category).toBe("plumbing");
    expect(serialized).toContain("hizmet tasla");
    expect(serialized).not.toContain("fiyat");
    expect(serialized).not.toContain("ödeme");
    expect(serialized).not.toContain("garanti");
  });

  it("blocks every new marketplace transition for unknown, review-only, and payment-unready countries", () => {
    for (const transition of ["REQUEST_CREATION", "PROVIDER_ACTIVATION", "OPPORTUNITY_EXPOSURE", "OFFER_SUBMIT", "OFFER_ACCEPTANCE", "PAYMENT_INITIATION"] as const) {
      expect(countryMarketplaceTransitionBlockReason({ countryCode: null, gateStatus: null, paymentReady: false, transition }))
        .toBe(`COUNTRY_LAUNCH_GATE_BLOCKED:${transition}:COUNTRY_UNKNOWN`);
      expect(countryMarketplaceTransitionBlockReason({ countryCode: "TR", gateStatus: "ready", paymentReady: true, transition }))
        .toBe(`COUNTRY_LAUNCH_GATE_BLOCKED:${transition}:GATE_READY`);
      expect(countryMarketplaceTransitionBlockReason({ countryCode: "TR", gateStatus: "enabled", paymentReady: false, transition }))
        .toBe(`COUNTRY_LAUNCH_GATE_BLOCKED:${transition}:PAYMENT_NOT_READY`);
    }
  });

  it("never lets secrets or user contact data reach structured observability data", () => {
    const value = JSON.stringify(redactObservabilityData({
      webhookSecret: "scanner-secret-value",
      callbackSignature: "signature-value",
      email: "owner@example.test",
      nested: { phone: "+90 555 555 55 55", storageKey: "private/raw-storage-key" },
    }));

    expect(value).not.toContain("scanner-secret-value");
    expect(value).not.toContain("signature-value");
    expect(value).not.toContain("owner@example.test");
    expect(value).not.toContain("555 555");
    expect(value).not.toContain("private/raw-storage-key");
  });
});
