# Move&Fix Project TODO

## Rollback
- [x] aa48dc5e geri alma talebi kullanıcı tarafından iptal edildi; geri alma uygulanmadı
- [x] Phase 6 otomatik escrow callback sırrının test/servis ortamına yüklenmesini kök neden düzeyinde doğrula

## Phase 1: Foundation
- [x] Configure theme colors (brand orange)
- [x] Set up tab navigation structure (customer tabs)
- [x] Add icon mappings for all tabs
- [x] Create shared components (ServiceCard, CategoryChip, StatusBadge)

## Phase 2: Authentication & Profile
- [x] Onboarding screens (3 slides)
- [x] Login screen
- [x] Register screen (customer/provider role selection)
- [x] Profile screen with user info
- [x] Address management

## Phase 3: Home & Discovery
- [x] Home screen with search, categories, nearby providers
- [x] Service categories grid
- [x] Provider listing with filters
- [x] Provider detail/profile screen
- [x] Favorites system

## Phase 4: Service & Offers
- [x] Create service request (multi-step form)
- [x] Offer system (send/receive/compare offers)
- [x] Job tracking screen
- [x] Review and rating system

## Phase 5: Communication & Payments
- [x] Chat/messaging system
- [x] Notifications screen
- [x] Escrow payment flow
- [x] Payment history

## Phase 6: Provider & Admin
- [x] Provider dashboard (earnings, stats)
- [x] Provider job management
- [x] Provider calendar/availability
- [x] Admin dashboard
- [x] Category management (admin)
- [x] User management (admin)

## Phase 7: AI & Premium
- [x] AI Assistant chat (MoveAI)
- [x] AI-powered service suggestions
- [x] Multi-language support (TR, EN, DE, FR, AR)
- [x] Premium membership plans
- [x] Campaign/coupon system

## Phase 8: Branding
- [x] Generate app logo
- [x] Configure app.config.ts branding
- [x] Splash screen setup

## Phase 9: New Features (v1.1)
- [x] Add Kurye/Evrak service category with km-based pricing
- [x] Add Çekici (Tow Truck) service category with km-based pricing
- [x] Add Yol Yardım (Roadside Assistance) category with km-based pricing
- [x] KM-based pricing calculator component
- [x] Map integration - show provider locations in real-time
- [x] Map route display between customer and provider
- [x] Push notification system integration
- [x] Backend API connection for real user auth
- [x] Database integration for persistent data

## Phase 10: Legal & Compliance Module (v1.2)
- [x] Kullanım Koşulları ekranı
- [x] Gizlilik Politikası ekranı
- [x] KVKK Aydınlatma Metni ekranı
- [x] Çerez Politikası ekranı
- [x] Aracılık Beyanı tam ekran popup
- [x] Zorunlu kayıt onayı (6 checkbox)
- [x] Hizmet Sağlayıcı Sözleşmesi
- [x] Müşteri Sözleşmesi
- [x] Kurumsal Firma Sözleşmesi
- [x] Ödeme ve İade Politikası
- [x] Yasaklı Faaliyetler
- [x] Sorumluluk Sınırlandırması
- [x] Dijital Onay Sistemi (tarih, IP, cihaz kaydı)
- [x] İlk kullanım bilgilendirme ekranı

## Phase 11: Photo Upload & Payment & Maps (v1.2)
- [x] Fotoğraf yükleme özelliği (hizmet taleplerine arıza fotoğrafı)
- [x] Ödeme gateway entegrasyonu (escrow akışı)
- [x] Google Maps API entegrasyonu (gerçek harita)

## Phase 12: Auth Verification, Reviews & Live Tracking (v1.3)
- [x] E-posta doğrulama ekranı (OTP kodu)
- [x] SMS doğrulama ekranı (OTP kodu)
- [x] Doğrulama durumu profil badge'i
- [x] Yorum ve puanlama sistemi (1-5 yıldız + metin)
- [x] Hizmet sonrası değerlendirme popup'ı
- [x] Usta profil sayfasında yorumlar bölümü
- [x] Canlı konum takibi (çekici/kurye)
- [x] Gerçek zamanlı harita üzerinde usta konumu
- [x] Tahmini varış süresi gösterimi

