export type EscrowPaymentStatus = "pending" | "held" | "released" | "refunded";

export const STANDARD_COMMISSION_RATE_BPS = 1_500;
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
