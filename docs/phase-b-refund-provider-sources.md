# Phase B — Resmî Geri Ödeme Sağlayıcı Kaynakları

Bu belge, ödeme sağlayıcısı callback sözleşmeleri uygulanırken kullanılan resmî kaynakların denetim kaydıdır. Uygulama, sağlayıcı kimliği, tutar, para birimi ve özgün ödeme referansı doğrulanmadan hiçbir settlement veya ledger hareketini tamamlamaz.

| Sağlayıcı | Kaynak | Phase B için doğrulanan nokta |
|---|---|---|
| iyzico | [Webhook](https://docs.iyzico.com/en/advanced/webhook) | Webhook bildirimleri JSON, sunucudan sunucuya iletilir; imza/kimlik doğrulaması yapılmadan işlenmemelidir. |
| iyzico | [Refund & Cancel](https://docs.iyzico.com/en/advanced/refund-and-cancel) | Tam ve kısmi iade işlemleri desteklenir; işlem referansı ve iade tutarı özgün ödeme ile eşleştirilmelidir. |
| Stripe | [Refunds](https://docs.stripe.com/refunds) | Geri ödeme nesneleri kredi veya banka kartı üzerinden iade durumunu temsil eder. |
| Stripe | [Webhook events](https://docs.stripe.com/webhooks) | Sağlayıcı olayları webhook endpointine gönderir; endpoint doğrulama ve idempotent olay işleme gerektirir. |

Bu kaynaklar 16 Ağustos 2026 tarihinde Phase B uygulaması için erişilmiştir. Gerçek sağlayıcı anahtarları ve webhook signing secret’ları bulunmadığından canlı callback doğrulaması **EXTERNAL_CONFIGURATION_REQUIRED** olarak fail-closed bırakılmıştır.
