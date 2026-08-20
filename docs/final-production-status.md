# Move&Fix — Authoritative Final Production Status

**Rapor tarihi:** 20 Ağustos 2026, 20:44 UTC
**Current phase:** P17 FINAL CLOSURE
**Current committed full SHA:** `af6b16134323fabce0b1357a4e1b55016598dcda` (`p17-verified-closure`)
**P17 closure basis:** Bu SHA üzerinde P17-01–P17-12 tamamlandı; bu rapordaki P17-13–P17-16 belge, davranışsal test ve privacy-scope değişiklikleri final checkpoint ile kalıcılaştırılacaktır.
**Kanıt ilkesi:** Yalnız bu çalışma ağacında gerçekten çalıştırılan komutlar **PASS** olarak belirtilmiştir. Eksik credential, harici sistem, hukuk onayı veya fiziksel cihaz doğrulaması başarı varsayılmadan **BLOCKED / EXTERNAL** durumunda tutulur.

> Bu belge P17 için tek güncel production-status kaynağıdır. P12–P16’nın korunmuş tarihsel kanıtı [Historical / Superseded Evidence](./archive/final-production-status-pre-p17.md) dosyasındadır; eski test sayıları veya Expo sürümleri güncel durum olarak yorumlanmamalıdır.

## Yönetici Özeti

P17, P16 `a314ce97` baseline’ındaki kalan doğrulanmış iç kapanış maddelerini tamamladı. Provider onboarding artık operating model ve service-area olmadan aktivasyona ilerlemez; belge ve credential kararları capability–jurisdiction–provider type bağlamındaki tek authoritative requirement kaynağındadır. Scanner callback’leri dispatch-attempt token ile compare-and-set korumasına bağlanır, stale callback fail-closed reddedilir. Legacy şifreli payload’lar yalnız açıkça yapılandırılmış eski anahtarla çözülür ve anahtar yoksa migration tahmini yapılmaz.

Masraf Dosyası, semantic evidence rolleri için merkezi adet/boyut/süre politikası kullanır. MoveAI canonical catalog snapshot’ına bağlanır ve bilinmeyen/ambiguous kategoriyi block eder. Privacy Center talebi başarılı re-auth sonrasında yalnız sahibine ait çeviri tercihi/provenance ve contact-verification/change geçmişinin retention-aware scope görünümünü döndürür; otomatik silme iddiası üretmez. P17 runtime davranış kanıtı provider onboarding, scanner retry/late callback, masraf evidence, MoveAI canonical resolver, partial settlement ve privacy owner-scope akışlarını kapsar.

| Karar alanı | Güncel durum | Kanıt ve gerekçe |
|---|---|---|
| P17 uygulanabilir internal kapsam | **A — INTERNAL READY** | P17-01–P17-17 kapsamı, additive migration’lar, unit/router/database davranış testleri ve aşağıdaki kalite kapıları ile doğrulandı. Bilinen P17 iç P0/P1 açık yoktur. |
| Canlı production deployment | **C — NO-GO** | Ödeme/scanner/iletişim credential’ları, production DNS/HTTPS, onaylı hukuk metinleri, fiziksel cihaz E2E ve dış servis kabulü olmadan yayın yapılmamalıdır. |

## Güncel Kalite Kanıtı

| Kontrol | Sonuç | Gerçek çıktı özeti |
|---|---:|---|
| Tam regresyon | **PASS** | `pnpm test`: **124 test dosyası / 724 test** geçti. |
| Frozen dependency install | **PASS** | `pnpm install --frozen-lockfile`; lockfile güncel kaldı. |
| TypeScript | **PASS** | `NODE_OPTIONS=--max-old-space-size=2048 pnpm check` (`tsc --noEmit`). |
| Lint | **PASS** | `pnpm lint` (`expo lint`) hata ve uyarı üretmedi. |
| Backend build | **PASS** | `pnpm build`: `dist/index.js` yaklaşık **1.1 MB** üretti. |
| Web export | **PASS** | `npx expo export --platform web`: 1 web bundle, 32 asset, **79 static route**. |
| iOS export | **PASS** | `npx expo export --platform ios`: native bundle başarıyla üretildi. |
| Android export | **PASS** | `npx expo export --platform android`: 1 Hermes bundle ve metadata başarıyla üretildi. |
| Expo Doctor | **PASS** | `npx expo-doctor`: 20/20 kontrol geçti. |
| Migration integrity | **PASS** | 78 SQL migration = 78 Drizzle journal kaydı. |
| SPDX lisans politikası | **PASS** | `pnpm supply:licenses`: **1.011 installed package** için policy geçti; attribution inventory yenilendi. |
| Deterministik SCA gate | **PASS** | `pnpm supply:sca`: 4 advisory, 0 release-blocking, 2 kayıtlı toolchain exception. |
| Secret / source integrity | **PASS** | Yüksek güvenli secret content eşleşmesi 0; `.env.example` dışı yasaklı secret path eşleşmesi 0; `git diff --check` temiz. |
| i18n / seed / route validation | **PASS** | 4 dosya / 77 test; hard-coded i18n, production seed ve route hygiene davranışları doğrulandı. |