## Phase 13: Referral, Notification Sounds & Portfolio (v1.4)
- [x] Referans/kupon sistemi (arkadaş davet et, indirim kazan)
- [x] Kupon kodu uygulama ekranı
- [x] Anlık bildirim sesleri ve titreşim ayarları
- [x] Usta portfolyo galerisi (önceki işler fotoğrafları)
- [x] Portfolyo fotoğraf detay görünümü

## Phase 14: Comparison, Voice Messages & History Report (v1.5)
- [x] Favorilere ekleme ve karşılaştırma (yan yana karşılaştırma)
- [x] Sesli mesaj gönderme ve alma
- [x] Hizmet geçmişi raporu (istatistikler)

## Phase 15: Chat Notifications, Provider Filter & Calendar (v1.6)
- [x] Canlı sohbet bildirimleri
- [x] Usta filtreleme (puan, fiyat, mesafe)
- [x] Hizmet takvimi (planlanan ve geçmiş hizmetler)

## Phase 16: Production-Ready Audit & Fixes
- [x] 8 kritik bulgu düzeltildi (tür güvenliği, merkezi hata, bağımlılık, CSRF, rate limiting, API key, Swagger, servis arayüzleri)
- [x] 27 yüksek öncelikli bulgu düzeltildi (kod kalitesi, güvenlik, performans, operasyon, dokümantasyon)
- [x] E2E kullanıcı senaryo testleri (24 test, tümü başarılı)
- [x] MoveOS REST adapter entegrasyonu (ownerRestAdapter.ts)

## Phase 17: UI/UX Redesign to Premium Brand
- [x] Tema sistemini referans tasarıma göre güncelle (sıcak renkler, kartlar, gölgeler)
- [x] Ana Sayfa ekranını yeniden tasarla
- [x] Keşfet ve Kategori ekranlarını yeniden tasarla
- [x] Provider detay ve Tab layout'ları güncelle
- [x] İşlerim, Mesajlar, Profil ekranlarını yeniden tasarla
- [x] Ödeme checkout ekranını güncelle
- [x] Sohbet ekranını premium tasarımla güncelle
- [x] MoveAI asistan ekranını oluştur ve tasarla
- [x] Tüm ekranları canlı preview'da doğrula — responsive, tema tutarlılığı, interaksiyon
- [ ] Mobil cihazda QR ile test et (Expo Go)

## Phase 18: Production Setup & Secrets
- [ ] API anahtarlarını yapılandır (iyzico, Stripe, SMS, push notifications)
- [ ] MoveOS admin panelini canlı backend'e bağla
- [ ] E2E testleri çalıştır ve tüm senaryoları doğrula
- [ ] Build ve deployment hazırlığını tamamla
- [ ] Final checkpoint ve yayın hazırlığı

## Phase 19: Referans Görsel UI Uygulaması
- [x] Design System'i referans görselin renk/typography/spacing değerlerine birebir güncelle
- [x] Ana Sayfa — referans görsel layout: selamlama, arama, MoveAI banner, hızlı erişim, aktif iş kartı, kategoriler, yakındaki ustalar
- [x] Keşfet — arama, kategori filtreleri, kategori listesi DB'den
- [x] MoveAI — gerçek LLM akışı, sıcak/doğal konuşma, service request oluşturma
- [x] Hizmet Talebi — 5 adımlı stepper (Hizmet→Detay→Zaman→Konum→Onay), fotoğraf yükleme, aciliyet, konum
- [x] Profesyonel Listesi — gerçek kimlik/avatar, kategori, puan, yorum sayısı, konum durumu, müsaitlik, ETA ve fiyat
- [x] Teklifler — gerçek teklif kartları, karşılaştırma, kabul/reddet sahiplik kontrolü ve durum yönetimi
- [x] Ödeme — gerçek hizmet/profesyonel özeti, ücret/toplam, MoveWallet durumu, Stripe/iyzico ve fail-closed güvenlik akışı
- [x] Aktif İş / Canlı Takip — gerçek durum, native harita/web fallback, rota/ETA, mesaj, provider-only konum paylaşımı ve sıralı lifecycle
- [x] İşlerim — gerçek lifecycle sekmeleri: Aktif, Teklifler, Planlanan, Tamamlanan + empty/loading/error states
- [x] Mesajlar — gerçek conversation list, chat screen, katılımcı/rol, timestamp, unread/okundu durumu ve son mesaj
- [x] MoveWallet — bakiye, para ekle, gönder, işlem geçmişi, ödeme, iade
- [x] Profil — profil bilgileri, adresler, ödeme yöntemleri, MoveWallet, favoriler, ayarlar, güvenlik, bildirimler, çıkış

