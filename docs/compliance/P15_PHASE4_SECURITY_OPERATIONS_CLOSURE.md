# P15 Faz 4 — Security, Authorization & Operations Closure

**Baseline:** P15 Faz 3 çalışma alanı  
**Tarih:** 20 Ağustos 2026  
**Durum:** **A — INTERNAL READY / EXTERNAL RELEASE GATES REMAIN**

## Secret ve encryption hazırlığı

| Konu | Uygulama | Fail-closed davranış |
|---|---|---|
| Merkezi secret contract | `EnvironmentContract.ts` canonical, private environment anahtarlarını ve public/private ayrımını tanımlar: encryption, scanner callback, cron, APM, proxy communication, payment/notification/webhook alanları. | Eksik sağlayıcı değeri sahte başarı üretmez; ilgili adapter `NOT_CONFIGURED`/güvenli kapalı sonucu verir. |
| Encryption | `EncryptionService`, AES-256-GCM kullanır; her yeni payload `v2:<key-version>:<iv>:<auth-tag>:<ciphertext>` biçimindedir. 96-bit rastgele IV her encrypt işleminde yeniden üretilir. | Key version bulunmazsa `ENCRYPTION_KEY_VERSION_UNAVAILABLE`; auth/decrypt hatasında plaintext fallback yoktur. |
| Rotation | Active `ENCRYPTION_KEY_VERSION`, yalnız açık `ENCRYPTION_KEY_PREVIOUS` fallback’iyle legacy/decrypt penceresi ve re-encrypt yolunu destekler. | Önceki key yalnız yapılandırılmışsa denenir; hata response veya log’a anahtar yazılmaz. |
| Scanner webhook rotation | Active ve previous callback secret, nonce/timestamp/HMAC denetiminden geçen kontrollü kısa geçiş penceresinde kabul edilir. | Secret yoksa callback kabul edilmez; spoofed/replay callback fail-closed kalır. |
| Observability | Secret, token, callback signature, nonce, e-posta, telefon, IBAN, kart, adres, storage/object key ve file path anahtarları merkezi redaction ile maskelenir. | Sanitized event dışında APM/console çıktı yolu yoktur. |

Platform-managed secret sistemi nedeniyle takip edilen `.env.example` dosyası bulunmamaktadır; repository’de gerçek değer veya sahte placeholder dosyası oluşturulmamıştır. Canonical secret adları kodda `EnvironmentContract` ve `docs/ops/environment-contract.md` içinde, değer içermeden belgelenmiştir. Bu yaklaşım source-control içine secret ya da yanıltıcı değer girilmesini önler.

## Authorization, IDOR, MoveAI ve country gate kanıtı

| Alan | Doğrulanan server-authoritative kontrol |
|---|---|
| Owner/reviewer/admin sınırları | Provider document review/remediation MFA + active grant + short-lived signed URL ile sınırlandırılır; unrelated veya anonymous çağrı reddedilir. |
| Payment/ledger | Payment router security testleri user role, idempotency ve kaynak erişim sınırlarını korur. |
| MoveAI | Provider yapılandırması yoksa fake response yerine `NOT_CONFIGURED`; deterministic `ProfessionalAiBoundary` yetki/risk kararlarında önceliklidir. PII-minimized context dışında başka işin AI bağlamı paylaşılmaz. |
| Country/capability | Jurisdiction çözülemezse `COUNTRY_MARKETPLACE_NOT_READY`; launch/legal/payment pack, stale/revoked capability ve ambiguous alias doğrudan API çağrısında da block olur. |
| PII/storage exposure | DTO, signed URL ve log güvenlik testleri raw storage key / callback signature / kullanıcı PII sızıntısını reddeder. |

## Operasyonel dayanıklılık

Structured, correlation/request-ID destekli observability; PII redaction; readiness/health ayrımı; bounded retry, timeout, circuit-breaker, idempotency, scanner dead-letter/operational review ve signed cron endpoint sözleşmeleri mevcut testlerle korunmuştur. Backup/restore, migration recovery, incident, key-compromise, malware-outbreak ve dependency vulnerability runbook’ları `docs/` altında versiyon kontrollü tutulur. APM adapter’ı credential yokken `not_configured` döndürür; gerçek APM delivery yapılmış olarak raporlanmaz.

## Test ve kalite kanıtı

| Komut | Gerçek sonuç |
|---|---|
| `pnpm vitest run tests/p15-authorization-resilience-matrix.test.ts tests/professional-ai-router-contract.test.ts tests/country-launch-gate-contract.test.ts tests/observability-contract.test.ts tests/payment-router-security.test.ts tests/provider-document-reviewer-router.test.ts tests/environment-contract.test.ts tests/encryption-key-rotation.test.ts tests/media-scanner-callback-rotation.test.ts` | PASS — **9 dosya / 41 test** |
| `pnpm lint && pnpm build && pnpm test` | Lint PASS; backend build PASS; full regression **108 dosya / 650 test PASS** |
| `git diff --check` | PASS (trailing whitespace düzeltmesinden sonra) |

Yeni `p15-authorization-resilience-matrix.test.ts`, spoofed callback/replay dışında MoveAI configured olmayan provider, country-market readiness bypass, raw storage key ve observability secret/PII sızıntısını negatif yönde doğrular. Bu testin ilk çalıştırması callback signature ve storage key redaction eksiklerini buldu; iki değer `sensitiveKeyPattern` kapsamına eklendikten sonra testler PASS oldu.

## External release gates

| Gate | Neden |
|---|---|
| Final production secret değerleri | Key/secret değerleri kullanıcı tarafından sağlanmadı; bu fazda uydurulmadı veya kaydedilmedi. |
| APM/operasyon sağlayıcısı | Adapter ve health contract hazır; gerçek APM hesabı/telemetri gönderimi doğrulanmadı. |
| Ödeme, SMS, e-posta, push | Fail-closed adapter/config hazır; gerçek credential ve canlı teslimat/E2E yapılmadı. |

Bu maddeler production release’i dış koşul olarak bloke eder; bu fazdaki iç security testlerini PASS olarak maskelemek için kullanılmamıştır.
