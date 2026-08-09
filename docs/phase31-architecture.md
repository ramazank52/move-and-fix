# Phase 31 — Geriye Uyumlu Tamamlama Mimarisi

**Yazar:** Manus AI  
**Amaç:** 51 gereksinimde kanıtlanan eksikleri, mevcut müşteri/profesyonel/ödeme/mesajlaşma akışlarını bozmadan tamamlamak.

## Temel Kararlar

Mevcut `users`, `providers`, `service_requests`, `offers`, `job_tracking`, `messages`, `payments`, `reviews` ve wallet tabloları korunacaktır. Yeni alanlar mümkün olduğunca **additive** tablo ve nullable/default kolonlarla eklenecek; var olan kimlikler, route’lar ve status değerleri yeniden adlandırılmayacaktır. Eski istemcilerin kullandığı `requests.create`, `offers.*`, `tracking.*`, `messages.*` ve `payments.*` sözleşmeleri çalışmaya devam edecektir.

> **Invariant:** Yeni hiçbir işlem, kullanıcı kimliğini veya sahipliği istemciden güvenilir kabul etmeyecektir. Sahiplik ve rol her prosedürde `ctx.user`, talep sahibi, atanmış profesyonel ve provider profili üzerinden sunucu tarafında çözülecektir.

## Additive Veri Modeli

| Model | Amaç | Kritik kısıtlar |
|---|---|---|
| `service_subcategories` | Ana kategoriye bağlı alt hizmet kataloğu | `(categoryId, slug)` unique; aktiflik ve sıralama |
| `service_request_details` | Boya, elektrik, tesisat, temizlik, nakliye, kurye ve çekiciye özgü ayrıntılar | `requestId` unique; normalize rota/kat/asansör alanları; doğrulanmış JSON attributes |
| `service_request_media` | Talep, önce/sonra, kanıt ve itiraz fotoğraf-video-dokümanları | owner/participant erişimi; MIME/boyut/hash; immutable storage key |
| `provider_documents` | Kimlik, ehliyet, SRC, psikoteknik ve diğer belgeler | Provider ownership; pending/approved/rejected/superseded; admin reviewer audit |
| `user_contacts` | E-posta/telefon ve doğrulama durumu | `(type, normalizedValue)` unique; birincil iletişim bayrağı |
| `verification_challenges` | E-posta, SMS, parola sıfırlama ve hesap kurtarma challenge’ları | Kod/token yalnız hash; expiry, attempt limit, single-use |
| `local_auth_credentials` | Mevcut OAuth’u bozmadan opsiyonel güvenli e-posta/parola girişi | `userId` unique; `scrypt` hash; token veya düz parola saklanmaz |
| `job_evidence` | Profesyonelin iş öncesi/sonrası/bitirme kanıtları ve AI sonucu | Talep/atanmış provider bağı; medya zorunlu; AI sonucu ayrı durum |
| `job_completions` | “İşi Bitirdim” → müşteri kararı → otomatik onay zinciri | `requestId` unique; `autoReleaseAt`; release idempotency key unique |
| `job_disputes` | Müşteri/profesyonel itiraz ve admin çözümü | Bir açık dispute/talep; karar veren admin ve gerekçe audit’i |
| `push_devices` | Kullanıcıya ait Expo/FCM/APNs cihaz kayıtları | Token hash unique; revoke/lastSeen; platform bilgisi |
| `in_app_notifications` | Uygulama içi bildirim kutusu | Kullanıcı sahipliği; readAt; event reference |
| `notification_deliveries` | Push/SMS/e-posta teslimat kayıtları | Kanal, provider event, durum, retry ve hata; idempotency key |
| `communication_sessions` | Numara gizleme ve sesli görüşme sağlayıcı oturumu | Sadece iş katılımcıları; expiry; dış provider yoksa fail-closed |
| `commission_policies` | Standart %10 ve admin tarafından değiştirilebilir politika | BPS; category/country/tier scope; aktif zaman aralığı; ödeme anında snapshot |
| `supported_countries` | Ülke, locale, saat dilimi ve ölçü sistemi | ISO ülke kodu unique; aktiflik; varsayılan locale/currency |
| `supported_currencies` | Para birimi ve minor-unit ayarı | ISO currency unique; exchange yoksa yalnız mevcut gateway currency |
| `system_settings` | MoveOS kontrollü özellik ve servis ayarları | Key unique; typed JSON; updatedBy; hassas secret saklanmaz |
| `audit_logs` | Kalıcı güvenlik ve yönetim denetim izi | Append-only; actor/action/entity/outcome/ip hash/metadata |

