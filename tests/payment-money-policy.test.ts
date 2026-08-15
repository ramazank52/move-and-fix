import { describe, expect, it } from "vitest";

import {
  MONETARY_UNIT,
  calculatePaymentBreakdown,
} from "../server/payments/policy";

describe("Move&Fix para birimi sözleşmesi", () => {
  it("tam TRY muhasebe birimini ve deterministik komisyon hesabını korur", () => {
    expect(MONETARY_UNIT).toBe("whole_try");
    expect(calculatePaymentBreakdown(1_001, 1_000)).toEqual({
      amount: 1_001,
      commissionRateBps: 1_000,
      commissionAmount: 100,
      providerPayout: 901,
    });
  });

  it("kuruş/floating-point tutarlarını ve geçersiz komisyonları fail-closed reddeder", () => {
    expect(() => calculatePaymentBreakdown(100.5, 1_000)).toThrow("PAYMENT_INVALID_AMOUNT");
    expect(() => calculatePaymentBreakdown(100, 10_001)).toThrow("PAYMENT_INVALID_COMMISSION");
  });
});
