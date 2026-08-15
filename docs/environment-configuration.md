# Move&Fix Ortam Değişkenleri Sözleşmesi

Bu belge, çalıştırma ortamına değer girmeden önce uygulanan **tek isimlendirme standardını** açıklar. Gerçek anahtarlar yalnız güvenli secret yönetimi üzerinden sağlanır; bu repository içinde yer almaz.

| Alan | Anahtar | Görünürlük | Üretimde davranış |
|---|---|---|---|
| İstemci Stripe anahtarı | `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Expo public bundle | Eksikse Stripe ödeme yüzeyi kapalı kalır; tahsilat simüle edilmez. |
| Sunucu Stripe anahtarı | `STRIPE_SECRET_KEY` | Yalnız sunucu | Eksikse Stripe checkout ve reconciliation fail-closed çalışır. |
| Stripe webhook imzası | `STRIPE_WEBHOOK_SECRET` | Yalnız sunucu | Eksikse Stripe webhook doğrulaması reddeder. |
| iyzico kimlik bilgileri | `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL` | Yalnız sunucu | Eksik anahtarlar ilgili gateway akışını kapatır. |
| CORS allowlist | `ALLOWED_ORIGINS` | Yalnız sunucu | Production’da eksikse allowlist boştur ve browser origin istekleri reddedilir. |
| Şifreleme | `ENCRYPTION_KEY` | Yalnız sunucu | Production başlangıcı engellenir. |
| E-posta unsubscribe imzası | `UNSUBSCRIBE_SECRET` | Yalnız sunucu | Production başlangıcı engellenir; development’ta linksiz e-posta akışı fail-closed kalır. |
| Mobil API temel adresi | `EXPO_PUBLIC_API_BASE_URL` | Expo public bundle | Uygulama yalnız açıkça sağlanan güvenli API adresini kullanır. |
| Zamanlayıcı ve callback imzaları | `ESCROW_RELEASE_CRON_SECRET`, `FINANCIAL_RECONCILIATION_CRON_SECRET`, `COMPLIANCE_REVERIFICATION_CRON_SECRET` | Yalnız sunucu | İmzalı callback doğrulaması eksik secret ile çalışmaz. |
| Sağlayıcı yapılandırması | `OPENAI_API_KEY`, `GEMINI_API_KEY`, `LOCAL_LLM_ENDPOINT`, bildirim ve storage anahtarları | Sağlayıcıya göre | Eksik credential ilgili sağlayıcıyı devre dışı bırakır; başarı sonucu uydurulmaz. |

> `EXPO_PUBLIC_` öneki olmayan hiçbir secret mobil bundle’a aktarılmaz. `STRIPE_API_KEY` legacy adı desteklenmez; yalnız `STRIPE_SECRET_KEY` kullanılmalıdır.
