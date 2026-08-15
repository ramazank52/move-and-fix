export type EscrowPaymentStatus = "pending" | "held" | "released" | "refunded";

/**
 * Move&Fix'in mevcut muhasebe sözleşmesi: veritabanında ve domain katmanında
 * tutarlar tam TRY cinsindedir (ör. 125 = ₺125). Ürün şu an kuruşlu fiyatı
 * kabul etmez; gateway adaptörleri sağlayıcının minor-unit gereksinimini
 * sınırda dönüştürür. Kuruş desteği eklenirse bu sözleşme tek bir migration
 * ile uçtan uca değiştirilmelidir.
 */
export const MONETARY_UNIT = "whole_try" as const;

// Ürün sözleşmesi: standart ve premium profesyonel işlemlerinde platform komisyonu %10'dur.
export const STANDARD_COMMISSION_RATE_BPS = 1_000;
export const PREMIUM_COMMISSION_RATE_BPS = 1_000;

export function calculatePaymentBreakdown(amount: number, commissionRateBps: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("PAYMENT_INVALID_AMOUNT");
  }
  if (!Number.isInteger(commissionRateBps) || commissionRateBps < 0 || commissionRateBps > 10_000) {
    throw new Error("PAYMENT_INVALID_COMMISSION");
  }

  const commissionAmount = Math.round((amount * commissionRateBps) / 10_000);
  return {
    amount,
    commissionRateBps,
    commissionAmount,
    providerPayout: amount - commissionAmount,
  };
}

export type CancellationSettlementOutcome = "refund" | "partial_refund" | "provider_payable";

/**
 * İnsan incelemesinin immutable held ödeme üzerinden ürettiği settlement planı.
 * Gateway iadesi ve immutable defter hareketi bu planı ancak doğrulanmış
 * sağlayıcı callback'i sonrasında uygular.
 */
export function calculateCancellationSettlementPlan(input: {
  paymentAmount: number;
  commissionRateBps: number;
  settlementOutcome: CancellationSettlementOutcome;
  refundAmount?: number;
}) {
  if (!Number.isSafeInteger(input.paymentAmount) || input.paymentAmount <= 0) {
    throw new Error("CANCELLATION_PAYMENT_AMOUNT_INVALID");
  }

  const refundAmount =
    input.settlementOutcome === "refund"
      ? input.paymentAmount
      : input.settlementOutcome === "provider_payable"
        ? 0
        : input.refundAmount;
  if (
    refundAmount === undefined ||
    !Number.isSafeInteger(refundAmount) ||
    refundAmount < 0 ||
    refundAmount > input.paymentAmount ||
    (input.settlementOutcome === "partial_refund" && (refundAmount <= 0 || refundAmount >= input.paymentAmount)) ||
    (input.settlementOutcome !== "partial_refund" && input.refundAmount !== undefined && input.refundAmount !== refundAmount)
  ) {
    throw new Error("CANCELLATION_REFUND_AMOUNT_INVALID");
  }

  const providerGrossAmount = input.paymentAmount - refundAmount;
  const breakdown =
    providerGrossAmount === 0
      ? { commissionAmount: 0, providerPayout: 0 }
      : calculatePaymentBreakdown(providerGrossAmount, input.commissionRateBps);
  return {
    refundAmount,
    providerGrossAmount,
    commissionAmount: breakdown.commissionAmount,
    providerPayoutAmount: breakdown.providerPayout,
  };
}

export function commissionRateForProvider(isPremium: boolean) {
  return isPremium ? PREMIUM_COMMISSION_RATE_BPS : STANDARD_COMMISSION_RATE_BPS;
}

const allowedTransitions: Record<EscrowPaymentStatus, readonly EscrowPaymentStatus[]> = {
  pending: ["held", "refunded"],
  held: ["released", "refunded"],
  released: [],
  refunded: [],
};

export function canTransitionPaymentStatus(
  current: EscrowPaymentStatus,
  next: EscrowPaymentStatus,
) {
  return allowedTransitions[current].includes(next);
}

export function assertPaymentStatusTransition(
  current: EscrowPaymentStatus,
  next: EscrowPaymentStatus,
) {
  if (!canTransitionPaymentStatus(current, next)) {
    throw new Error(`PAYMENT_INVALID_TRANSITION:${current}:${next}`);
  }
}
