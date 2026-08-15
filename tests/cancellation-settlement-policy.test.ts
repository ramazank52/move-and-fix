import { describe, expect, it } from "vitest";

import { calculateCancellationSettlementPlan } from "../server/payments/policy";

describe("cancellation settlement plan", () => {
  it("tam iadede komisyon ve profesyonel ödemesini sıfırlar", () => {
    expect(
      calculateCancellationSettlementPlan({
        paymentAmount: 1_000,
        commissionRateBps: 1_000,
        settlementOutcome: "refund",
      }),
    ).toEqual({ refundAmount: 1_000, providerGrossAmount: 0, commissionAmount: 0, providerPayoutAmount: 0 });
  });

  it("kısmi iadede kalan held tutardan snapshot komisyonunu hesaplar", () => {
    expect(
      calculateCancellationSettlementPlan({
        paymentAmount: 1_000,
        commissionRateBps: 1_000,
        settlementOutcome: "partial_refund",
        refundAmount: 250,
      }),
    ).toEqual({ refundAmount: 250, providerGrossAmount: 750, commissionAmount: 75, providerPayoutAmount: 675 });
  });

  it("profesyonel ödemesinde ödeme snapshot komisyonunu korur", () => {
    expect(
      calculateCancellationSettlementPlan({
        paymentAmount: 999,
        commissionRateBps: 1_250,
        settlementOutcome: "provider_payable",
      }),
    ).toEqual({ refundAmount: 0, providerGrossAmount: 999, commissionAmount: 125, providerPayoutAmount: 874 });
  });

  it("kısmi iade için sıfır, tam tutar, kesir ve sınır dışı tutarı reddeder", () => {
    for (const refundAmount of [0, 1_000, 1_001, 12.5]) {
      expect(() =>
        calculateCancellationSettlementPlan({
          paymentAmount: 1_000,
          commissionRateBps: 1_000,
          settlementOutcome: "partial_refund",
          refundAmount,
        }),
      ).toThrow("CANCELLATION_REFUND_AMOUNT_INVALID");
    }
  });

  it("tam iade ve profesyonel ödeme kararlarına çelişkili iade girdisi eklenmesini reddeder", () => {
    expect(() =>
      calculateCancellationSettlementPlan({
        paymentAmount: 1_000,
        commissionRateBps: 1_000,
        settlementOutcome: "refund",
        refundAmount: 500,
      }),
    ).toThrow("CANCELLATION_REFUND_AMOUNT_INVALID");
  });
});
