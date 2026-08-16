export const SUPPORTED_DISPLAY_CURRENCIES = ["TRY", "USD", "EUR"] as const;
export type SupportedDisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number];

export const SETTLEMENT_CURRENCY = "TRY" as const;

export function isSupportedDisplayCurrency(value: string): value is SupportedDisplayCurrency {
  return (SUPPORTED_DISPLAY_CURRENCIES as readonly string[]).includes(value);
}

/**
 * The platform's legally configured settlement currency. Displaying an amount
 * in any other currency requires a server-issued, time-bounded FX quote.
 * Client-side conversion is intentionally prohibited.
 */
export function requiresFxQuote(currency: SupportedDisplayCurrency): boolean {
  return currency !== SETTLEMENT_CURRENCY;
}

export function assertSettlementCurrency(currency: string): asserts currency is typeof SETTLEMENT_CURRENCY {
  if (currency !== SETTLEMENT_CURRENCY) {
    throw new Error("CURRENCY_CONVERSION_NOT_CONFIGURED");
  }
}
