# Phase 31 — 51 Gereksinim İzlenebilirlik Denetimi

**Kaynak gereksinim:** `/home/ubuntu/upload/Pasted_content_34.txt`  
**Denetim tarihi:** 2026-08-09  
**Başlangıç checkpoint’i:** `40794a16`  
**İlke:** Mevcut çalışan özellikleri değiştirme veya kopyalama; yalnızca kanıtlanmış eksik, yarım, mock veya güvensiz alanları tamamla.

## Doğrulanmış Mevcut Temel

| Alan | Mevcut gerçek kanıt |
|---|---|
| Kimlik ve rol yönlendirme | `users`, `providers`; `app/index.tsx`; `lib/navigation.ts`; OAuth tabanlı oturum; müşteri/provider/admin route yönlendirmesi |
| Hizmet talebi ve teklifler | `service_requests`, `offers`; `requests.*`, `offers.*`; müşteri oluşturma ve profesyonel fırsat/teklif ekranları |
| Takip | `job_tracking`; owner-or-assigned-provider yetkilendirmesi; native harita ve lifecycle prosedürleri |
| Mesajlaşma | `messages`; `assertMessageParticipant`; konuşma/gönderme/okundu işlemlerinde fail-closed IDOR koruması |
| Yorum | `reviews`; tamamlanmış talep başına tek yorum; provider yorum API/UI |
| Ödeme | `payments`, `payment_webhook_events`; Stripe/iyzico gateway, server-side quote, webhook imza doğrulama ve event idempotency |
| Wallet | `wallet_accounts`, `wallet_transactions`, `wallet_withdrawals`; gerçek DB-backed summary/history/withdraw API ve UI |
| Güvenlik | CSRF, rate limit, RBAC, IDOR testleri, merkezi ENV sözleşmesi, webhook doğrulama, secret bundle taraması |
| Kalite | Başlangıçta TypeScript/lint/build temiz; 254/254 test PASS; iOS/Android Expo export PASS; 14/14 authenticated render PASS |

## Mevcut Şemanın Sınırları

`drizzle/schema.ts` şu tabloları içeriyor: `users`, `service_categories`, `providers`, `provider_favorites`, `service_requests`, `offers`, `job_tracking`, `messages`, `payments`, `payment_webhook_events`, `reviews`, `wallet_accounts`, `wallet_transactions`, `wallet_withdrawals`.

Aşağıdaki production alanları için henüz ayrı ve kalıcı model bulunmuyor: alt kategori; hizmete özgü talep alanları; talep medya ekleri; profesyonel belgeleri; doğrulama/kurtarma challenge’ları; iş kanıtı; müşteri onayı; dispute; kalıcı audit log; sistem/ülke/para birimi ayarları; dinamik komisyon politikası.

## Gereksinim Alanı Durum Özeti

