import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("critical mobile accessibility source contracts", () => {
  it("keeps authentication fields, alerts and actions explicitly named", () => {
    const login = source("app/login.tsx");
    const register = source("app/register.tsx");
    const verifyPhone = source("app/verify-phone.tsx");
    const forgotPassword = source("app/forgot-password.tsx");

    for (const label of ["E-posta adresi", "Parola", "E-posta ve parola ile giriş yap", "Parolamı unuttum", "Kayıt ekranına git"]) {
      expect(login).toContain(`accessibilityLabel="${label}"`);
    }
    expect(verifyPhone).toContain('accessibilityLabel={t("verification.codePhoneAccessibility")}');
    expect(verifyPhone).toContain('accessibilityRole="alert"');
    expect(forgotPassword).toContain('accessibilityLabel="Parola sıfırlama e-posta adresi"');
    expect(forgotPassword).toContain('accessibilityLabel="Parola sıfırlama doğrulama kodu"');
    expect(forgotPassword).toContain('accessibilityLabel="Yeni parola"');
    expect(forgotPassword).toContain('accessibilityRole="alert"');
    for (const label of ["Ad ve soyad", "E-posta adresi", "Telefon numarası", "Parola", "Kayıt bilgileriyle devam et"]) {
      expect(register).toContain(`accessibilityLabel="${label}"`);
    }
  });

  it("keeps payment, provider-document, messaging and tracking critical actions named", () => {
    const checkout = source("app/payment/checkout.tsx");
    const paymentReturn = source("app/payment/return.tsx");
    const documents = source("app/provider-documents.tsx");
    const chat = source("app/chat/[id].tsx");
    const tracking = source("app/tracking/live.tsx");
    const withdraw = source("app/wallet/withdraw.tsx");

    for (const file of [checkout, paymentReturn, documents, chat, tracking]) {
      expect(file).toContain("accessibilityRole=\"button\"");
    }
    for (const label of ["Ödeme durumunu yenile", "Ödeme geçmişini aç"]) {
      expect(paymentReturn).toContain(`accessibilityLabel="${label}"`);
    }
    for (const label of ["Aktif işi yeniden yükle", "İş konumunu haritada aç", "İş kanıtını gönder", "İş kanıtını onayla", "İtirazı gönder"]) {
      expect(tracking).toContain(`accessibilityLabel="${label}"`);
    }
    expect(tracking).toContain("accessibilityState={{ busy:");
    expect(chat).toContain("accessibilityLabel");
    expect(documents).toContain("accessibilityLabel");
    for (const label of ["Para çekme tutarı", "Para çekme IBAN numarası", "Para çekme işlemi için parola", "Para çekme e-posta güvenlik kodu", "Para çekme talebi oluştur"]) {
      expect(withdraw).toContain(`accessibilityLabel="${label}"`);
    }
    expect(withdraw).toContain("accessibilityState={{ disabled: withdraw.isPending, busy: withdraw.isPending }}");
  });
});