Mevcut tablolara yalnız şu geriye uyumlu kolonlar eklenecektir: `users.locale`, `users.countryCode`, `users.currency`; `service_categories.isActive` ve `sortOrder`; `service_requests.countryCode` ve `currency`; `payments.currency`. Var olan satırlar için `tr`, `TR` ve `TRY` varsayılanları kullanılacaktır.

## Hizmet Ayrıntısı Sözleşmesi

`service_request_details.serviceType` aşağıdaki sabit türlerden birini tutacaktır: `generic`, `painting`, `electrical`, `plumbing`, `cleaning`, `moving`, `courier`, `tow_truck`, `roadside`. Ortak rota ve taşınma kolonları sorgulanabilir tutulacak; hizmete özel esnek alanlar `attributesJson` içinde **Zod ile serviceType’a göre doğrulanmış** biçimde saklanacaktır.

| Hizmet | Zorunlu/opsiyonel alanlar |
|---|---|
| Boya | oda/adet, yaklaşık m², iç/dış cephe, malzeme durumu |
| Elektrik | arıza türü, enerji kesildi mi, aciliyet, güvenlik notu |
| Tesisat | kaçak/tıkanıklık/montaj türü, su vanası durumu, aciliyet |
| Temizlik | mekan türü, oda sayısı, m², sıklık, malzeme tercihi |
| Nakliye | nereden/nereye, katlar, asansörler, eşya özeti, araç gereksinimi |
| Kurye | alınacak/teslim adresi, paket türü/ağırlığı, alıcı notu |
| Çekici | araç türü/plaka, arıza türü, başlangıç/hedef, çekme gereksinimi |

Mevcut genel talep ekranı geriye uyumlu kalacak; kategori seçimi sonrasında ilgili dinamik alanları gösterecektir. Özel kurye/çekici/yol yardım ekranları aynı sunucu sözleşmesine taşınacak ve ayrı sahte veri tutmayacaktır.

## Medya ve Belge Güvenliği

Mobil istemci `FormData` ile yalnız izin verilen MIME türlerini backend upload endpoint’ine gönderecektir. Backend kimliği mevcut bearer/cookie oturumundan çıkaracak; dosya türünü, boyutunu ve SHA-256 özetini doğruladıktan sonra `storagePut` kullanacaktır. İstemciden gelen storage key, kullanıcı id veya erişim rolü kabul edilmeyecektir.

| Amaç | Türler | Üst sınır | Erişim |
|---|---|---:|---|
| Talep/kanıt görseli | JPEG, PNG, WebP | 10 MB | Talep sahibi, atanmış provider, admin |
| Talep/kanıt videosu | MP4, WebM, MOV | 50 MB | Talep sahibi, atanmış provider, admin |
| Profesyonel belge | JPEG, PNG, PDF | 15 MB | Belge sahibi provider ve admin |
| MoveAI ses kaydı | WebM, MP3, WAV, M4A | 16 MB | Yükleyen kullanıcı; transkripsiyon sonrası kontrollü erişim |

## Tamamlama, Kanıt ve Escrow Durum Makinesi

1. Atanmış profesyonel işi `in_progress` durumuna getirir.
2. Profesyonel en az bir `completion` kanıtı yükler ve `completion.submit` çağırır.
3. Sunucu, kanıt medyasını multimodal LLM ile yapılandırılmış biçimde analiz eder. LLM sonucu **karar vermez**; yalnız risk/uygunluk sinyali üretir.
4. `job_completions` durumu `awaiting_customer` olur ve `autoReleaseAt = submittedAt + 48 saat` yazılır.
5. Müşteri `approve` çağırırsa tek transaction içinde iş tamamlanır ve ödeme idempotent biçimde release edilir.
6. Müşteri `dispute` açarsa otomatik release durur; ödeme held kalır.
7. Due-job runner, yalnız `awaiting_customer`, açık dispute olmayan ve `autoReleaseAt <= now` kayıtları kilitleyip `auto_approved` yapar; aynı release idempotency key ile ikinci ödeme engellenir.
8. Admin dispute çözümü `release_to_provider` veya `refund_customer` olabilir; karar kalıcı audit log’a yazılır.

