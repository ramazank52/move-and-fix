import { eq, inArray } from "drizzle-orm";

import {
  financialAccounts,
  financialLedgerEntries,
  financialLedgerLines,
  type FinancialAccount,
} from "../../drizzle/schema";

export const FINANCIAL_CURRENCY = "TRY" as const;

export type FinancialLedgerEventType =
  | "payment_pending"
  | "payment_succeeded"
  | "hold"
  | "commission"
  | "provider_payable"
  | "settlement"
  | "refund"
  | "partial_refund"
  | "dispute_hold"
  | "payout"
  | "failed_payout"
  | "reversal"
  | "chargeback"
  | "reimbursement"
  | "adjustment";

export type FinancialAccountType = "asset" | "liability" | "revenue" | "expense" | "equity";
export type FinancialLineDirection = "debit" | "credit";

export type LedgerLineInput = {
  accountCode: string;
  accountType: FinancialAccountType;
  ownerUserId?: number;
  direction: FinancialLineDirection;
  amount: number;
};

export type LedgerEntryInput = {
  eventType: FinancialLedgerEventType;
  paymentId?: number;
  requestId?: number;
  referenceType: string;
  referenceId: string;
  externalReference?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  lines: LedgerLineInput[];
};

type LedgerTransaction = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
};

const ACCOUNT = {
  gatewayClearing: "asset:gateway_clearing",
  escrow: (paymentId: number) => `liability:escrow:${paymentId}`,
  platformRevenue: "revenue:platform_commission",
  providerPayable: (providerId: number) => `liability:provider_payable:${providerId}`,
  payoutInTransit: (providerId: number) => `liability:payout_in_transit:${providerId}`,
} as const;

/** Validates the accounting invariant before any database write occurs. */
export function assertBalancedLedgerLines(lines: LedgerLineInput[]): void {
  if (lines.length < 2) throw new Error("FINANCIAL_LEDGER_MINIMUM_LINES_REQUIRED");

  let debits = 0;
  let credits = 0;
  for (const line of lines) {
    if (!line.accountCode || line.accountCode.length > 160) {
      throw new Error("FINANCIAL_LEDGER_ACCOUNT_INVALID");
    }
    if (!Number.isSafeInteger(line.amount) || line.amount <= 0) {
      throw new Error("FINANCIAL_LEDGER_AMOUNT_INVALID");
    }
    if (line.direction === "debit") debits += line.amount;
    else credits += line.amount;
  }
  if (debits !== credits) throw new Error("FINANCIAL_LEDGER_UNBALANCED");
}

async function ensureAccounts(
  tx: LedgerTransaction,
  lines: LedgerLineInput[],
): Promise<Map<string, FinancialAccount>> {
  const unique = [...new Map(lines.map((line) => [line.accountCode, line])).values()];
  const existing = unique.length
    ? await tx.select().from(financialAccounts).where(inArray(financialAccounts.code, unique.map((line) => line.accountCode)))
    : [];
  const accounts = new Map<string, FinancialAccount>(existing.map((account: FinancialAccount) => [account.code, account]));

  for (const line of unique) {
    if (accounts.has(line.accountCode)) continue;
    await tx
      .insert(financialAccounts)
      .values({
        code: line.accountCode,
        accountType: line.accountType,
        currency: FINANCIAL_CURRENCY,
        ownerUserId: line.ownerUserId ?? null,
      })
      .onDuplicateKeyUpdate({ set: { code: line.accountCode } });
  }

  const resolved = await tx
    .select()
    .from(financialAccounts)
    .where(inArray(financialAccounts.code, unique.map((line) => line.accountCode)));
  return new Map(resolved.map((account: FinancialAccount) => [account.code, account]));
}

/**
 * Posts a single immutable journal entry. Call this from the same transaction
 * as the payment state transition; duplicate event delivery becomes a no-op.
 */
