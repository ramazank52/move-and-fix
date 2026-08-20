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

  it("approves only a whole-TRY, balanced partial settlement while escrow is held", () => {
    expect(evaluateCompletionDisputeResolution({
      resolution: "partial",
      disputeStatus: "under_review",
      proofStatus: "disputed",
      paymentStatus: "held",
      reviewerUserId: 45,
      resolutionNote: "Kanıtlar kısmi müşteri iadesi ve kısmi sağlayıcı ödemesi gerektiriyor.",
      providerPayout: 9_000,
      paymentAmount: 10_000,
      customerRefundAmount: 3_000,
      providerGrossAmount: 7_000,
      commissionAmount: 700,
      providerPayoutAmount: 6_300,
    })).toMatchObject({
      allowed: true,
      action: "partial_settlement",
      reason: "COMPLETION_DISPUTE_PARTIAL_SETTLEMENT_APPROVED",
    });
  });

  it("rejects partial settlement when the amount is fractional, negative, over-split or escrow is not held", () => {
    const input = {
      resolution: "partial" as const,
      disputeStatus: "under_review" as const,
      proofStatus: "disputed" as const,
      paymentStatus: "held" as const,
      reviewerUserId: 45,
      resolutionNote: "Kanıtlar kısmi müşteri iadesi ve kısmi sağlayıcı ödemesi gerektiriyor.",
      providerPayout: 9_000,
      paymentAmount: 10_000,
      customerRefundAmount: 3_000,
      providerGrossAmount: 7_000,
      commissionAmount: 700,
      providerPayoutAmount: 6_300,
    };
    expect(evaluateCompletionDisputeResolution({ ...input, customerRefundAmount: 3_000.5 }))
      .toMatchObject({ allowed: false, reason: "COMPLETION_DISPUTE_PARTIAL_AMOUNT_INVALID" });
    expect(evaluateCompletionDisputeResolution({ ...input, customerRefundAmount: -1, providerGrossAmount: 10_001 }))
      .toMatchObject({ allowed: false, reason: "COMPLETION_DISPUTE_PARTIAL_SPLIT_INVALID" });
    expect(evaluateCompletionDisputeResolution({ ...input, customerRefundAmount: 3_001, providerGrossAmount: 7_000 }))
      .toMatchObject({ allowed: false, reason: "COMPLETION_DISPUTE_PARTIAL_SPLIT_INVALID" });
    expect(evaluateCompletionDisputeResolution({ ...input, paymentStatus: "released" }))
      .toMatchObject({ allowed: false, reason: "COMPLETION_DISPUTE_PARTIAL_SETTLEMENT_REQUIRES_HELD_ESCROW" });
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