> **Zamanlama kararı:** Web sunucusu içindeki `setInterval` tek güvenilir kaynak olmayacaktır. İdempotent `processDueAutoReleases()` fonksiyonu, korumalı cron endpoint’i ve kullanıcı/admin API çağrılarında düşük maliyetli lazy sweep sağlanacaktır. Production domain ve scheduler sağlanana kadar gerçek 48 saat otomasyonu **BLOCKER**, fonksiyon ve testleri ise doğrulanabilir olacaktır.

## Ödeme ve Komisyon

Varsayılan standart politika `1000 BPS = %10` olacaktır. Aktif politika ödeme quote oluşturulurken sunucuda çözülecek ve `payments.commissionRateBps`, `commissionAmount`, `providerPayout` alanlarına snapshot olarak yazılacaktır. Sonraki admin politika değişikliği eski ödemeyi değiştirmeyecektir. Stripe/iyzico callback ve webhook’ları mevcut imza doğrulama/event ledger yolunu kullanmaya devam edecektir.

## Hesap Doğrulama ve Kurtarma

Mevcut Manus OAuth birincil auth olarak korunacaktır. Yerel e-posta/parola opsiyonel olarak eklenirse parola `crypto.scrypt` ile hash edilecek; reset tokenı yalnız hash, expiry ve single-use kaydıyla tutulacaktır. E-posta/SMS gönderimi gerçek sağlayıcı credential yokken fail-closed olacaktır. Test ortamında dış sağlayıcı çağrısı yerine kod/tokenın kendisi değil, yalnız teslimat adapter çağrısı doğrulanacaktır.

## MoveOS ve Yönetim

MoveOS ayrı backend kullanmayacaktır. Mevcut owner API, ortak DB ve servis katmanına bağlanacak; mock owner token yalnız test ortamında kalacak. Gerçek production owner oturumu mevcut Manus admin kimliği ve role kontrolüyle sağlanacaktır. Yönetim yüzeyi şu gerçek CRUD alanlarını kapsayacaktır: kategori/alt kategori, ücret/komisyon, kullanıcı/provider, belge inceleme, iş/dispute, ülke/para birimi, özellik bayrağı ve bildirim ayarı.

## Yerelleştirme

Uygulama geneline tek `LocaleProvider` bağlanacaktır. İlk kapsam `tr`, `en`, `de`, `fr`, `ar`, `ru`; Arapça için RTL ve hizalama; `Intl` üzerinden tarih/saat/para/ölçü formatlama; kullanıcı tercihinin AsyncStorage ve server profilinde kalıcılaştırılmasıdır. Hardcoded Türkçe metinler modül modül anahtarlara taşınacak; eksik çeviri Türkçeye kontrollü fallback verecek ve key metnini UI’da göstermeyecektir.

## API Grupları

| Grup | Prosedürler |
|---|---|
| `catalog` | subcategory listesi ve admin CRUD |
| `requests` | mevcut create/get/list + detail/media sözleşmeleri |
| `uploads` | owner-scoped request media, evidence, provider document ve AI audio |
| `verification` | contact list, request challenge, verify, request reset, reset credential |
| `providerDocuments` | provider list/upload; admin review |
| `completion` | evidence list, submit, approve, dispute, get state |
| `disputes` | participant get; admin list/resolve |
| `notifications` | device register/revoke, inbox, mark read |
| `communication` | masked call/voice session request; provider yoksa blocker response |
| `settings` | locale/country/currency; admin system settings |
| `automation` | secret-protected due release runner ve health sonucu |

## Test ve Geçiş Kapıları

Her modül tamamlandığında sırasıyla migration SQL incelemesi, DB uygulaması, TypeScript, lint ve hedefli testler çalıştırılacaktır. Faz sonunda tüm 254 eski test, yeni testler, sunucu build’i, iOS/Android export’u ve 14 authenticated render yeniden çalışacaktır. Her owner/mutation prosedürü için anonim, yanlış rol, başka kullanıcı kaynağı, geçersiz durum geçişi, duplicate/idempotency ve validation testleri zorunludur.
