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
