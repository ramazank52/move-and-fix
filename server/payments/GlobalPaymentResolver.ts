import type { PaymentProviderId, PaymentProviderOperationalDecision } from "./ProviderOperationalPolicy";

export type GlobalPaymentResolution = {
  allowed: boolean;
  provider: PaymentProviderId;
  countryCode: string;
  currency: string;
  reason: string;
};

/** Server-authoritative gateway routing; unsupported settlement scopes remain closed. */
export function resolveGlobalPayment(input: {
  requestedProvider: PaymentProviderId;
  countryCode: string;
  currency: string;
  operationalDecision: PaymentProviderOperationalDecision;
}): GlobalPaymentResolution {
  const countryCode = input.countryCode.trim().toUpperCase();
  const currency = input.currency.trim().toUpperCase();
  if (countryCode !== "TR" || currency !== "TRY") {
    return { allowed: false, provider: input.requestedProvider, countryCode, currency, reason: "GLOBAL_PAYMENT_SCOPE_UNSUPPORTED" };
  }
  if (!input.operationalDecision.allowed) {
    return {
      allowed: false,
      provider: input.requestedProvider,
      countryCode,
      currency,
      reason: `GLOBAL_PAYMENT_PROVIDER_${input.operationalDecision.status.toUpperCase()}`,
    };
  }
  return { allowed: true, provider: input.requestedProvider, countryCode, currency, reason: "GLOBAL_PAYMENT_ROUTE_READY" };
}

export function assertGlobalPaymentResolution(input: Parameters<typeof resolveGlobalPayment>[0]) {
  const resolution = resolveGlobalPayment(input);
  if (!resolution.allowed) throw new Error(resolution.reason);
  return resolution;
}
