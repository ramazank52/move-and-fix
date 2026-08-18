# MOVE&FIX — Security & Accessibility Hardening Closure

**Tarih:** 18 Ağustos 2026  
**Kapsam:** HSTS, dosya yükleme boyut sınırları, kritik erişilebilirlik akışları, uygulama geneli erişilebilirlik envanteri ve Cookie `SameSite` analizi.  
**Referans:** P11 güvenlik/fail-closed sözleşmeleri korunmuştur. Test silinmemiş, skip eklenmemiş veya beklenti gevşetilmemiştir.

| Kontrol | Durum | Kanıt |
|---|---|---|
| HSTS | **PASS** | Üretim + güvenilir HTTPS için tam politika; HTTP, development ve güvenilmeyen forwarding negatif regresyonları PASS |
| Upload Limits | **PASS** | Ortak decoded-byte politikası, endpoint öncesi doğrulama ve HTTP 413 sözleşmesi PASS |
| Accessibility Critical Flows | **PASS** | Giriş, kayıt, OTP, parola sıfırlama, belge, ödeme, canlı takip, sohbet ve para çekme sözleşmeleri PASS |
| Accessibility Full Audit | **PARTIAL** | Statik envanter ve ortak varsayımlar uygulandı; fiziksel ekran okuyucu/cihaz doğrulaması henüz yapılmadı |
| Cookie SameSite Review | **ANALYSIS COMPLETE** | Kod değişikliği yapılmadı; aşağıdaki A/B/C değerlendirmesi kullanıcı kararını bekler |
| Full Regression | **PASS** | `86` test dosyası / `531` test PASS |
| TypeScript | **PASS** | `pnpm check` PASS |
| Lint | **PASS** | `pnpm lint` PASS |

## 1. HSTS — PASS

Üretim ortamında yalnız güvenilir HTTPS bağlamında aşağıdaki başlık gönderilir:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Başlık, düz HTTP isteklerinde, development ortamında ve güvenilmeyen bir istemcinin tek başına `X-Forwarded-Proto: https` göndermesinde üretilmez. Güvenilir proxy/HTTPS belirleme mantığı tek bir test edilebilir güvenlik yardımcısında tutulur.

| Değiştirilen dosyalar | Eklenen/değiştirilen testler | Çalıştırılan kanıt |
|---|---|---|
| `server/_core/security.ts`, `server/_core/index.ts` | `tests/hsts-security-headers.test.ts` | `pnpm exec vitest run tests/hsts-security-headers.test.ts …` — 4 HSTS testi PASS |

**Kalan açık:** HSTS preload listesine gerçek alan adı eklenmesi, yalnız canlı DNS/HTTPS ve alan adı sahipliği kesinleştikten sonra yapılmalıdır.

## 2. File Upload Size Hardening — PASS

Tüm medya sınıfları, base64 karakter uzunluğu yerine decoded ikili byte uzunluğu ile merkezi ve fail-closed olarak doğrulanır. Daha düşük mevcut limitler gevşetilmemiştir.

| Sınıf | En yüksek decoded sınır |
|---|---:|
| Hizmet talebi görseli / MoveAI görseli | 8 MiB |
| Sesli mesaj / provider belgesi | 10 MiB |
| MoveAI ses | 12 MiB |
| Hizmet talebi videosu | 25 MiB |
| Completion proof toplamı | 32 MiB |

| Değiştirilen dosyalar | Eklenen/değiştirilen testler | Çalıştırılan kanıt |
|---|---|---|
| `server/security/MediaUploadLimits.ts`, `server/routers.ts`, `server/_core/errorHandler.ts` | `tests/media-upload-limits.test.ts`, `tests/http-payload-size-limit.test.ts`, `tests/service-request-phase31.test.ts` | Hedefli 6 dosya / 17 test PASS; tam regresyon 86 dosya / 531 test PASS |

HTTP gövde sınırı aşımı, routing veya storage katmanına geçmeden redacted JSON gövdesiyle `413 Payload Too Large` döner ve yapılandırılmış uyarı logu üretir.

**Kalan açık:** Gerçek cihazdaki çok büyük medya seçimi, ağ kesintisi ve sağlayıcı depolama kotası senaryoları harici cihaz/servis doğrulamasıdır; sunucu byte politikası bu bağımlılıklardan bağımsız PASS edilmiştir.

## 3. Accessibility — Kritik Akışlar PASS; Tam Denetim PARTIAL

