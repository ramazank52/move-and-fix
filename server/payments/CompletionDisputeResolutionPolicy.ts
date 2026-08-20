export type CompletionDisputeResolutionAction =
  | "release_escrow"
  | "await_verified_refund"
  | "finalize_customer_refund"
  | "partial_settlement";

export type CompletionDisputeResolutionDecision = {
  allowed: boolean;
  action: CompletionDisputeResolutionAction | null;
  reason: string;
};

/** A human decision never creates a payment; verified gateway state remains authoritative. */
export function evaluateCompletionDisputeResolution(input: {
  resolution: "customer" | "provider" | "partial";
  disputeStatus: "open" | "under_review" | "resolved_customer" | "resolved_provider" | "resolved_partial";
  proofStatus: "disputed";
  paymentStatus: "pending" | "held" | "released" | "refunded";
  reviewerUserId: number | null | undefined;
  resolutionNote: string;
  providerPayout: number | null;
  paymentAmount?: number;
  customerRefundAmount?: number;
  providerGrossAmount?: number;
  commissionAmount?: number;
  providerPayoutAmount?: number;
}): CompletionDisputeResolutionDecision {
  if (!input.reviewerUserId || !Number.isSafeInteger(input.reviewerUserId) || input.reviewerUserId <= 0) {
    return { allowed: false, action: null, reason: "COMPLETION_DISPUTE_REVIEWER_REQUIRED" };
  }
  if (input.proofStatus !== "disputed" || !["open", "under_review"].includes(input.disputeStatus)) {
    return { allowed: false, action: null, reason: "COMPLETION_DISPUTE_STATE_INVALID" };
  }
  if (input.resolutionNote.trim().length < 10) {
    return { allowed: false, action: null, reason: "COMPLETION_DISPUTE_RATIONALE_REQUIRED" };
  }
  if (input.resolution === "provider") {
    if (
      input.paymentStatus !== "held" ||
      input.providerPayout === null ||
      !Number.isSafeInteger(input.providerPayout) ||
      input.providerPayout < 0
    ) {
      return { allowed: false, action: null, reason: "COMPLETION_DISPUTE_PROVIDER_SETTLEMENT_INVALID" };
    }
    return { allowed: true, action: "release_escrow", reason: "COMPLETION_DISPUTE_PROVIDER_SETTLEMENT_APPROVED" };
  }
  if (input.resolution === "partial") {
    if (input.paymentStatus !== "held") {
      return { allowed: false, action: null, reason: "COMPLETION_DISPUTE_PARTIAL_SETTLEMENT_REQUIRES_HELD_ESCROW" };
    }
    const values = [
      input.paymentAmount,
      input.customerRefundAmount,
      input.providerGrossAmount,
      input.commissionAmount,
      input.providerPayoutAmount,
    ];
    if (!values.every((value) => Number.isSafeInteger(value))) {
      return { allowed: false, action: null, reason: "COMPLETION_DISPUTE_PARTIAL_AMOUNT_INVALID" };
    }
    const paymentAmount = input.paymentAmount!;
    const customerRefundAmount = input.customerRefundAmount!;
    const providerGrossAmount = input.providerGrossAmount!;
    const commissionAmount = input.commissionAmount!;
    const providerPayoutAmount = input.providerPayoutAmount!;
    if (
      paymentAmount <= 0 ||
      customerRefundAmount <= 0 ||
      providerGrossAmount <= 0 ||
      commissionAmount < 0 ||
      providerPayoutAmount < 0 ||
      customerRefundAmount + providerGrossAmount !== paymentAmount ||
      commissionAmount + providerPayoutAmount !== providerGrossAmount
    ) {
      return { allowed: false, action: null, reason: "COMPLETION_DISPUTE_PARTIAL_SPLIT_INVALID" };
    }
    return {
      allowed: true,
      action: "partial_settlement",
      reason: "COMPLETION_DISPUTE_PARTIAL_SETTLEMENT_APPROVED",
    };
  }
  if (input.paymentStatus === "held") {
    return { allowed: true, action: "await_verified_refund", reason: "COMPLETION_DISPUTE_CUSTOMER_REFUND_PENDING" };
  }
  if (input.paymentStatus === "refunded" && input.disputeStatus === "under_review") {
    return { allowed: true, action: "finalize_customer_refund", reason: "COMPLETION_DISPUTE_CUSTOMER_REFUND_VERIFIED" };
  }
  return { allowed: false, action: null, reason: "COMPLETION_DISPUTE_CUSTOMER_REFUND_INVALID" };
}
