import { createRequire } from "module";
import Stripe from "stripe";

import * as db from "../db";
import { ENV } from "../_core/env";

const require = createRequire(import.meta.url);

export type ExternalPaymentState = "succeeded" | "refunded" | "pending" | "failed";
export type ExternalPaymentRecord = {
  externalReference: string;
  amount: number;
  currency: string;
  state: ExternalPaymentState;
};

export type ReconciliationResult = {
  runId: number;
  provider: db.FinancialReconciliationProvider;
  checkedCount: number;
  mismatchCount: number;
};

export class FinancialReconciliationError extends Error {
  constructor(
    public readonly code:
      | "FINANCIAL_RECONCILIATION_PROVIDER_NOT_CONFIGURED"
      | "FINANCIAL_RECONCILIATION_PROVIDER_RESPONSE_INVALID"
      | "FINANCIAL_RECONCILIATION_PROVIDER_REQUEST_FAILED",
    message: string,
  ) {
    super(message);
  }
}

function expectedExternalState(status: "pending" | "held" | "released" | "refunded"): ExternalPaymentState {
  if (status === "refunded") return "refunded";
  if (status === "held" || status === "released") return "succeeded";
  return "pending";
}

export function reconcilePaymentCandidate(
  candidate: db.ReconciliationPaymentCandidate,
  external: ExternalPaymentRecord,
) {
  const mismatches: Array<Record<string, unknown>> = [];
  if (external.externalReference !== candidate.gatewayPaymentId) {
    mismatches.push({ kind: "external_reference", expected: candidate.gatewayPaymentId, actual: external.externalReference });
  }
  if (external.amount !== candidate.amount) {
    mismatches.push({ kind: "amount", expected: candidate.amount, actual: external.amount });
  }
  if (external.currency.toUpperCase() !== "TRY") {
    mismatches.push({ kind: "currency", expected: "TRY", actual: external.currency });
  }
  const expectedState = expectedExternalState(candidate.status);
  if (external.state !== expectedState) {
    mismatches.push({ kind: "provider_state", expected: expectedState, actual: external.state });
  }
  for (const key of db.expectedLedgerIdempotencyKeysForPayment(candidate)) {
    if (!candidate.ledgerIdempotencyKeys.includes(key)) {
      mismatches.push({ kind: "ledger_entry_missing", expected: key });
    }
  }
  return mismatches;
}

type IyzicoPaymentClient = {
  payment: {
    retrieve(
      input: Record<string, string>,
      callback: (error: unknown, result: Record<string, unknown>) => void,
    ): void;
  };
};

async function retrieveStripePayment(externalReference: string): Promise<ExternalPaymentRecord> {
  if (!ENV.stripeSecretKey) {
    throw new FinancialReconciliationError(
      "FINANCIAL_RECONCILIATION_PROVIDER_NOT_CONFIGURED",
      "Stripe uzlaştırma için sunucu anahtarı yapılandırılmamış",
    );
  }
  try {
    const stripe = new Stripe(ENV.stripeSecretKey);
    const intent = await stripe.paymentIntents.retrieve(externalReference);
    const state: ExternalPaymentState = intent.status === "succeeded"
      ? "succeeded"
      : intent.status === "canceled"
        ? "failed"
        : "pending";
    return { externalReference: intent.id, amount: Math.trunc(intent.amount / 100), currency: intent.currency, state };
  } catch (error) {
    throw new FinancialReconciliationError(
      "FINANCIAL_RECONCILIATION_PROVIDER_REQUEST_FAILED",
      error instanceof Error ? `Stripe ödeme sorgusu başarısız: ${error.message}` : "Stripe ödeme sorgusu başarısız",
    );
  }
}

async function retrieveIyzicoPayment(externalReference: string): Promise<ExternalPaymentRecord> {
  if (!ENV.iyzicoApiKey || !ENV.iyzicoSecretKey) {
    throw new FinancialReconciliationError(
      "FINANCIAL_RECONCILIATION_PROVIDER_NOT_CONFIGURED",
      "iyzico uzlaştırma için sunucu anahtarları yapılandırılmamış",
    );
  }
  const Iyzico = require("iyzipay") as new (config: Record<string, string>) => IyzicoPaymentClient;
  const client = new Iyzico({ apiKey: ENV.iyzicoApiKey, secretKey: ENV.iyzicoSecretKey, uri: ENV.iyzicoBaseUrl });
  const response = await new Promise<Record<string, unknown>>((resolve, reject) => {
    client.payment.retrieve({ locale: "tr", paymentId: externalReference }, (error, result) => {
      if (error) reject(error);
      else resolve(result ?? {});
    });
  });
  const paidPrice = Number(response.paidPrice ?? response.price);
  const paymentId = typeof response.paymentId === "string" ? response.paymentId : externalReference;
  const status = String(response.status ?? "").toLowerCase();
  if (!Number.isSafeInteger(paidPrice) || paidPrice <= 0 || !paymentId) {
    throw new FinancialReconciliationError(
      "FINANCIAL_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
      "iyzico ödeme ayrıntısı geçerli bir tutar veya ödeme kimliği içermiyor",
    );
  }
  return {
    externalReference: paymentId,
    amount: paidPrice,
    currency: String(response.currency ?? "TRY"),
    state: status === "success" ? "succeeded" : "failed",
  };
}

export async function retrieveExternalPayment(
  provider: db.FinancialReconciliationProvider,
  externalReference: string,
) {
  return provider === "stripe"
    ? retrieveStripePayment(externalReference)
    : retrieveIyzicoPayment(externalReference);
}

/**
 * Reconciles settled gateway records to internal payment state and ledger posts.
 * A provider or transport failure marks the run failed; it never creates a
 * synthetic success, and detected mismatches are persisted as critical alerts.
 */
export async function runFinancialReconciliation(
  provider: db.FinancialReconciliationProvider,
  lookupExternalPayment = retrieveExternalPayment,
): Promise<ReconciliationResult> {
  const runId = await db.startFinancialReconciliationRun(provider);
  let checkedCount = 0;
  let mismatchCount = 0;
  try {
    const candidates = await db.getFinancialReconciliationCandidates(provider);
    for (const candidate of candidates) {
      const external = await lookupExternalPayment(provider, candidate.gatewayPaymentId);
      const mismatches = reconcilePaymentCandidate(candidate, external);
      checkedCount += 1;
      if (mismatches.length > 0) {
        mismatchCount += 1;
        await db.createFinancialReconciliationAlert({
          runId,
          paymentId: candidate.id,
          externalReference: candidate.gatewayPaymentId,
          details: { provider, paymentId: candidate.id, requestId: candidate.requestId, mismatches },
        });
      }
    }
    await db.completeFinancialReconciliationRun({ runId, checkedCount, mismatchCount });
    return { runId, provider, checkedCount, mismatchCount };
  } catch (error) {
    await db.completeFinancialReconciliationRun({
      runId,
      checkedCount,
      mismatchCount,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
