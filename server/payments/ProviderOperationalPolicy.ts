export type PaymentProviderId = "iyzico" | "stripe";
export type PaymentProviderOperationalStatus =
  | "not_configured"
  | "regulatory_review"
  | "operational"
  | "suspended";

export interface PaymentProviderOperationalRecord {
  provider: PaymentProviderId;
  countryCode: string;
  currency: string;
  status: PaymentProviderOperationalStatus;
  configVersion: string;
  healthCheckedAt: Date | null;
  regulatoryReviewedAt: Date | null;
  nextReviewAt: Date | null;
  blockingReason: string | null;
}

export interface PaymentProviderOperationalDecision {
  allowed: boolean;
  status: PaymentProviderOperationalStatus;
  reason: string;
}

/**
 * Payment capability is intentionally closed unless an operator has recorded
 * both an operational health check and a jurisdiction review for the exact
 * provider/country/currency scope. A missing record is never treated as ready.
 */
export function decidePaymentProviderOperationalStatus(
  record: PaymentProviderOperationalRecord | null | undefined,
  now = new Date(),
): PaymentProviderOperationalDecision {
  if (!record) {
    return {
      allowed: false,
      status: "not_configured",
      reason: "Ödeme sağlayıcısı bu ülke ve para birimi için yapılandırılmamış",
    };
  }

  if (record.status !== "operational") {
    return {
      allowed: false,
      status: record.status,
      reason: record.blockingReason?.trim() || "Ödeme sağlayıcısı kullanıma açık değil",
    };
  }

  if (!record.healthCheckedAt || !record.regulatoryReviewedAt) {
    return {
      allowed: false,
      status: "regulatory_review",
      reason: "Sağlayıcı sağlık veya düzenleyici incelemesi eksik",
    };
  }

  if (record.nextReviewAt && record.nextReviewAt.getTime() <= now.getTime()) {
    return {
      allowed: false,
      status: "regulatory_review",
      reason: "Sağlayıcı düzenleyici incelemesi yenilenmelidir",
    };
  }

  return { allowed: true, status: "operational", reason: "Ödeme sağlayıcısı kullanıma hazır" };
}