## Phase 20: Profesyonel Uygulama Ekranları
- [x] Professional Dashboard — bugünkü kazanç, aktif işler, yeni teklifler, müsaitlik toggle, performans, puan
- [x] Yeni İş Fırsatları — hizmet, mesafe, bütçe, konum, teklif ver butonu
- [x] Provider lifecycle — işi gör, teklif ver, teklif yönet, kabul edilen işi gör, status güncelle, iş tamamla, kazanç, mesaj

## Phase 21: Loading / Error / Empty States
- [ ] Her ana ekrana loading state ekle
- [ ] Her ana ekrana empty state ekle (teklif yok, profesyonel yok, mesaj yok, aktif iş yok)
- [ ] Her ana ekrana error state ekle (internet yok, ödeme başarısız, konum alınamadı, MoveAI cevap veremedi)
- [ ] Offline/network failure durumlarını ele al

## Phase 22: Mock Data → Gerçek API
- [x] lib/data/providers.ts → tRPC providers.nearby/list API'ye bağla
- [x] lib/data/categories.ts → tRPC requests.categories veya DB'den getir
- [x] lib/data/jobs.ts → tRPC requests.list/providers.myJobs API'ye bağla
- [x] lib/data/messages.ts → tRPC messages.conversations API'ye bağla
- [x] app/payment/checkout.tsx → tRPC payments.create/initializeGateway API'ye bağla
- [x] app/(tabs)/profile.tsx → use-auth hook'una ve gerçek kullanıcı verisine bağla
- [x] app/create-service.tsx → tRPC requests.create API'ye bağla, gerçek backend'e request oluştur

## Phase 23: Güvenlik Hardening
- [x] IDOR test — customer → another user's job access
- [x] Provider → another provider's job access
- [x] Privilege escalation test
- [x] Payment manipulation — client'tan gelen fiyat/commission/payout değerlerine güvenme
- [x] Duplicate payment prevention — idempotency
- [x] Duplicate offer/request prevention
- [x] Unauthorized wallet withdrawal prevention
- [x] Server-side fiyat/commission hesabı

## Phase 24: Auth Logout Test
- [x] Skipped auth logout testini gerçek testle değiştir
- [x] Logout sonrası protected endpoint erişim testi
- [x] Logout sonrası session/token davranışı testi
- [x] Logout sonrası cached user data temizleme testi
- [x] Logout sonrası eski oturum tekrar kullanım engeli testi

## Phase 25: Payment Hardening
- [x] Duplicate payment test
- [x] Payment timeout test
- [x] Gateway failure test
- [x] Webhook duplication/idempotency test
- [x] Amount tampering test
- [x] Unauthorized release/refund test
- [x] Provider payout calculation test
- [x] Commission calculation test

## Phase 26: Final Build & Test
- [x] TypeScript 0 hata
- [x] Lint 0 hata
- [x] Build PASS
- [x] Test 0 failed, skipped=0
- [x] Final production readiness raporu

## Phase 27: Route ve Navigation Bütünlüğü
- [x] Root route’u customer / provider / admin rolüne göre gerçek oturum verisiyle yönlendir
- [x] 14 referans ekranın tamamı için geçerli giriş ve çıkış navigation bağlantılarını doğrula
- [x] Geçersiz wallet alt route’larını çalışan ekran/aksiyonlarla değiştir
- [x] Profesyonel yeni iş fırsatları ekranını gerçek route ve provider lifecycle’a bağla
- [x] Auth, tab, nested route, back ve deep-link davranışlarını deterministik testlerle doğrula

