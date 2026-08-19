import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { LANGUAGES, formatLocalDate, formatMoney, isRightToLeft, languageFromDeviceLocale, localeForLanguage, t } from "../lib/i18n-core";

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
      "messages.emptyTitle",
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

  it("P14-09 exact 13 dil sözleşmesini korur, kaldırılan yerelleri güvenle TR’ye çözer ve Arabic RTL yönünü işaretler", () => {
    expect(LANGUAGES).toHaveLength(13);
    expect(LANGUAGES.map((language) => language.code)).toEqual([
      "tr", "en", "de", "fr", "ar", "ru", "zh", "hi", "es", "pt", "bn", "id", "ja",
    ]);
    expect(languageFromDeviceLocale("ar-SA")).toBe("ar");
    expect(languageFromDeviceLocale("fa-IR")).toBe("tr");
    expect(languageFromDeviceLocale("uk-UA")).toBe("tr");
    expect(languageFromDeviceLocale("unsupported-XX")).toBe("tr");
    expect(isRightToLeft("ar")).toBe(true);
    expect(isRightToLeft("tr")).toBe(false);
    expect(isRightToLeft("en")).toBe(false);
    expect(localeForLanguage("tr")).toBe("tr-TR");
    expect(localeForLanguage("ar")).toBe("ar");
    expect(localeForLanguage("hi")).toBe("hi-IN");
  });

  it("Hizmet Talebi anahtarlarını 13 dilin tamamında raw-key göstermeden çözer", () => {
    const keys = [
      "request.title",
      "request.details.heading",
      "request.media.hint",
      "request.route.distanceHint",
      "request.submit",
      "request.submitSuccessBody",
    ] as const;

    for (const language of LANGUAGES) {
      for (const key of keys) {
        const value = t(key, language.code, { limit: 5, count: 1 });
        expect(value).toBeTruthy();
        expect(value).not.toBe(key);
      }
    }
    expect(t("request.details.heading", "tr")).toBe("Sorunu detaylı açıklayın");
  });

  it("Arabic kritik hizmet talebi akışında RTL bağlamını ve metin hizalamasını bağlar", () => {
    expect(isRightToLeft("ar")).toBe(true);
    const source = readFileSync(resolve(process.cwd(), "app/create-service.tsx"), "utf8");
    expect(source).toContain("const { language, t, isRTL, formatMoney } = useTranslation()");
    expect(source).toContain('textAlign: isRTL ? "right" : "left"');
    expect(source).toContain("flexDirection: isRTL ? \"row-reverse\" : \"row\"");
  });

  it("genişletilmiş dil sözlüklerinde yerel navigasyon metinlerini çözer", () => {
    expect(t("home", "de")).toBe("Startseite");
    expect(t("language", "zh")).toBeTruthy();
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

  it("işlerim ve canlı takip metinlerini seçilen dille parametrik üretir", () => {
    expect(t("jobs.title", "tr")).toBe("İşlerim");
    expect(t("jobs.status.onTheWay", "en")).toBe("On the way");
    expect(t("jobs.chatAccessibility", "ru", { name: "Murat" })).toBe("Написать Murat");
    expect(t("tracking.status.etaSubtitle", "tr", { minutes: 12 })).toBe("Tahmini varış 12 dakika");
    expect(t("tracking.status.etaSubtitle", "en", { minutes: 12 })).toBe("Estimated arrival in 12 minutes");
    expect(t("tracking.lastUpdated", "ru", { time: "14:30" })).toBe("Обновлено 14:30");
    expect(t("tracking.reviewService", "en")).toBe("Rate Service");
  });

  it("konuşma ekranının hata ve katılımcı metinlerini desteklenen dillerde çözer", () => {
    expect(t("chat.providerMeta", "tr", { rating: "4.9" })).toBe("Profesyonel · 4.9 puan");
    expect(t("chat.emptyTitle", "en")).toBe("No messages yet");
    expect(t("chat.recordVoice", "ru")).toBe("Записать голосовое сообщение");
  });

  it("profesyonel fırsat ve teklif formu metinlerini tüm birincil dillerde çözer", () => {
    expect(t("opportunities.title", "tr")).toBe("Yeni İş Fırsatları");
    expect(t("opportunities.makeOffer", "en")).toBe("Make Offer");
    expect(t("opportunities.estimatedTimePlaceholder", "ru")).toContain("30");
  });

  it("hesap güvenliği oturum eylemlerini parametrik ve yerel dille çözer", () => {
    expect(t("security.sessionsRevokedBody", "tr", { count: 2 })).toContain("2");
    expect(t("security.revokeOthers", "en")).toBe("Close Others");
    expect(t("security.title", "ru")).toBe("Безопасность аккаунта");
  });

  it("Masraf Dosyası anahtarlarını 13 dilin tamamında raw-key göstermeden ve locale-aware para ile çözer", () => {
    const keys = [
      "expense.title",
      "expense.totalNotice",
      "expense.category.material",
      "expense.receiptAdd",
      "expense.refund.request",
      "expense.alert.refundSubmittedBody",
    ] as const;

    for (const language of LANGUAGES) {
      for (const key of keys) {
        expect(t(key, language.code)).not.toBe(key);
      }
    }
    expect(t("expense.title", "tr")).toBe("İş masrafları");
    expect(formatMoney(1250, "ar")).toMatch(/TRY|₺/);
  });

  it("Arabic Masraf Dosyası akışında RTL yön ve metin hizalamasını bağlar", () => {
    const source = readFileSync(resolve(process.cwd(), "app/expenses/[requestId].tsx"), "utf8");
    expect(source).toContain("const { t, formatMoney, isRTL } = useTranslation()");
    expect(source).toContain('flexDirection: isRTL ? "row-reverse" : "row"');
    expect(source).toContain('textAlign: isRTL ? "right" : "left"');
  });

  it("P14-10 kapsamındaki üretim rotalarında denetlenmiş kullanıcı metinlerini i18n anahtarları dışında tutar", () => {
    const auditedRoutes = ["app/create-service.tsx", "app/expenses/[requestId].tsx"];
    const forbiddenLiterals = [
      "Hizmet Talebi", "Masraf ekle", "İş masrafları", "Masrafı kaydet",
      "İade talebini onayla", "İade talebini reddet", "Kaydediliyor…",
    ];

    for (const route of auditedRoutes) {
      const source = readFileSync(resolve(process.cwd(), route), "utf8");
      for (const literal of forbiddenLiterals) {
        expect(source).not.toContain(`>${literal}<`);
        expect(source).not.toContain(`placeholder="${literal}"`);
        expect(source).not.toContain(`accessibilityLabel="${literal}"`);
      }
    }
  });
});