**Envanter:** `73` uygulama ekranı, `292` etkileşimli kontrol ve `57` metin girişi kaynak düzeyinde tarandı. Ortak Pressable uyarlaması açıkça verilen `accessibilityLabel`/rolü ezmeden, metin tabanlı mevcut eylemlere varsayılan button rolü sağlar.

Kritik akışlarda açık ad, rol, hint, busy/disabled durumu ve hata geri bildirimi eklendi: giriş, kayıt, telefon OTP, parola sıfırlama, provider belge yükleme, checkout/ödeme dönüşü, canlı takip, sohbet/sesli mesaj, cüzdan para çekme; ayrıca takvim, hizmet oluşturma, filtre ve admin ikon-yalnız eylemleri.

| Değiştirilen dosyalar | Eklenen/değiştirilen testler | Çalıştırılan kanıt |
|---|---|---|
| `app/login.tsx`, `app/register.tsx`, `app/verify-phone.tsx`, `app/forgot-password.tsx`, `app/provider-documents.tsx`, `app/payment/checkout.tsx`, `app/payment/return.tsx`, `app/tracking/live.tsx`, `app/chat/[id].tsx`, `app/wallet/withdraw.tsx`, `app/calendar.tsx`, `app/create-service.tsx`, `app/explore/filter.tsx`, `app/admin.tsx`, `lib/_core/nativewind-pressable.ts` | `tests/login-accessibility-render.test.tsx`, `tests/accessibility-critical-flows.test.ts` | Hedefli 6 dosya / 17 test PASS; tam regresyon 86 dosya / 531 test PASS |

**Neden PARTIAL:** Otomatik kaynak/gerçek render denetimi ve kritik akış sözleşmeleri tamamlanmıştır; ancak TalkBack, VoiceOver, switch control, dinamik font ölçekleme ve renk-kontrastının fiziksel iOS/Android cihazda kullanıcı ile doğrulanması bu ortamda yapılamaz. Bu nedenle tüm ekranlerin erişilebilirlik durumu abartılmadan `PARTIAL` bırakılmıştır.

## 4. Cookie `SameSite` Review — ANALYSIS COMPLETE (Kod Değişikliği Yok)

Mevcut `server/_core/cookies.ts` davranışı `httpOnly: true`, `sameSite: "none"`, HTTPS algılandığında `secure: true` ve alt alan adları arasında paylaşımı destekleyen domain kapsamıdır. `sameSite` değeri bu görevde değiştirilmemiştir.

| Seçenek | Etki | Risk / Uyum | Öneri |
|---|---|---|---|
| **A — `None` (mevcut)** | Cross-site iframe, harici in-app browser veya çapraz-site istek uyumluluğu en yüksek | Tarayıcı her cross-site istekte çerez gönderebilir; mevcut session-bound CSRF koruması zorunlu olmaya devam eder | Yalnız gerçek cross-site ürün gereksinimi kanıtlanırsa koruyun |
| **B — `Lax`** | Aynı registrable domain alt alan adları ve üst-seviye OAuth dönüşleri tipik olarak korunur; cross-site alt-kaynak/POST çerezi sınırlanır | Çapraz-site embedded veya bazı native webview akışları etkilenebilir | **Önerilen varsayılan**; production preview ve OAuth/native kabul testi sonrası ayrıca onayla |
| **C — `Strict`** | En dar çerez gönderimi ve en güçlü browser-side CSRF azaltımı | Harici kimlik sağlayıcı dönüşü, deep link veya çapraz-site giriş akışlarını kırma riski en yüksek | Bu mimaride önerilmez |

**Karar gereksinimi:** `SameSite=None → Lax` değişikliği güvenlik açısından tercih edilse de auth/OAuth/native webview kabul testi gerektirir. Kullanıcı onayı ve bu kabul testi olmadan değişiklik yapılmamalıdır.

## Kalite Kapıları ve Kalan Açıklar

| Komut | Gerçek sonuç |
|---|---|
| `pnpm check` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS — 86 dosya / 531 test |
| `pnpm exec vitest run tests/hsts-security-headers.test.ts tests/http-payload-size-limit.test.ts tests/media-upload-limits.test.ts tests/accessibility-critical-flows.test.ts tests/login-accessibility-render.test.tsx tests/service-request-phase31.test.ts` | PASS — 6 dosya / 17 test |

**Checkpoint / commit:** Bu rapor tamamlandıktan sonra oluşturulacak güvenlik-kapanış checkpoint kimliği teslim mesajında belirtilir.

**Değiştirilmeden bırakılanlar:** Cookie `SameSite` politikası, P11 authorization/fail-closed sözleşmeleri, API sözleşmeleri ve kullanıcı işlevleri.
