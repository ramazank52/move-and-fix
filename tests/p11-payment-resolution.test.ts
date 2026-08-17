import { describe, expect, it } from "vitest";
import { resolveGlobalPayment } from "../server/payments/GlobalPaymentResolver";
import { evaluateCompletionDisputeResolution } from "../server/payments/CompletionDisputeResolutionPolicy";

const readyDecision = { allowed: true, status: "operational" as const, reason: "ready" };

describe("P11 global payment and completion dispute resolution", () => {
  it("routes checkout only through a ready exact TR/TRY provider scope", () => {
    expect(resolveGlobalPayment({
      requestedProvider: "iyzico",
      countryCode: "tr",
      currency: "try",
      operationalDecision: readyDecision,
    })).toMatchObject({ allowed: true, countryCode: "TR", currency: "TRY", provider: "iyzico" });

    expect(resolveGlobalPayment({
      requestedProvider: "stripe",
      countryCode: "TR",
      currency: "USD",
      operationalDecision: readyDecision,
    })).toMatchObject({ allowed: false, reason: "GLOBAL_PAYMENT_SCOPE_UNSUPPORTED" });
  });

  it("fails closed when the exact payment provider scope is not operational", () => {
    expect(resolveGlobalPayment({
      requestedProvider: "iyzico",
      countryCode: "TR",
      currency: "TRY",
      operationalDecision: { allowed: false, status: "not_configured", reason: "missing" },
    })).toMatchObject({ allowed: false, reason: "GLOBAL_PAYMENT_PROVIDER_NOT_CONFIGURED" });
  });

  it("requires a documented human decision before provider escrow release", () => {
    expect(evaluateCompletionDisputeResolution({
      resolution: "provider",
      disputeStatus: "open",
      proofStatus: "disputed",
      paymentStatus: "held",
      reviewerUserId: 45,
      resolutionNote: "Kanıtlar incelendi ve işin tamamlandığı doğrulandı.",
      providerPayout: 9_000,
    })).toMatchObject({ allowed: true, action: "release_escrow" });

    expect(evaluateCompletionDisputeResolution({
      resolution: "provider",
      disputeStatus: "open",
      proofStatus: "disputed",
      paymentStatus: "held",
      reviewerUserId: null,
      resolutionNote: "Kanıtlar incelendi ve işin tamamlandığı doğrulandı.",
      providerPayout: 9_000,
    })).toMatchObject({ allowed: false, reason: "COMPLETION_DISPUTE_REVIEWER_REQUIRED" });
  });

  it("keeps customer-favoring settlement pending until a verified refund state exists", () => {
    expect(evaluateCompletionDisputeResolution({
      resolution: "customer",
      disputeStatus: "under_review",
      proofStatus: "disputed",
      paymentStatus: "held",
      reviewerUserId: 45,
      resolutionNote: "Müşteri kanıtları iade gerektirdiğini göstermektedir.",
      providerPayout: 9_000,
    })).toMatchObject({ allowed: true, action: "await_verified_refund" });

    expect(evaluateCompletionDisputeResolution({
      resolution: "customer",
      disputeStatus: "under_review",
      proofStatus: "disputed",
      paymentStatus: "refunded",
      reviewerUserId: 45,
      resolutionNote: "Müşteri kanıtları iade gerektirdiğini göstermektedir.",
      providerPayout: 9_000,
    })).toMatchObject({ allowed: true, action: "finalize_customer_refund" });
  });

  it("rejects unresolved financial state and insufficient rationale", () => {
    expect(evaluateCompletionDisputeResolution({
      resolution: "customer",
      disputeStatus: "open",
      proofStatus: "disputed",
      paymentStatus: "released",
      reviewerUserId: 45,
      resolutionNote: "kısa",
      providerPayout: 9_000,
    })).toMatchObject({ allowed: false, reason: "COMPLETION_DISPUTE_RATIONALE_REQUIRED" });
  });
});