## Phase 28: Mobil Checkout Gateway Sunumu ve Final Doğrulama
- [x] Expo yapılandırmasına Stripe native config plugin ve ödeme dönüş scheme’i ekle
- [x] Kök provider hiyerarşisine web-safe StripeProvider ekle
- [x] Checkout ekranını payments.create → payments.initializeGateway zincirine bağla
- [x] Stripe PaymentSheet ve iyzico hosted checkout akışlarını fail-closed olarak uygula
- [x] Eksik credential, kullanıcı iptali ve SDK/gateway hatalarını dürüst BLOCKER durumlarıyla göster
- [x] TypeScript, lint, build ve tüm testleri çalıştır; hata ve skipped test bırakma
- [x] Final production status raporunu doğrulanmış sonuçlarla hazırla

## Phase 29: Mesaj Güvenliği ve Kalan Referans Ekranlar
- [x] Mesaj gönderme, konuşma okuma, katılımcı bilgisi ve okundu işlemlerini requestId üzerinden gerçek müşteri–atanmış profesyonel çiftiyle sınırla
- [x] Mesajlaşma IDOR regresyon testlerini ekle ve anonim/üçüncü taraf/geçerli taraf senaryolarını doğrula
- [x] 09 İşlerim + 10 Mesajlar + mesaj güvenliği değişikliklerini TypeScript, lint ve test sonrası checkpoint’e al
- [x] 11 MoveWallet ekranını 11_movewallet.png referansına göre gerçek API verileriyle uygula ve render doğrula
- [x] 12 Profil ekranını 12_profil.png referansına göre uygula ve render doğrula
- [x] 13 Profesyonel Dashboard ekranını 13_profesyonel_dashboard.png referansına göre uygula ve render doğrula
- [x] 14 Yeni İş Fırsatları ekranını 14_yeni_is_firsatlari.png referansına göre uygula ve render doğrula
- [x] Final TypeScript, lint, build, test ve mobil export doğrulamasını tamamla
- [x] Kesin production durum raporunu teslim et

## Phase 30: Reset Sonrası Kurtarma ve 14/14 Final Doğrulama
- [x] 03 MoveAI standalone ekranının web viewport yüksekliğini ve koyu tema zeminini gerçek 390×844 render ile düzeltip doğrula
- [x] 04 Hizmet Talebi kategori adımını gerçek categories.list API verisine bağla; slug/sayısal route eşlemesini ve tam viewport koyu tema render’ını doğrula
- [x] 14 Yeni İş Fırsatları ekranını gerçek providers.newJobs ve categories.list verileri, kompakt referans kartları, teklif formu ve sabit profesyonel alt navigasyonla yeniden uygula
- [x] Yerel Expo web doğrulamasında API origin ve cookie kapsamını güvenli biçimde çöz
- [x] 01–14 authenticated render betiğini ve temas sayfası üreticisini yeniden kur
- [x] TypeScript, lint, build, tüm testler, mobil export ve 14/14 gerçek render doğrulamasını tamamla
- [x] Final checkpoint için tüm kod, test ve görsel doğrulama kanıtlarını hazırla
- [x] Kesin production durum raporunu teslim et