| Gereksinimler | Durum | Doğrulanmış sonuç |
|---|---|---|
| 1–4 | **IMPLEMENTED** | Müşteri/profesyonel, talep oluşturma, profesyonele fırsat düşmesi ve teklif akışı gerçek API/DB ile mevcut |
| 5–6 | **PARTIAL** | MoveAI metin akışı mevcut; sesli kayıt/transkripsiyon UI→API zinciri eksik. Kategoriler mevcut fakat alt kategori modeli yok |
| 7–13 | **MISSING/PARTIAL** | Genel talep alanları var; boya, elektrik, tesisat, temizlik, nakliye, kurye ve çekiciye özgü alanlar tek kalıcı sözleşmede tutulmuyor |
| 14–15 | **PARTIAL** | Provider konumları ve tracking mesafe hesabı mevcut; profesyonel eşleştirmede gerçek koordinata göre sıralama/filtre tam değil |
| 16 | **IMPLEMENTED** | Harita ve aktif iş mesafe/ETA görünümü mevcut; web fallback native harita değildir |
| 17–18 | **PARTIAL** | Kurye/çekici için başlangıç-hedef UI’ları var; genel nakliye kat/asansör/eşya modeli ve backend persist sözleşmesi eksik |
| 19 | **MISSING** | Talep/iş kanıtı için güvenli çoklu fotoğraf-video ek modeli ve owner-scoped storage API yok |
| 20–21 | **MISSING** | Profesyonel belge yükleme, tür, doğrulama durumu, admin karar ve audit altyapısı yok |
| 22 | **IMPLEMENTED** | Yıldız/puan/yorum modeli ve tamamlanmış iş doğrulaması mevcut |
| 23 | **IMPLEMENTED** | Hizmet bağlamlı, katılımcı doğrulamalı mesajlaşma mevcut |
| 24 | **PARTIAL/EXTERNAL_BLOCKER** | Telefon maskeleme yardımcısı var; gerçek proxy numara/call relay telekom sağlayıcısı yok |
| 25 | **EXTERNAL_BLOCKER** | Gerçek zamanlı sesli görüşme/call relay sağlayıcısı ve credential gerekir; mevcut voice transcriber sesli arama değildir |
| 26 | **PARTIAL/EXTERNAL_BLOCKER** | Expo token alma ve notification servis iskeletleri var; gerçek FCM/APNs credential ve teslimat doğrulaması gerekir |
| 27–28 | **MISSING/PARTIAL** | E-posta/telefon UI ekranları bulunuyor; kalıcı challenge, expiry, attempt limit, token hash, şifre sıfırlama ve hesap kurtarma backend’i yok |
| 29–30 | **IMPLEMENTED** | Provider lifecycle ile iş başlangıç/bitiş ve `completeJob` mevcut; kanıt zorunluluğu yok |
| 31–35 | **MISSING** | İş fotoğraf/kanıtı, multimodal AI analizi, müşteri onayı, dispute ve güvenilir 48 saat otomatik serbest bırakma yok |
| 36 | **IMPLEMENTED** | Ödeme gateway ve escrow tabloları/akışları mevcut; canlı başarı credential olmadan fail-closed |
| 37 | **PARTIAL** | Standart platform komisyonu merkezi ödeme politikasında %10’a hizalandı; yönetici tarafından değiştirilebilen, sürümlü komisyon politikası henüz uygulanmadı |
| 38–39 | **IMPLEMENTED** | DB-backed provider wallet, bakiye/işlem geçmişi ve para çekme mevcut |
| 40–41 | **IMPLEMENTED** | Server-side ücret, imza doğrulama, webhook event ledger, idempotency ve double-payment korumaları mevcut |
| 42–43 | **PARTIAL** | Ayrı `moveos/` web arayüzü, ortak platform oturumu ve gerçek `/api/owner/*` API’leriyle çalışır; sabit owner token/giriş ve inşa edilmiş yönetici context’i kaldırıldı. Kategori, kullanıcı ve hizmet yüzeyi gerçek DB yolundadır; tam içerik/sistem ayarı yönetimi henüz kapsam dışıdır |
| 44–45 | **PARTIAL** | `i18n-core` ve kalıcı sağlayıcı tr/en/de/fr/ar/ru dil sözleşmesi, RTL yön bilgisi, ayarlar bağlantısı ve sekme başlıklarında uygulanmıştır. Ekranlardaki tüm sabit Türkçe metinlerin çeviri anahtarlarına göçü tamamlanmamıştır |
| 46–47 | **PARTIAL** | TRY major-unit ödeme politikası korunur; güvenli locale para/numara/tarih biçimleyicileri ve seçilebilir arayüz para birimi tercihi eklendi. Dinamik çoklu-para ödeme tahsilatı ve ülke bazlı ödeme politikası henüz yoktur |
| 48 | **PARTIAL** | Temel güvenlik var; rate limit ve audit log in-memory, fraud/abuse kuralları sınırlı |
| 49 | **IMPLEMENTED/PARTIAL** | 254 test mevcut ve temel akışlar güçlü; yeni alanlar için testler henüz yok |
| 50 | **PARTIAL** | Merkezi hata sınıfları ve logger var; kalıcı/harici gözlemleme backend’i yok |
| 51 | **PARTIAL** | Expo iOS/Android export ve production start scripti var; Docker/CI görünmüyor, gerçek credential/domain/fiziksel cihaz dış blocker |

## Mock veya Production Dışı Yollar

| Dosya | Bulgular |
|---|---|
| `server/_core/ownerRestAdapter.ts` | Sabit owner login/2FA endpointleri `410 Gone`; yönetim REST çağrıları yalnız ortak oturum ve `admin` rolüyle owner router’a yönlendirilir |
| `server/_core/ownerRouter.ts` | Dashboard, kategori, kullanıcı ve hizmet sorguları ortak veri katmanından gelir; AI komut etkileri onaylı yürütücü yoksa fail-closed kalır |
| `server/services/AIService.ts` | Bazı provider/approval yollarında mock implementasyon |
| `server/services/NotificationService.ts` ve `NotificationServiceV2.ts` | Gerçek push/SMS/e-posta teslimat sağlayıcıları tamamlanmamış |
| `server/services/PaymentGatewayService.ts` | Bazı raporlama/bakiye yardımcıları mock; gerçek checkout yolu ayrı `server/payments/*` modüllerinde |
| `server/services/WalletService.ts` | Eski servis katmanında mock yollar; mobil wallet’ın gerçek yolu `server/db.ts` ve `routers.ts` üzerinden çalışıyor |
| `lib/notifications.ts` | Geliştirme ortamında mock Expo push token fallback’i |

