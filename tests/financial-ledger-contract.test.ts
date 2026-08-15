import { describe, expect, it } from "vitest";

import {
  assertBalancedLedgerLines,
  buildEscrowReleasedLedgerEntry,
  buildPaymentHeldLedgerEntry,
  buildRefundLedgerEntry,
} from "../server/payments/FinancialLedgerService";

const payment = {
  id: 41,
  requestId: 73,
  providerId: 19,
  amount: 1_001,
  commissionAmount: 100,
  providerPayout: 901,
  gatewayPaymentId: "gateway-payment-41",
};

describe("immutable financial ledger contract", () => {
  it("records a verified gateway collection as a balanced held escrow event", () => {
    const entry = buildPaymentHeldLedgerEntry(payment);

    expect(entry.idempotencyKey).toBe("ledger:payment:41:held");
    expect(entry.externalReference).toBe("gateway-payment-41");
    expect(entry.lines).toEqual([
      expect.objectContaining({ accountCode: "asset:gateway_clearing", direction: "debit", amount: 1_001 }),
      expect.objectContaining({ accountCode: "liability:escrow:41", direction: "credit", amount: 1_001 }),
    ]);
    expect(() => assertBalancedLedgerLines(entry.lines)).not.toThrow();
  });

  it("splits released escrow into platform revenue and provider payable without changing total value", () => {
    const entry = buildEscrowReleasedLedgerEntry(payment);

    expect(entry.idempotencyKey).toBe("ledger:payment:41:released");
    expect(entry.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountCode: "liability:escrow:41", direction: "debit", amount: 1_001 }),
      expect.objectContaining({ accountCode: "revenue:platform_commission", direction: "credit", amount: 100 }),
      expect.objectContaining({ accountCode: "liability:provider_payable:19", direction: "credit", amount: 901, ownerUserId: 19 }),
    ]));
    expect(() => assertBalancedLedgerLines(entry.lines)).not.toThrow();
  });

  it("refunds held escrow back to gateway clearing through a balanced reversal entry", () => {
    const entry = buildRefundLedgerEntry(payment);

    expect(entry.idempotencyKey).toBe("ledger:payment:41:refunded");
    expect(entry.lines).toEqual([
      expect.objectContaining({ accountCode: "liability:escrow:41", direction: "debit", amount: 1_001 }),
      expect.objectContaining({ accountCode: "asset:gateway_clearing", direction: "credit", amount: 1_001 }),
    ]);
    expect(() => assertBalancedLedgerLines(entry.lines)).not.toThrow();
  });

  it("rejects unbalanced, non-positive and malformed financial lines before storage", () => {
    expect(() => assertBalancedLedgerLines([
      { accountCode: "asset:test", accountType: "asset", direction: "debit", amount: 100 },
      { accountCode: "liability:test", accountType: "liability", direction: "credit", amount: 99 },
    ])).toThrow("FINANCIAL_LEDGER_UNBALANCED");

    expect(() => assertBalancedLedgerLines([
      { accountCode: "asset:test", accountType: "asset", direction: "debit", amount: 0 },
      { accountCode: "liability:test", accountType: "liability", direction: "credit", amount: 0 },
    ])).toThrow("FINANCIAL_LEDGER_AMOUNT_INVALID");
  });

  it("rejects a payment whose persisted payout split does not equal the held amount", () => {
    expect(() => buildEscrowReleasedLedgerEntry({ ...payment, providerPayout: 900 }))
      .toThrow("FINANCIAL_LEDGER_PAYMENT_BREAKDOWN_INVALID");
  });
});