## Phase 31: Mevcut Sistemi Koruyarak Nihai Kapsamı Tamamlama
- [x] 51 gereksinimi mobil ekran, MoveOS, API, veritabanı, migration ve test kanıtlarıyla izlenebilirlik matrisine dönüştür
- [x] Müşteri ve profesyonel sistemleri ile iş ilanı oluşturma/ilgili profesyonele düşme akışlarında eksik veya kopya uygulama bulunmadığını denetle
- [x] Hizmet kategorileri, alt kategoriler ve boya/elektrik/tesisat/temizlik/nakliye/kurye/çekici hizmetlerine özgü talep alanlarını tamamla
- [x] Konum bazlı eşleştirme, harita, mesafe, nakliye nereden-nereye rotası, kat/asansör/eşya ayrıntıları ve fotoğraf/video yüklemeyi production standardında doğrula
- [ ] Profesyonel belge doğrulama ile kimlik/ehliyet/SRC/psikoteknik belge altyapısını yetkilendirme ve audit kayıtlarıyla tamamla
- [ ] Puan/yorum, güvenli mesajlaşma, numara gizleme, sesli iletişim, push, e-posta/SMS doğrulama, şifre sıfırlama ve hesap kurtarma kapsamını tamamla
- [x] Phase 5 mobil doğrulama, hesap kurtarma, belge yükleme ve sesli mesaj arayüzlerini gerçek tRPC akışlarına bağla
- [x] Phase 5 yerel auth, belge yetkilendirme ve sesli mesaj güvenlik testlerini ekle
- [ ] Phase 5 kalite kapıları, mobil export ve render regresyonunu tekrar doğrula
- [x] Phase 10 ana ekran ve öncelikli akış metinlerini TR/EN/RU sözlüğüne taşı; parametrik metin, RTL ve dil tercihi regresyonlarını doğrula
- [x] Phase 5 TypeScript, lint, sunucu build, 273 testlik regresyon paketi ve iOS/Android Expo export kalite kapılarını doğrula
- [x] İş başlangıç/bitiş, İşi Bitirdim, fotoğraf/kanıt, AI kanıt analizi, müşteri onayı, dispute ve 48 saatlik otomatik serbest bırakma yaşam döngüsünü tamamla
- [x] Phase 6 iş kanıtı, müşteri onayı, itiraz ve 48 saatlik emanet serbest bırakma veri modelini migration ile ekle
- [x] Phase 6 yaşam döngüsü API’lerini fail-closed rol, durum geçişi ve işlem idempotency kurallarıyla uygula
- [x] Phase 6 iş kanıtı, müşteri onayı ve itiraz mobil arayüzlerini gerçek API akışlarına bağla
- [x] Phase 6 AI kanıt analizinin yardımcı niteliğini canlı takipte şeffaf biçimde göster
- [x] Phase 6 yetki, geçersiz durum, kanıt medya ve escrow süre testlerini ekle
- [x] Phase 6 TypeScript, lint, build, test ve iOS/Android export kalite kapılarını doğrula
- [x] Escrow, yüzde 10 komisyon, profesyonel cüzdanı, para çekme, ödeme güvenliği, webhook doğrulama, idempotency ve double-payment korumasını production standardında doğrula
- [x] Phase 7 ödeme, escrow, komisyon ve profesyonel cüzdan akışının veri bütünlüğü ile rol sınırlarını bağımsız denetle
- [x] Phase 7 standart profesyonel komisyonunu ürün sözleşmesindeki yüzde 10 oranına hizala
- [x] Phase 7 eksik webhook, idempotency, ödeme tutarı ve para çekme korumalarını fail-closed olarak güçlendir
- [x] Phase 7 aktif owner para çekme endpointinin gerçek cüzdan transaction akışını kullandığını doğrula; eski mock servislerin üretim yolunda olmadığını teyit et
- [x] Phase 7 para çekmeyi yalnız doğrulanmış profesyonel ve geçerli banka hesabı ile sınırla
- [x] Phase 7 tüm cüzdan ve escrow muhasebesinde merkezi TRY major-unit sözleşmesini politika testiyle zorunlu kıl
- [x] Phase 7 legacy ödeme serbest bırakma endpointini kanıt-temelli idempotent escrow çözüm yoluna yönlendir
- [x] Phase 7 ödeme ve cüzdan güvenlik regresyon testlerini tamamla
- [x] Phase 7 başarısız ödeme webhook’unun aynı doğrulanmış payload ile güvenle yeniden işlenmesini test et
- [x] Phase 7 TypeScript, lint, build ve ödeme/cüzdan hedef testlerini doğrula
- [x] Phase 7 para çekme: veri katmanında doğrulanmış profesyonel, TR IBAN ve yetersiz bakiye kontrollerini fail-closed uygula; router rol sınırını ve yetkilendirme regresyonlarını doğrula
- [ ] MoveOS içinde içerik, kategori, ücret, komisyon, kullanıcı, hizmet ve sistem ayarlarının gerçek ortak API üzerinden yönetimini tamamla
- [ ] Türkçe, İngilizce, Almanca, Fransızca, Arapça ve Rusça; RTL; ülke, para birimi, tarih/saat ve ölçü yerelleştirme altyapısını tüm ekranlara tamamla
- [ ] Yetkilendirme, fraud/abuse, rate-limit, audit log, hata yönetimi, performans ve deployment hazırlığını denetleyip eksikleri gider
- [ ] Her yeni/değişen kapsam için unit, integration, E2E, authorization, hata ve edge-case testleri ekle
- [ ] Önceden PASS olan tüm testleri, 14/14 gerçek render’ı, TypeScript, lint, build ve iOS/Android export’u yeniden doğrula
- [ ] Yeni dış bağımlılıkları sahte PASS üretmeden BLOCKER olarak kaydet
- [ ] Tüm tamamlamaları geri yüklenebilir checkpoint’e al ve gereksinim bazlı production raporunu teslim et
- [x] Phase 8 MoveOS: mock owner token/girişini kaldır; yönetici kimliğini yalnız ortak oturumdan türet; kategori, kullanıcı ve hizmet yönetiminde gerçek veri katmanını kullan
- [x] Phase 8 MoveOS: inşa edilmiş yönetici context’i, mock dashboard/cüzdan/analitik verileri ve sahte başarılı yazma uçlarını fail-closed gerçek uygulamalarla değiştir
- [x] Phase 8 yerelleştirme: kalıcı dil ve para birimi seçimi, RTL yön desteği, güvenli para/numara/tarih biçimleyicileri ve ayarlar ekranı bağını uygula
- [x] Phase 9 finansal discovery: ödeme, escrow, wallet, webhook, anahtar yönetimi ve oturum güvenliğinin gerçek üretim yollarını denetle
- [x] Phase 9 finansal defter: immutable çift taraflı kayıt, hesap bakiyesi türetimi, benzersiz referanslar ve idempotent finansal olay sözleşmesini tasarla ve migration ile uygula
- [x] Phase 9 uzlaştırma: sağlayıcı ödemeleri ile iç defteri karşılaştıran, uyuşmazlıkta FINANCIAL_RECONCILIATION_ALERT üreten yetkili ve zamanlanabilir akışı uygula
- [x] Phase 9 ödeme sertleştirme: replay/race/double-spend, tutar-para birimi, durum makinesi, re-auth ve tokenizasyon sınırlarını gerçek akışta doğrula veya fail-closed tamamla
- [ ] Phase 9 hesap ve sır güvenliği: MFA, cihaz/oturum listesi, oturum iptali, şüpheli giriş ve hassas işlem re-auth kapsamını denetle; gerçekçi biçimde eksikleri tamamla
- [x] Phase 9 yerel oturum cihaz listesi, sahiplik denetimli oturum iptali, token rotasyonu, hassas para çekme parola + tek kullanımlık kod re-auth ve istemci sır sızıntısı korumalarını uygula
- [x] Phase 9 güvenlik-finans unit, integration, authorization, hata ve edge-case regresyonlarını ekle; kalite kapılarını tekrar çalıştır
- [ ] Phase 10 yönetici MFA: admin oturumları için zorunlu, tek kullanımlık ikinci faktör challenge’ı ve rol-uyumlu yeniden doğrulama uygula
- [ ] Phase 10 i18n: müşteri, profesyonel, ödeme, cüzdan, mesaj, takip ve ayar ekranlarında kullanıcıya görünen sabit metinleri çeviri anahtarlarına taşı
- [ ] Phase 10 sağlayıcı sandbox: gerçek credential olmadan Stripe/iyzico/OTP adapter’larının fail-closed önkoşullarını, callback sözleşmelerini ve uzlaştırma başlatma blokajlarını doğrula
- [ ] Phase 10 MFA/i18n/sandbox hata, yetki, edge-case ve regresyon testlerini ekle; kalite kapılarını yeniden çalıştır
- [x] Phase 10 geçersiz/eskimiş oturumda kök route yükleme ekranının takılı kalmadığını doğrula ve yönlendirme regresyonunu düzelt
- [x] Phase 10 admin MFA kod isteğine kullanıcı ve amaç bağlı kısa aralıklı tekrar sınırı ekle; hata ve başarı sözleşmesini test et
- [x] Phase 10 gerçek oturum bootstrap: geçersiz OAuth/JWT çerezi, web oturumu temizleme ve kök yönlendirme durum makinesini yönetim önizlemesinde kök neden düzeyinde doğrula
- [ ] Phase 10 ödeme/OTP sandbox: iyzico, Stripe ve OTP sağlayıcılarının credential yokluğundaki fail-closed davranışlarını, callback ve uzlaştırma önkoşullarını doğrula
- [ ] Phase 10 cihaz E2E: Expo Go QR, güvenli cihaz test kontrol listesi ve kullanıcı tarafından tamamlanacak fiziksel bağımlılıkları hazırla
- [x] Faz 2 provider + capability + jurisdiction doğrulama veri modeli, kanıt güvence seviyeleri ve capability-sonuç durumlarını additive migration ile kur
- [x] Faz 2 deterministik capability politika motoru, unknown=blocked kuralı, capability-scoped enable/block ve belge sona erme davranışını uygula
- [x] Faz 2 insan incelemesi, yeni belge sunma ve itiraz akışlarını rol/nesne yetkileriyle uygula
- [x] Faz 2 ülke uyum paketi, resmî kaynak kataloğu, versioned hukuk kuralı ve admin onay yaşam döngüsünü kur
- [x] Faz 2 ülke açma kapısı, tamamlanma kontrol listesi ve MoveOS country compliance yönetim ekranlarını mevcut ortak API üzerinden ekle
- [ ] Faz 2 sürekli yeniden kontrol zamanlaması, 90/30/15/7 günlük sona erme uyarıları ve veri minimizasyon/retention politikasını ekle
- [ ] Faz 2 Türkiye pilotu için yalnız kullanıcı sağladığı resmi kaynaklar ve hukuk onayı temelinde versioned compliance seedlerini uygula; ülke hukuku içeriği uydurma
- [ ] Faz 2 migrasyon, yetki, politika motoru, itiraz, ülke açma kapısı ve regresyon testlerini çalıştır; build/export kalite kapılarını doğrula
- [ ] Faz 3 versioned/prospective komisyon, immutable anlaşma snapshot, hold/settlement koşulları ve configurable completion review penceresini ekle
- [ ] Faz 3 dispute, partial settlement, iptal, change request ve güvenli iş dosyası yaşam döngüsünü gerçek API/DB akışına bağla
- [ ] Faz 3 ödeme webhook, idempotency, replay, race-condition ve server-side tutar/para birimi kontrollerini regresyon testleriyle doğrula
- [ ] Faz 4 job-scoped expense record, ayrı reimbursement claim, müşteri borcu olmama kuralı ve hassas bilgi redaksiyonunu uygula
- [ ] Faz 4 mesaj ve aktif iş bağlamına job expense file erişimi ile güvenli medya ilişkilendirmesini ekle
- [ ] Faz 4 masraf sahipliği, medya yetkisi, masraf/claim ayrımı ve müşteri görünürlüğü regresyonlarını doğrula
- [ ] Faz 5 MoveAI taslak–özet–açık onay–request oluşturma akışını, sahte fiyat/ETA/usta üretmeme kuralıyla güçlendir
- [ ] Faz 5 AI yetki sınırı, prompt injection veri ayrımı, trust/risk sinyalleri, itibar bütünlüğü ve iş güvenliği capability kontrollerini ekle
- [ ] Faz 5 AI/risk etkilerinde human-review, açıklanabilir audit ve kritik finansal/hukuki işlem engellerini test et
- [ ] Faz 6 13 dilli locale altyapısı, RTL, cihaz dili algılama, para/tarih/sayı biçimleme ve message translation original korunumu ekle
- [ ] Faz 6 MoveOS kritik işlem onayı, re-auth/MFA, canary/shadow mode, guarded kill switch ve denetlenebilir release kontrolünü uygula
- [ ] Faz 6 gözlemlenebilirlik, SBOM/SCA/secret scan, restore runbook, store compliance ve erişilebilirlik kalite kontrollerini ekle
- [ ] Faz 3–6 her modülde TypeScript, lint, test, yetki, hata/edge-case, iOS/Android export ve secret scan kalite kapılarını doğrula; yayın başlatma
