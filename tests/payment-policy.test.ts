import { describe, expect, it } from "vitest";

import {
  PREMIUM_COMMISSION_RATE_BPS,
  STANDARD_COMMISSION_RATE_BPS,
  assertPaymentStatusTransition,
  calculatePaymentBreakdown,
  canTransitionPaymentStatus,
  commissionRateForProvider,
} from "../server/payments/policy";

describe("payment policy", () => {
  it("calculates standard commission and provider payout in integer minor units", () => {
    expect(calculatePaymentBreakdown(1_000, STANDARD_COMMISSION_RATE_BPS)).toEqual({
      amount: 1_000,
      commissionRateBps: 1_000,
      commissionAmount: 100,
      providerPayout: 900,
    });
  });

  it("uses the premium commission rate only from server-side provider state", () => {
    expect(commissionRateForProvider(false)).toBe(STANDARD_COMMISSION_RATE_BPS);
    expect(commissionRateForProvider(true)).toBe(PREMIUM_COMMISSION_RATE_BPS);
  });

  it("rounds commission once and preserves the exact total", () => {
    const result = calculatePaymentBreakdown(999, STANDARD_COMMISSION_RATE_BPS);
    expect(result.commissionAmount).toBe(100);
    expect(result.providerPayout + result.commissionAmount).toBe(result.amount);
  });

  it.each([0, -1, 12.5, Number.NaN])("rejects invalid amounts: %s", (amount) => {
    expect(() => calculatePaymentBreakdown(amount, STANDARD_COMMISSION_RATE_BPS)).toThrow("PAYMENT_INVALID_AMOUNT");
  });

  it("allows only forward escrow lifecycle transitions", () => {
    expect(canTransitionPaymentStatus("pending", "held")).toBe(true);
    expect(canTransitionPaymentStatus("held", "released")).toBe(true);
    expect(canTransitionPaymentStatus("held", "refunded")).toBe(true);
    expect(canTransitionPaymentStatus("released", "refunded")).toBe(false);
    expect(canTransitionPaymentStatus("refunded", "held")).toBe(false);
  });

  it("rejects duplicate and backward status changes", () => {
    expect(() => assertPaymentStatusTransition("pending", "pending")).toThrow("PAYMENT_INVALID_TRANSITION");
    expect(() => assertPaymentStatusTransition("released", "held")).toThrow("PAYMENT_INVALID_TRANSITION");
  });
});