## Dış Bağımlılık Blocker’ları

Gerçek Stripe/iyzico, FCM/APNs, SMS, e-posta, telekom proxy/voice, production domain/callback URL ve fiziksel cihaz erişimi sağlanmadan canlı teslimat veya ödeme başarısı üretilmeyecek. Bu bağımlılıklar kod eksikliğiyle karıştırılmayacak; sandbox içinde adapter, fail-closed sözleşme ve test-double doğrulamaları tamamlanacak.

## Phase 7 Ödeme ve Para Çekme Sertleştirmesi — 15 Ağustos 2026

| Kontrol | Uygulama ve doğrulama kanıtı |
|---|---|
| Profesyonel yetkisi | `wallet.withdraw` profesyonel profilini router’da zorunlu tutar; veri katmanı ayrıca `isVerified = 1`, `verificationStatus = approved` ve inceleme zaman damgasını transaction içinde yeniden doğrular. |
| IBAN sözleşmesi | Boşlukları temizlenmiş, büyük harfe çevrilmiş yalnız `TR` + 24 rakam biçimi kabul edilir; saklanan metadata ve para çekme kaydı normalize IBAN’ı kullanır. |
| Bakiye güvenliği | Koşullu bakiye düşümü yalnız yeterli kullanılabilir bakiye varsa başarılı olur; yetersiz bakiye fail-closed `FORBIDDEN` sonucu verir. |
| Gerileme testleri | Yeni `payment-withdrawal-security.test.ts`: normalizasyon, onaylı profesyonel koşulu, müşteri reddi, geçersiz IBAN, yetersiz bakiye ve auth-bound payload senaryolarını kapsar. |
| Kalite kapıları | `pnpm check`, `pnpm lint`, `pnpm build`, tam `pnpm test` paketi: 35 dosya / 292 test geçti. iOS ve Android Expo export ile hedefli istemci sır taraması geçti. |

## Phase 8 MoveOS ve Yerelleştirme Sertleştirmesi — 15 Ağustos 2026

| Kontrol | Uygulama ve doğrulama kanıtı |
|---|---|
| Ayrı MoveOS web arayüzü | `moveos/` altında API-first web arayüzü eklendi ve backend’de `/moveos` statik rotasıyla sunuldu. Arayüz yalnız `/api/auth/me` ve yönetici-korumalı `/api/owner/*` üzerinden veri alır; ayrı backend oluşturulmadı. |
| Yönetici kimliği | Sabit owner token/parola ve inşa edilmiş context kaldırıldı. Geçersiz veya oturumsuz yönetim isteği HTTP `401`, yönetici olmayan oturum `403` ile fail-closed döner. |
| Gerçek veri yolu | Dashboard, kategoriler, kullanıcılar, hizmetler, platform finans özeti ve analizler ortak DB yardımcılarına bağlandı. Kategori ekleme/güncelleme/arşivleme gerçek API üzerinden gerçekleşir; AI etkili komutları onaylı yürütücü yoksa değişiklik yapmaz. |
| Yerelleştirme | Kalıcı dil/para tercihi, tr/en/de/fr/ar/ru dil meta verisi, RTL yön bilgisi ve güvenli tarih/numara/TRY biçimleme `i18n-core` ile ayrıştırıldı; uygulama sağlayıcısı, genel ayarlar, dil ekranı ve ana sekme başlıklarına bağlandı. |
| Gerileme doğrulaması | Yetkisiz MoveOS çağrısı HTTP `401`, `/moveos/` statik girişi HTTP `200`; `moveos-router-contract` ve `localization-contract` testleri dahil 37 dosyada 282 test geçti. `pnpm check`, lint, server build, iOS/Android Expo export ve istemci sır taraması geçti. |

## Uygulama Sırası

1. Additive şema/migration: alt kategori, request detail/media, provider document, verification challenge, job evidence, completion approval/dispute, audit/settings/country/currency.
2. Owner-scoped storage ve service-specific request sözleşmeleri; konum bazlı eşleştirme.
3. Belge doğrulama ve hesap recovery API/UI.
4. Kanıt → AI analiz → müşteri onayı/dispute → 48 saat idempotent release lifecycle.
5. Dinamik komisyon, owner CRUD ve mock production yollarının fail-closed gerçek DB uygulamaları.
6. i18n/RTL/locale/currency altyapısı ve ekran göçü.
7. Kalıcı audit/fraud, performans/operasyon hardening.
8. Yeni unit/integration/security/E2E testleri; eski 254 test, 14 render ve iki mobil export regresyonu.
