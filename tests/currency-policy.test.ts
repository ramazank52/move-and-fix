import { describe, expect, it } from "vitest";
import {
  SETTLEMENT_CURRENCY,
  assertSettlementCurrency,
  isSupportedDisplayCurrency,
  requiresFxQuote,
} from "../shared/currency-policy";
import { t } from "../lib/i18n-core";

describe("currency policy", () => {
  it("keeps settlement exclusively in TRY without a server-issued FX quote", () => {
    expect(SETTLEMENT_CURRENCY).toBe("TRY");
    expect(requiresFxQuote("TRY")).toBe(false);
    expect(requiresFxQuote("USD")).toBe(true);
    expect(requiresFxQuote("EUR")).toBe(true);
    expect(() => assertSettlementCurrency("USD")).toThrow("CURRENCY_CONVERSION_NOT_CONFIGURED");
    expect(() => assertSettlementCurrency("TRY")).not.toThrow();
  });

  it("only accepts explicit display currencies", () => {
    expect(isSupportedDisplayCurrency("TRY")).toBe(true);
    expect(isSupportedDisplayCurrency("USD")).toBe(true);
    expect(isSupportedDisplayCurrency("EUR")).toBe(true);
    expect(isSupportedDisplayCurrency("GBP")).toBe(false);
  });

  it("provides the currency safety notice in TR, EN and RU", () => {
    expect(t("currencyUnavailableBody", "tr", { currency: "USD" })).toContain("TRY");
    expect(t("currencyUnavailableBody", "en", { currency: "USD" })).toContain("TRY");
    expect(t("currencyUnavailableBody", "ru", { currency: "USD" })).toContain("TRY");
  });

  it("provides consent and privacy safety copy in TR, EN and RU", () => {
    for (const language of ["tr", "en", "ru"] as const) {
      expect(t("consent.title", language)).not.toBe("consent.title");
      expect(t("consent.requiredHint", language)).not.toBe("consent.requiredHint");
      expect(t("privacy.title", language)).not.toBe("privacy.title");
      expect(t("privacy.pendingLegalReviewBody", language)).not.toBe("privacy.pendingLegalReviewBody");
    }
  });
});