## P17 Kapanış Kaydı

| Madde | Durum | Uygulanan authoritative davranış | Kayıt / kanıt |
|---|---:|---|---|
| P17-01 | PASS | Provider activation için operating model, service area ve radius server-side zorunludur. | `0079`, `2f3d4ec5` |
| P17-02 | PASS | Document/credential/activation aynı requirement binding üzerinden karar verir; category fallback yoktur. | `0080`, `05e25f69` |
| P17-03 | PASS | Scanner callback, HMAC ve idempotency yanında dispatch-attempt token ile CAS uygulanır; stale attempt reddedilir. | `0081`, `1d9f82c9` |
| P17-04 | PASS | Legacy ciphertext yalnız explicit legacy key ile çözülür; eksik anahtar `ENCRYPTION_LEGACY_KEY_UNAVAILABLE` ile fail-closed kalır. | `967a3832` |
| P17-05 / P17-17 | PASS | Semantic çoklu evidence; rol, toplam adet, byte ve video süresi limitleri merkezi ve server-authoritative uygulanır. | `0082`, `4a0aefde` |
| P17-06 | PASS | Provider documents, organization ve MoveAI yüzeyleri type-safe merkezi 13-dil i18n sözleşmesine bağlıdır. | `934acf68` |
| P17-07 | PASS | MoveAI locale-aware canonical catalog snapshot kullanır; unknown/ambiguous kategori block edilir. | `934acf68` |
| P17-08 | PASS | Compound SPDX expression’ları fail-closed recursive-descent policy ile değerlendirilir. | `00210dd0` |
| P17-09 / P17-15 | PASS | Runtime `qs` 6.15.2 override ile remediated; advisory zinciri ve disposition kayda alınmıştır. | `00210dd0` |
| P17-10 | PASS | JSON audit parser HIGH/CRITICAL için deterministic gate uygular; yalnız exact approved exception kayıtları kabul edilir. | `00210dd0` |
| P17-11 | PASS | Partial/customer/unknown settlement örnekleri price intelligence dışındadır. | `af6b1613` |
| P17-12 | PASS | Canonical cron secret adı `MEDIA_SCANNER_CRON_SECRET` typed contract ve dokümantasyonda hizalıdır. | `af6b1613` |
| P17-13 | PASS | Bu belge P17 current status’unu en üstte gösterir; eski evidence ayrı immutable tarihçe ekindedir. | Bu rapor |
| P17-14 | PASS | Static smoke testlere ek olarak gerçek tRPC/router/database runtime kanıtları eklendi. | `p17-expense-evidence-router`, `p17-media-scanner-attempt-correlation`, `p17-moveai-canonical-router` |
| P17-16 | PASS | Owner-only privacy scope, translation preference/provenance ve contact verification/change history’yi re-auth sonrası export/erasure lifecycle’a bağlar; erasure otomasyonu retention review olmadan yapılmaz. | `p17-privacy-data-scope`, privacy router security testleri |

## Privacy, Security ve Runtime Davranışları

Privacy export/erasure talebi, local credential parolası ve tek kullanımlı `sensitive_transaction` OTP doğrulanmadan kayda bağlanmaz. Scope yalnız oturum sahibinin translation preference’ını, tarafı olduğu mesajların çeviri provenance kaydını ve kendi contact verification/change geçmişini sorgular. Her liste bounded alınır ve sonuçta truncation bilgisi verilir. Bu response, güvenli teslim edilecek nihai export artefaktının yerine geçmez; mevcut review/retention workflow’u korunur. Erasure sonucu `retention_review_required` olduğundan legal hold veya saklama belirsizliği otomatik silme ile aşılmaz.

Scanner attempt correlation policy, ilk dispatch ve retry dispatch için token üretilmesini; terminal update’in yalnız token mevcut attempt ile eşleştiğinde yapılmasını denetler. Böylece gecikmiş veya başka attempt’e ait callback temiz/blocked kararını yanlış işleme uygulayamaz. Masraf evidence router testi ise kimliği doğrulanmamış çağrıyı veri erişiminden önce reddeder, provider owner bağını korur ve duplicate media referanslarını persistence öncesinde engeller.

## Mevcut SCA ve Toolchain Durumu

