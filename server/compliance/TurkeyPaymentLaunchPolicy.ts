import {
  decidePaymentProviderOperationalStatus,
  type PaymentProviderOperationalRecord,
} from "../payments/ProviderOperationalPolicy";

export type TurkeyPaymentProvider = "iyzico" | "stripe";

export type TurkeyPaymentLaunchCandidate = Pick<
  PaymentProviderOperationalRecord,
  | "provider"
  | "countryCode"
  | "currency"
  | "status"
  | "configVersion"
  | "healthCheckedAt"
  | "regulatoryReviewedAt"
  | "nextReviewAt"
  | "blockingReason"
> & {
  configured: boolean;
};

export type TurkeyPaymentLaunchReadiness = {
  ready: boolean;
  eligibleProviders: TurkeyPaymentProvider[];
  blockers: string[];
};

/**
 * A Turkish marketplace may be published only if an exact TR/TRY provider
 * scope is operational *and* its runtime credentials are available. The
 * operator checklist is evidence, not an authorization bypass.
 */
export function evaluateTurkeyPaymentLaunchReadiness(input: {
  countryCode: string;
  currency: string;
  candidates: TurkeyPaymentLaunchCandidate[];
  now?: Date;
}): TurkeyPaymentLaunchReadiness {
  const countryCode = input.countryCode.trim().toUpperCase();
  const currency = input.currency.trim().toUpperCase();
  if (countryCode !== "TR" || currency !== "TRY") {
    return { ready: true, eligibleProviders: [], blockers: [] };
  }

  const scoped = input.candidates.filter(
    (candidate) =>
      candidate.countryCode.trim().toUpperCase() === "TR" &&
      candidate.currency.trim().toUpperCase() === "TRY",
  );

  if (scoped.length === 0) {
    return {
      ready: false,
      eligibleProviders: [],
      blockers: ["TR/TRY için ödeme sağlayıcısı operasyon kaydı yok"],
    };
  }

  const eligibleProviders: TurkeyPaymentProvider[] = [];
  const blockers: string[] = [];
  for (const candidate of scoped) {
    const decision = decidePaymentProviderOperationalStatus(candidate, input.now);
    if (!candidate.configured) {
      blockers.push(`${candidate.provider}: çalışma zamanı credential yapılandırması eksik`);
      continue;
    }
    if (!decision.allowed) {
      blockers.push(`${candidate.provider}: ${decision.reason}`);
      continue;
    }
    eligibleProviders.push(candidate.provider);
  }

  return {
    ready: eligibleProviders.length > 0,
    eligibleProviders,
    blockers: eligibleProviders.length > 0 ? [] : [...new Set(blockers)],
  };
}