export async function postFinancialLedgerEntry(
  tx: LedgerTransaction,
  input: LedgerEntryInput,
): Promise<{ entryId: number; duplicated: boolean }> {
  assertBalancedLedgerLines(input.lines);
  if (!input.idempotencyKey || input.idempotencyKey.length > 191) {
    throw new Error("FINANCIAL_LEDGER_IDEMPOTENCY_KEY_INVALID");
  }

  const existing = await tx
    .select()
    .from(financialLedgerEntries)
    .where(eq(financialLedgerEntries.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing[0]) return { entryId: existing[0].id, duplicated: true };

  const accounts = await ensureAccounts(tx, input.lines);
  if (accounts.size !== new Set(input.lines.map((line) => line.accountCode)).size) {
    throw new Error("FINANCIAL_LEDGER_ACCOUNT_RESOLUTION_FAILED");
  }

  const created = await tx.insert(financialLedgerEntries).values({
    eventType: input.eventType,
    paymentId: input.paymentId ?? null,
    requestId: input.requestId ?? null,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    externalReference: input.externalReference ?? null,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
  const entryId = Number(created[0].insertId);
  if (!entryId) throw new Error("FINANCIAL_LEDGER_ENTRY_CREATE_FAILED");

  await tx.insert(financialLedgerLines).values(
    input.lines.map((line) => ({
      entryId,
      accountId: accounts.get(line.accountCode)!.id,
      direction: line.direction,
      amount: line.amount,
      currency: FINANCIAL_CURRENCY,
    })),
  );

  return { entryId, duplicated: false };
}

type EscrowPayment = {
  id: number;
  requestId: number;
  providerId: number;
  amount: number;
  commissionAmount: number | null;
  providerPayout: number | null;
  gatewayPaymentId: string | null;
};

function breakdown(payment: EscrowPayment) {
  const commission = payment.commissionAmount ?? 0;
  const providerPayout = payment.providerPayout ?? payment.amount - commission;
  if (commission < 0 || providerPayout < 0 || commission + providerPayout !== payment.amount) {
    throw new Error("FINANCIAL_LEDGER_PAYMENT_BREAKDOWN_INVALID");
  }
  return { commission, providerPayout };
}

export function buildPaymentHeldLedgerEntry(payment: EscrowPayment): LedgerEntryInput {
  return {
    eventType: "payment_succeeded",
    paymentId: payment.id,
    requestId: payment.requestId,
    referenceType: "payment",
    referenceId: String(payment.id),
    externalReference: payment.gatewayPaymentId ?? undefined,
    idempotencyKey: `ledger:payment:${payment.id}:held`,
    metadata: { state: "held", currency: FINANCIAL_CURRENCY },
    lines: [
      { accountCode: ACCOUNT.gatewayClearing, accountType: "asset", direction: "debit", amount: payment.amount },
      { accountCode: ACCOUNT.escrow(payment.id), accountType: "liability", direction: "credit", amount: payment.amount },
    ],
  };
}

export function buildEscrowReleasedLedgerEntry(payment: EscrowPayment): LedgerEntryInput {
  const { commission, providerPayout } = breakdown(payment);
  const lines: LedgerLineInput[] = [
    { accountCode: ACCOUNT.escrow(payment.id), accountType: "liability", direction: "debit", amount: payment.amount },
  ];
  if (commission > 0) {
    lines.push({ accountCode: ACCOUNT.platformRevenue, accountType: "revenue", direction: "credit", amount: commission });
  }
  if (providerPayout > 0) {
    lines.push({
      accountCode: ACCOUNT.providerPayable(payment.providerId),
      accountType: "liability",
      ownerUserId: payment.providerId,
      direction: "credit",
      amount: providerPayout,
    });
  }
  return {
    eventType: "settlement",
    paymentId: payment.id,
    requestId: payment.requestId,
    referenceType: "payment",
    referenceId: String(payment.id),
    externalReference: payment.gatewayPaymentId ?? undefined,
    idempotencyKey: `ledger:payment:${payment.id}:released`,
    metadata: { state: "released", currency: FINANCIAL_CURRENCY, commission, providerPayout },
    lines,
  };
}

export function buildRefundLedgerEntry(payment: EscrowPayment): LedgerEntryInput {
  return {
    eventType: "refund",
    paymentId: payment.id,
    requestId: payment.requestId,
    referenceType: "payment",
    referenceId: String(payment.id),
    externalReference: payment.gatewayPaymentId ?? undefined,
    idempotencyKey: `ledger:payment:${payment.id}:refunded`,
    metadata: { state: "refunded", currency: FINANCIAL_CURRENCY },
    lines: [
      { accountCode: ACCOUNT.escrow(payment.id), accountType: "liability", direction: "debit", amount: payment.amount },
      { accountCode: ACCOUNT.gatewayClearing, accountType: "asset", direction: "credit", amount: payment.amount },
    ],
  };
}

/**
 * A verified gateway refund may settle only a portion of the held escrow.
 * The refund and the remaining provider settlement are deliberately separate
 * journal entries: each is balanced and independently idempotent.
 */
export function buildCancellationPartialRefundLedgerEntry(
  payment: EscrowPayment,
  input: { refundAmount: number; gatewayReference: string },
): LedgerEntryInput {
  if (!Number.isSafeInteger(input.refundAmount) || input.refundAmount <= 0 || input.refundAmount >= payment.amount) {
    throw new Error("FINANCIAL_LEDGER_PARTIAL_REFUND_AMOUNT_INVALID");
  }
  return {
    eventType: "partial_refund",
    paymentId: payment.id,
    requestId: payment.requestId,
    referenceType: "cancellation_refund",
    referenceId: input.gatewayReference,
    externalReference: input.gatewayReference,
    idempotencyKey: `ledger:payment:${payment.id}:partial-refund:${input.gatewayReference}`,
    metadata: { state: "partial_refund", currency: FINANCIAL_CURRENCY, refundAmount: input.refundAmount },
    lines: [
      { accountCode: ACCOUNT.escrow(payment.id), accountType: "liability", direction: "debit", amount: input.refundAmount },
      { accountCode: ACCOUNT.gatewayClearing, accountType: "asset", direction: "credit", amount: input.refundAmount },
    ],
  };
}

export function buildCancellationProviderSettlementLedgerEntry(
  payment: EscrowPayment,
  input: { providerGrossAmount: number; commissionAmount: number; providerPayoutAmount: number; gatewayReference: string },
): LedgerEntryInput {
  const { providerGrossAmount, commissionAmount, providerPayoutAmount } = input;
  if (
    !Number.isSafeInteger(providerGrossAmount) ||
    !Number.isSafeInteger(commissionAmount) ||
    !Number.isSafeInteger(providerPayoutAmount) ||
    providerGrossAmount <= 0 ||
    commissionAmount < 0 ||
    providerPayoutAmount < 0 ||
    commissionAmount + providerPayoutAmount !== providerGrossAmount
  ) {
    throw new Error("FINANCIAL_LEDGER_CANCELLATION_SETTLEMENT_INVALID");
  }
  const lines: LedgerLineInput[] = [
    { accountCode: ACCOUNT.escrow(payment.id), accountType: "liability", direction: "debit", amount: providerGrossAmount },
  ];
  if (commissionAmount > 0) {
    lines.push({ accountCode: ACCOUNT.platformRevenue, accountType: "revenue", direction: "credit", amount: commissionAmount });
  }
  if (providerPayoutAmount > 0) {
    lines.push({
      accountCode: ACCOUNT.providerPayable(payment.providerId),
      accountType: "liability",
      ownerUserId: payment.providerId,
      direction: "credit",
      amount: providerPayoutAmount,
    });
  }
  return {
    eventType: "settlement",
    paymentId: payment.id,
    requestId: payment.requestId,
    referenceType: "cancellation_settlement",
    referenceId: input.gatewayReference,
    externalReference: input.gatewayReference,
    idempotencyKey: `ledger:payment:${payment.id}:cancellation-settlement:${input.gatewayReference}`,
    metadata: {
      state: "cancellation_settlement",
      currency: FINANCIAL_CURRENCY,
      providerGrossAmount,
      commissionAmount,
      providerPayoutAmount,
    },
    lines,
  };
}

/**
 * Completion-dispute partial resolution has its own references and immutable
 * idempotency keys. It intentionally never reuses cancellation reference types.
 */
export function buildCompletionDisputePartialRefundLedgerEntry(
  payment: EscrowPayment,
  input: { disputeId: number; refundAmount: number; gatewayReference: string },
): LedgerEntryInput {
  if (!Number.isSafeInteger(input.refundAmount) || input.refundAmount <= 0 || input.refundAmount >= payment.amount) {
    throw new Error("FINANCIAL_LEDGER_COMPLETION_DISPUTE_PARTIAL_REFUND_INVALID");
  }
  return {
    eventType: "partial_refund",
    paymentId: payment.id,
    requestId: payment.requestId,
    referenceType: "completion_dispute_partial_refund",
    referenceId: String(input.disputeId),
    externalReference: input.gatewayReference,
    idempotencyKey: `ledger:payment:${payment.id}:completion-dispute:${input.disputeId}:partial-refund`,
    metadata: {
      state: "completion_dispute_partial_refund",
      currency: FINANCIAL_CURRENCY,
      disputeId: input.disputeId,
      refundAmount: input.refundAmount,
    },
    lines: [
      { accountCode: ACCOUNT.escrow(payment.id), accountType: "liability", direction: "debit", amount: input.refundAmount },
      { accountCode: ACCOUNT.gatewayClearing, accountType: "asset", direction: "credit", amount: input.refundAmount },
    ],
  };
}

export function buildCompletionDisputeProviderSettlementLedgerEntry(
  payment: EscrowPayment,
  input: {
    disputeId: number;
    providerGrossAmount: number;
    commissionAmount: number;
    providerPayoutAmount: number;
    gatewayReference: string;
  },
): LedgerEntryInput {
  const { providerGrossAmount, commissionAmount, providerPayoutAmount } = input;
  if (
    !Number.isSafeInteger(providerGrossAmount) ||
    !Number.isSafeInteger(commissionAmount) ||
    !Number.isSafeInteger(providerPayoutAmount) ||
    providerGrossAmount <= 0 ||
    commissionAmount < 0 ||
    providerPayoutAmount < 0 ||
    commissionAmount + providerPayoutAmount !== providerGrossAmount
  ) {
    throw new Error("FINANCIAL_LEDGER_COMPLETION_DISPUTE_SETTLEMENT_INVALID");
  }
  const lines: LedgerLineInput[] = [
    { accountCode: ACCOUNT.escrow(payment.id), accountType: "liability", direction: "debit", amount: providerGrossAmount },
  ];
  if (commissionAmount > 0) {
    lines.push({ accountCode: ACCOUNT.platformRevenue, accountType: "revenue", direction: "credit", amount: commissionAmount });
  }
  if (providerPayoutAmount > 0) {
    lines.push({
      accountCode: ACCOUNT.providerPayable(payment.providerId),
      accountType: "liability",
      ownerUserId: payment.providerId,
      direction: "credit",
      amount: providerPayoutAmount,
    });
  }
  return {
    eventType: "settlement",
    paymentId: payment.id,
    requestId: payment.requestId,
    referenceType: "completion_dispute_partial_settlement",
    referenceId: String(input.disputeId),
    externalReference: input.gatewayReference,
    idempotencyKey: `ledger:payment:${payment.id}:completion-dispute:${input.disputeId}:provider-settlement`,
    metadata: {
      state: "completion_dispute_partial_settlement",
      currency: FINANCIAL_CURRENCY,
      disputeId: input.disputeId,
      providerGrossAmount,
      commissionAmount,
      providerPayoutAmount,
    },
    lines,
  };
}

export { ACCOUNT as FINANCIAL_LEDGER_ACCOUNTS };