`pnpm supply:sca` gate’i **PASS** durumundadır. Güncel rapor 4 advisory algılamıştır: 2 moderate ve 2 high. Hiçbiri policy altında release-blocking değildir; 2 high advisory yalnız kayıtlı Expo/Metro toolchain exception’ı kapsamındadır. Bu istisnalar riskin yok sayıldığı anlamına gelmez: [P17 SCA exceptions](./compliance/P17_SCA_EXCEPTIONS.json) ve [qs advisory araştırması](./compliance/P17_QS_ADVISORY_RESEARCH.md) güncel takip kaynağıdır. Runtime `qs` remediation’i uygulandığı için `qs` bulgusu güncel blocker değildir.

| Alan | Güncel durum | Release etkisi |
|---|---|---|
| Application runtime SCA | **PASS** | `qs` yamalı sürüme yükseltilmiştir. |
| Expo/Metro toolchain advisory’leri | **EXCEPTION / izleme gerekli** | Gate’in exact kayıtlı istisnalarıdır; upstream uyumlu çözüm çıktığında yeniden değerlendirilmelidir. |
| SPDX / attribution | **PASS** | Compound SPDX policy geçmiştir; attribution inventory üretilmiştir. |

## Internal, Toolchain ve External Blocker’lar

| Sınıf | Durum | Açıklama |
|---|---:|---|
| P17 internal P0/P1 | **Yok** | Bu closure’da doğrulanmış, uygulanabilir iç P0/P1 açık kalmamıştır. |
| Toolchain risk takibi | **Açık** | Deterministic SCA gate’te iki approved Expo/Metro high advisory exception’ı vardır; policyyi geçse de upstream remediation izlenmelidir. |
| Legal/release governance | **BLOCKED / EXTERNAL** | Onaylı şirket kimliği, üretim hukuk metinleri ve ilgili jurisdiction/legal review release öncesi gereklidir. |
| Production platform | **BLOCKED / EXTERNAL** | DNS/HTTPS, production callback endpoint’leri, gerçek cihaz izin/return-flow E2E ve store signing doğrulanmamıştır. |
| Dış entegrasyon | **BLOCKED / EXTERNAL** | Gerçek ödeme, scanner, SMS/e-posta/push, proxy communication ve APM kabulü credential olmadan yürütülmemiştir. |

## Credentials / Secrets Pending

| Değişken veya bağımlılık | Kullanım | Mevcut güvenli durum |
|---|---|---|
| `ENCRYPTION_KEY` | Production data encryption | Zorunlu; eksikse production fail-closed. |
| `ENCRYPTION_LEGACY_KEY` | Yalnız legacy ciphertext migration penceresi | Opsiyonel; eksikse legacy decrypt fail-closed. |
| `MEDIA_SCANNER_CALLBACK_SECRET`, `MEDIA_SCANNER_CRON_SECRET` | Scanner callback ve operational cron | Yapılandırılmamışsa callback/cron kabul edilmez. |
| `DOCUMENT_RETENTION_CRON_SECRET` | Retention scheduler | Yapılandırılmamışsa signed scheduler çalışmaz. |
| iyzico/Stripe credential ve webhook endpoint’i | Gerçek ödeme, refund, settlement | Gateway adapter `NOT_CONFIGURED` / fail-closed. |
| NetGSM / SendGrid / Expo veya FCM credential’ları | SMS, e-posta ve push teslimatı | Sahte teslimat kaydı üretmeden fail-closed. |
| `PROXY_COMM_PROVIDER_API_KEY` | Maskeli iletişim | Adapter `NOT_CONFIGURED`. |
| `APM_ENDPOINT`, `APM_API_KEY` | Harici observability exportu | Yerel redacted log sözleşmesi devam eder; dış export yoktur. |
| DNS/HTTPS, approved legal texts, fiziksel cihazlar | Public release ve native E2E | Release gate blokludur. |

## Historical / Superseded Evidence

P12, P13, P14, P15 ve P16’ya ait önceki detaylı durum raporu bu dosyadan silinmemiştir; P17 current section’ın eski sayı ve sürümlerle karışmaması için SHA-256’sı `f9839202ac950935bbfbc330fb5390ffb1d9b3cc732419381d03bc0aeb02ed80` olan [korunmuş tarihçe eki](./archive/final-production-status-pre-p17.md) altında saklanmaktadır.

## Referanslar

- [P17 Final Closure Report](./compliance/P17_FINAL_CLOSURE_REPORT.md)
- [P17 SCA exception registry](./compliance/P17_SCA_EXCEPTIONS.json)
- [P17 qs advisory research](./compliance/P17_QS_ADVISORY_RESEARCH.md)
- [P17 Platform Quality Report](./compliance/P17_PLATFORM_QUALITY_REPORT.md)
- [P16 Final Closure Report](./compliance/P16_FINAL_CLOSURE_REPORT.md)
