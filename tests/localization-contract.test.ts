import { describe, expect, it } from "vitest";

import { LANGUAGES, formatLocalDate, formatMoney, isRightToLeft, localeForLanguage, t } from "../lib/i18n-core";

describe("yerelleştirme sözleşmesi", () => {
  it("desteklenen her dil için eksiksiz navigasyon çevirisi döndürür", () => {
    for (const language of LANGUAGES) {
      expect(t("home", language.code)).toBeTruthy();
      expect(t("explore", language.code)).toBeTruthy();
      expect(t("wallet", language.code)).toBeTruthy();
      expect(t("language", language.code)).toBeTruthy();
    }
  });

  it("ana ekranın TR, EN ve RU metinlerini ve parametrelerini doğru üretir", () => {
    expect(t("home.greeting", { name: "Ramazan" })).toBe("Merhaba Ramazan 👋");
    expect(t("home.greeting", "en", { name: "Sam" })).toBe("Hello Sam 👋");
    expect(t("home.greeting", "ru", { name: "Сэм" })).toBe("Привет, Сэм 👋");
    expect(t("home.searchPlaceholder", "en")).toBe("What are you looking for?");
    expect(t("home.moveAITitle", "ru")).toBe("Расскажите MoveAI");
    expect(t("home.serviceCount", { count: 3 })).toBe("3 hizmet");
  });

  it("öncelikli müşteri ve profesyonel akışlar için TR, EN ve RU anahtarlarını çözümleyebilir", () => {
    const keys = [
      "explore.title",
      "ai.welcome",
      "wallet.history",
      "profile.personalInfo",
      "checkout.serviceSummary",
      "checkout.payWith",
      "provider.dashboardLoading",
      "provider.availability",
    ] as const;

    for (const language of ["tr", "en", "ru"] as const) {
      for (const key of keys) {
        expect(t(key, language, { amount: "₺1.250,00", provider: "iyzico" })).toBeTruthy();
      }
    }

    expect(t("checkout.payWith", "en", { amount: "TRY 1,250.00", provider: "Stripe" })).toBe("Pay TRY 1,250.00 with Stripe");
    expect(t("provider.totalEarnings", "ru", { amount: "₺1 250,00" })).toContain("₺1 250,00");
  });

  it("yalnız Arapça için RTL yönünü etkinleştirir", () => {
    expect(isRightToLeft("ar")).toBe(true);
    expect(isRightToLeft("tr")).toBe(false);
    expect(isRightToLeft("en")).toBe(false);
    expect(localeForLanguage("tr")).toBe("tr-TR");
    expect(localeForLanguage("ar")).toBe("ar");
  });

  it("TRY tutarlarını seçilen locale ile biçimlendirir ancak para birimini değiştirmez", () => {
    expect(formatMoney(1250, "tr")).toMatch(/₺|TRY/);
    expect(formatMoney(1250, "en")).toMatch(/TRY|₺/);
    expect(formatMoney(1250, "de")).toMatch(/TRY|₺/);
  });

  it("tarihleri locale-aware ve deterministik biçimde üretir", () => {
    const value = new Date("2026-08-15T12:00:00.000Z");
    expect(formatLocalDate(value, "tr")).toContain("2026");
    expect(formatLocalDate(value, "en")).toContain("2026");
  });
});
