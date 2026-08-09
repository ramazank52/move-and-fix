# Phase 07 — Ödeme Ekranı Görsel Doğrulama

**Doğrulanan route:** `/payment/checkout?requestId=180002`

**Viewport:** 390 × 844, tam sayfa authenticated web render

## Geçen kontroller

- Gerçek `payments.quote` yanıtından hizmet başlığı, profesyonel, tutar ve komisyon gösteriliyor.
- Hizmet özeti, Move&Fix Emanet Güvencesi, ücret dökümü, ödeme yöntemi, iyzico fatura formu ve sabit CTA referans hiyerarşisine uygun sırada.
- MoveWallet bakiyesi gerçek `wallet.summary` API’sinden geliyor; desteklenmeyen cüzdan tahsilatı açık biçimde `BLOCKER` ve seçilemez ödeme başarısı üretmiyor.
- iyzico seçili durum, Stripe credential blocker durumu, ücret toplamı ve güvenlik açıklaması görünür.
- Tam sayfa renderda yatay taşma, kırpılmış form alanı veya bottom CTA çakışması gözlenmedi.

## Sonuç

İlk renderda belirgin olmayan hizmet ikonu için `wrench.and.screwdriver.fill` Android/web eşlemesi `handyman` ikonuna bağlandı. Yeniden üretilen authenticated tam sayfa renderda ikon turuncu kontrastla görünür; boş ikon alanı kalmadı. **07 Ödeme görsel ve işlevsel doğrulaması PASS**.
