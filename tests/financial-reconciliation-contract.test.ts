import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    startFinancialReconciliationRun: vi.fn(),
    getFinancialReconciliationCandidates: vi.fn(),
    createFinancialReconciliationAlert: vi.fn(),
    completeFinancialReconciliationRun: vi.fn(),
  };
});

import * as db from "../server/db";
import {
  FinancialReconciliationError,
  reconcilePaymentCandidate,
  runFinancialReconciliation,
} from "../server/payments/FinancialReconciliationService";

const candidate = {
  id: 91,
  requestId: 44,
  amount: 1_250,
  status: "released" as const,
  gatewayProvider: "stripe" as const,
  gatewayPaymentId: "pi_91",
  ledgerIdempotencyKeys: ["payment:91:hold", "payment:91:release"],
};

describe("financial reconciliation contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.startFinancialReconciliationRun).mockResolvedValue(7001);
    vi.mocked(db.completeFinancialReconciliationRun).mockResolvedValue();
  });

  it("detects altered provider amount, currency, status and missing ledger posts", () => {
    const mismatches = reconcilePaymentCandidate(candidate, {
      externalReference: "pi_91",
      amount: 1_251,
      currency: "USD",
      state: "pending",
    });

    expect(mismatches.map((item) => item.kind)).toEqual(expect.arrayContaining([
      "amount",
      "currency",
      "provider_state",
      "ledger_entry_missing",
    ]));
  });

  it("persists a critical reconciliation alert instead of treating a mismatch as success", async () => {
    vi.mocked(db.getFinancialReconciliationCandidates).mockResolvedValue([
      { ...candidate, ledgerIdempotencyKeys: ["payment:91:hold"] },
    ] as never);

    const result = await runFinancialReconciliation("stripe", async () => ({
      externalReference: "pi_91",
      amount: 1_250,
      currency: "TRY",
      state: "succeeded",
    }));

    expect(result).toEqual({ runId: 7001, provider: "stripe", checkedCount: 1, mismatchCount: 1 });
    expect(db.createFinancialReconciliationAlert).toHaveBeenCalledWith(expect.objectContaining({
      runId: 7001,
      paymentId: 91,
      externalReference: "pi_91",
    }));
    expect(db.completeFinancialReconciliationRun).toHaveBeenCalledWith({
      runId: 7001,
      checkedCount: 1,
      mismatchCount: 1,
    });
  });

  it("marks the run failed and propagates a missing-provider-credential blocker", async () => {
    vi.mocked(db.getFinancialReconciliationCandidates).mockResolvedValue([candidate] as never);
    const blocker = new FinancialReconciliationError(
      "FINANCIAL_RECONCILIATION_PROVIDER_NOT_CONFIGURED",
      "Gateway credential missing",
    );

    await expect(runFinancialReconciliation("stripe", async () => { throw blocker; })).rejects.toBe(blocker);
    expect(db.createFinancialReconciliationAlert).not.toHaveBeenCalled();
    expect(db.completeFinancialReconciliationRun).toHaveBeenCalledWith(expect.objectContaining({
      runId: 7001,
      checkedCount: 0,
      mismatchCount: 0,
      error: "Gateway credential missing",
    }));
  });
});
