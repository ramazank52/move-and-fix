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
