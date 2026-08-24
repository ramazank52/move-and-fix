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

## P14 Verified Residual Closure
- [x] P14-09 exact 13-language runtime locale sözleşmesini geri uygula
- [x] P14-10 Hizmet Talebi ve Masraf Dosyası i18n/RTL/formatter kapanışı ile regresyonlarını uygula
- [x] P14-11 sohbet çeviri provenance, owner-only tercih ve alıcı opt-in davranışını uygula
- [ ] P14-14 owner-only privacy center, yeniden doğrulama ve regresyonlarını tamamla
- [ ] P14-15 staged e-posta/telefon doğrulama yaşam döngüsü ve regresyonlarını tamamla
- [ ] P14-17 production route/sample hijyenini doğrula
- [ ] P14-18 bağımlılık audit quality gate’ini güncelle
- [ ] P14 final regression, release evidence ve checkpoint oluştur

## Master Phase E: Operasyonel Sertleştirme
- [x] MoveOS Operations Control REST köprüsünü Super Admin MFA korumasıyla tamamla
- [x] MoveOS Operations Control kartlarını ve vaka tablosunu gerçek API verisine bağla
- [x] Operations Control yetkilendirme, hata ve sınır durum regresyonlarını ekle
- [x] PII redaksiyonlu structured logging ve fail-closed APM adaptörünü doğrula
- [x] Sentetik health check yüzeylerini gerçek veri tabanı ve disk ölçümleriyle değiştir
- [x] Ölü/mock/placeholder yüzeylerini denetle ve güvenli biçimde temizle
- [x] SBOM, lisans politikası ve CI güvenlik kalite kapılarını yeniden doğrula ve eksikse geri yükle
- [x] Audit bulgularındaki doğrudan yüksek önem seviyeli çalışma zamanı bağımlılıklarını güvenli sürümlere yükselt
- [x] Final kalite kapıları, Expo export ve istemci sır taramasını doğrula
- [ ] Expo SDK 54 araç zincirinin yamalanamayan image-size ve dar PostCSS zinciri audit bulgularını Expo SDK güncellemesiyle kapat
- [x] Phase E checkpoint ve gerçek durum raporunu hazırla
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
- [x] Faz 3 versioned/prospective komisyon, immutable anlaşma snapshot, hold/settlement koşulları ve configurable completion review penceresini ekle
- [ ] Faz 3 dispute, partial settlement, iptal, change request ve güvenli iş dosyası yaşam döngüsünü gerçek API/DB akışına bağla
- [ ] Faz 3 ödeme webhook, idempotency, replay, race-condition ve server-side tutar/para birimi kontrollerini regresyon testleriyle doğrula
- [x] Faz 4 job-scoped expense record, ayrı reimbursement claim, müşteri borcu olmama kuralı ve hassas bilgi redaksiyonunu uygula
- [x] Faz 4 mesaj ve aktif iş bağlamına job expense file erişimi ile güvenli medya ilişkilendirmesini ekle
- [x] Faz 4 masraf sahipliği, medya yetkisi, masraf/claim ayrımı ve müşteri görünürlüğü regresyonlarını doğrula
- [x] Faz 4 aktif işten erişilen gerçek masraf listesi, kanıt yükleme ve geri ödeme talebi mobil akışını ekle
- [x] Faz 4 müşteri için masraf iade talebi onay/red kararı ve denetlenebilir durum görünümünü ekle
- [x] Faz 5 MoveAI taslak–özet–açık onay–request oluşturma akışını, sahte fiyat/ETA/usta üretmeme kuralıyla güçlendir
- [x] Faz 5 AI yetki sınırı, prompt injection veri ayrımı, trust/risk sinyalleri, itibar bütünlüğü ve iş güvenliği capability kontrollerini ekle
- [x] Faz 5 AI/risk etkilerinde human-review, açıklanabilir audit ve kritik finansal/hukuki işlem engellerini test et
- [x] Faz 5 MoveAI komutunu talep oluşturmadan önce değişmez taslak oluşturacak ve açık kullanıcı onayı gerektirecek şekilde dönüştür
- [x] Faz 5 kullanıcı-profesyonel güven sinyallerini, risk flag yaşam döngüsünü ve fail-closed uygunsuz eşleşme engelini ekle
- [x] Faz 5 MoveOS’ta MFA korumalı insan incelemeli risk flag denetim yüzeyini ekle
- [ ] Faz 6 13 dilli locale altyapısı, RTL, cihaz dili algılama, para/tarih/sayı biçimleme ve message translation original korunumu ekle
- [ ] Faz 6 MoveOS kritik işlem onayı, re-auth/MFA, canary/shadow mode, guarded kill switch ve denetlenebilir release kontrolünü uygula
- [ ] Faz 6 gözlemlenebilirlik, SBOM/SCA/secret scan, restore runbook, store compliance ve erişilebilirlik kalite kontrollerini ekle
- [ ] Faz 6 MFA korumalı MoveOS feature flag, canary rollout ve guarded kill-switch yönetimini ekle
- [ ] Faz 6 istek bağlamlı structured event log, sağlık ve rollout gözlemlenebilirlik yüzeyini ekle
- [ ] Faz 6 mobil erişilebilirlik, mağaza gizlilik/izin beyanı ve eksik biçimlendirme denetimlerini uygula
- [ ] Faz 3–6 her modülde TypeScript, lint, test, yetki, hata/edge-case, iOS/Android export ve secret scan kalite kapılarını doğrula; yayın başlatma
- [x] Faz 3 teklif kabulünde anlaşma snapshot’ını atomik oluştur ve geçmiş fiyat/komisyon/inceleme koşullarını değişmez kaydet
- [x] Faz 3 ödeme teklifi ve ödeme intent’ini anlaşma snapshot’ına bağla; mevcut canlı politika hesaplarına bağımlılığı kaldır
- [x] Faz 3 change order ve iptal akışlarını rol/nesne yetkileri ile gerçek tRPC API’ye bağla
- [ ] Faz 3 anlaşma, ödeme, change order ve iptal regresyonlarını hata ve eşzamanlılık senaryolarıyla doğrula
- [x] Faz 3 completion-review ve iptal politikalarını ülke/hizmet/ödeme önceliğiyle versioned/prospective settlement policy kayıtlarından çöz
- [x] Faz 3 MoveOS’ta MFA korumalı iptal inceleme ve settlement policy yönetim prosedürlerini ekle
- [x] Faz 3 MoveOS’ta müşteri-profesyonel change order kayıtlarının salt-okunur denetim görünümünü ekle
- [x] Faz 3 kabul anındaki request medya ve profesyonel belge doğrulama metadatasını değişmez agreement snapshot’ına ekle
- [ ] Faz 3 kısmi settlement planını tutar bileşenleriyle kaydet; yalnız doğrulanmış gateway işlemi sonrası idempotent muhasebeleştir
- [x] Faz 6 feature flag çözümleme, sürümlü canary rollout ve kill-switch veri yordamlarını testlerle tamamla
- [x] Faz 6 MoveOS MFA korumalı feature flag API ve yönetim panelini gerçek ortak backend’e bağla
- [x] Faz 6 ödeme, iptal, risk ve release değişimleri için istek bağlamlı yapılandırılmış olay günlüğünü ekle
- [x] Faz 6 kritik mobil yüzeylerde erişilebilirlik etiketleri, rolleri ve eylem ipuçlarını denetle
- [x] Faz 6 mağaza gizlilik URL’si ve konum/bildirim izin açıklamalarını üretim öncesi yapılandırmaya ekle
- [x] Faz 6 yetki, canary, kill-switch, hata ve edge-case regresyonları ile kalite kapılarını tamamla
- [ ] Faz 6 sonrası KVKK/GDPR hukuk belgesini değiştirmeden /privacy-policy public rotasında TR/EN erişilebilir kıl
- [ ] Faz 6 sonrası ödeme credential, fail-closed ve Git/istemci secret maruziyeti durumunu doğrula
- [ ] Faz 6 sonrası SMS, e-posta ve FCM credential erişimi ile fail-closed sağlayıcı davranışını doğrula
- [ ] Faz 6 sonrası Expo Go/development build uygunluğunu ve fiziksel cihaz E2E erişim sınırını doğrula
- [ ] Faz 6 sonrası kalite kapıları, public gizlilik route kontrolü ve kesin blocker GO/NO-GO raporunu tamamla
- [x] Sır giriş kartında yalnız iyzico anahtarları girildiğinde kaydetmenin engellenmesi kök nedenini düzelt ve kısmi sağlayıcı yapılandırmasını doğrula
- [ ] EXTERNAL BLOCKER — NetGSM production credential’ları sağlandığında gerçek SMS kabul ve teslimat doğrulamasını çalıştır
- [ ] SendGrid teslimatını gerçek credential olmadan fail-closed, credential sağlandığında sandbox doğrulamalı olacak şekilde tamamla
- [ ] Expo/FCM push token kaydı, uygulama içi geçmiş ve sağlayıcı kabulünü fiziksel cihaz/EAS kimliğiyle doğrula
- [ ] FINAL EXTERNAL INTEGRATION GATE — Gerçek iyzico/Stripe, NetGSM, SendGrid ve Expo/FCM credential’ları takıldığında canlı sağlayıcı kabulü ve cihaz E2E çalıştır
- [x] Dış credential olmadan tamamlanabilir tüm frontend, backend, veritabanı, MoveOS, güvenlik, uyum ve regresyon işlerini otonom kapat
- [x] Bildirim tercihlerini, geçmişini ve okunma durumunu sahiplik denetimli kalıcı veri modeli ve gerçek tRPC prosedürleriyle tamamla
- [x] NetGSM, SendGrid ve Expo/FCM kod yollarını credential yokken fail-closed; credential sağlandığında gerçek sağlayıcı çağrısına hazır hale getir ve sözleşme testleriyle doğrula
- [x] iyzico sandbox checkout başlangıcını gerçek credential ile tahsilatsız doğrula; eksik/geçersiz credential yollarının fail-closed kaldığını doğrula
- [x] P11 — Profesyonel belge ekranını kategoriye göre sunucunun belirlediği gereksinimlerle ve fail-closed erişim kontrolüyle bağla
- [x] P11 — Release hijyeni: düzeltilebilir yüksek/kritik audit yollarını güncelle, TODO/FIXME taramasını değerlendir ve kalan Expo SDK araç zinciri bulgularını kaydet
- [x] P11 — Tam kalite kapıları: 81 test dosyası / 521 test, TypeScript, lint, backend build, iOS/Android/web export ve tracked-source secret taramasını doğrula
- [x] Production HTTPS istekleri için koşullu HSTS başlığını ekle; ölü security config’i temizle/entegre et ve HTTP başlık testiyle doğrula
- [x] Security & Accessibility Closure — HSTS güvenilir proxy/HTTPS negatif durum regresyonlarını tamamla
- [x] Security & Accessibility Closure — Tüm upload/stage yüzeylerini envanterle ve eksik byte-limitlerini fail-closed biçimde sertleştir
- [x] Security & Accessibility Closure — Kritik akışlar ile tüm app/ interaktif öğelerinde erişilebilirlik denetimi ve regresyonlarını tamamla (fiziksel cihaz/ekran okuyucu doğrulaması dış bağımlılık nedeniyle PARTIAL)
- [x] Security & Accessibility Closure — Cookie SameSite politikasını kod değiştirmeden A/B/C seçenekleriyle analiz et
- [x] Security & Accessibility Closure — Kanıtlı kapanış raporunu üret, kalite kapılarını çalıştır ve checkpoint oluştur
- [x] P12 P0 — Compliance fail-closed, Türkiye Gold Master ve country/jurisdiction çalışma zamanı sınırlarını doğrula ve eksikleri kapat
- [x] P12 P0 — Profesyonel onboarding, dinamik belge gereksinimi, güvenli medya erişimi ve gerçek malware karantina pipeline’ını tamamla
- [x] P12 P0 — Chat PII temizliği, Masraf Dosyası, mesaj çevirisi ve MoveAI fallback sınırlarını tamamla
- [x] P12 P1 — Ödeme/dispute, privacy-silme, profil/e-posta doğrulama ve demo/placeholder yüzeylerini tamamla
- [x] P12 P1 — 13 dil i18n, sigorta/çalışma modeli/safety ve legacy wallet temizliğini doğrula
- [x] P12 — Tüm release evidence kalite kapılarını çalıştır, nihai raporu oluştur ve checkpoint kaydet
- [x] Master Phase C — Kurumsal/organizasyon hesabı, üyelik yetkileri ve kurumsal hizmet talebi sahipliğini additive şema, API ve testlerle uygula
- [x] Master Phase C — Super Admin rol ayrımı ve MoveOS kritik yetki sınırlarını IDOR regresyonlarıyla güçlendir
- [x] Master Phase C — Merkezi TR/EN/RU i18n kapsamını, çoklu para birimi fail-closed sözleşmesini ve maskeli iletişim adapterini tamamla
- [x] Master Phase C — TypeScript, lint, build, migration, authorization ve edge-case kalite kapılarını çalıştırıp checkpoint al
- [x] Master Phase D — MoveTrust Passport ve Job Capsule için açıklanabilir, sahiplikli veri ve API katmanını uygula
- [x] Master Phase D — No Surprise Price ve fail-safe AI Price Intelligence katmanını anlaşma/fiyat yaşam döngüsüne bağla
- [x] Master Phase D — Safety Center ve Provider Business Cockpit yüzeylerini yetki, audit ve hata sınırlarıyla uygula
- [x] FINAL MASTER P0 — Server-determined capability/jurisdiction bağlamını talep, teklif ve kabul geçişlerinde fail-closed uygula; migration, transaction-içi ikinci savunma katmanı ve regression testlerini doğrula
- [x] FINAL MASTER P1 — Completion proof, iptal, uyuşmazlık ve settlement kararlarını immutable iş dosyası, doğrulanmış gateway callback’i, idempotent çift taraflı ledger ve insan incelemesi sınırlarıyla sertleştir; müşteri lehine kararı signed callback bekleyen duruma bağla ve admin direct-refund bypass’ını fail-closed kapat
- [x] FINAL MASTER P2 — Mesaj görünümden silme, privacy export/erasure talepleri, legal hold, immutable audit ve maskeli iletişim oturumu sona erdirme/temizleme akışlarını fail-closed uygula; privacy review ve legal hold işlemlerini yalnız Super Admin + MFA sınırına bağla
- [x] Master Phase D — Corporate Fleet/Facility için çoklu lokasyon, toplu talep ve kurumsal fatura altyapısını ekle
- [x] Master Phase D — Yetki, idempotency, hata ve edge-case regresyonları ile kalite kapılarını çalıştırıp checkpoint al
- [x] İstemci dışa aktarımları ve izlenen Git geçmişinde sağlayıcı sırrı/private key bulunmadığını değer göstermeden doğrula
- [ ] EXTERNAL BLOCKER — Onaylı İngilizce KVKK/GDPR gizlilik politikası metni sağlandığında /privacy-policy TR/EN public rotasında metni değiştirmeden yayınla
- [ ] EXTERNAL BLOCKER — moveandfix.app için DNS ve HTTPS yayınlaması tamamlandığında app.config.ts içindeki privacyPolicyUrl altında public gizlilik rotasını doğrula
- [x] Salt-okunur denetim dışa aktarımı: tam kaynak kod ZIP’ini .env, sır, token, credential ve çalışma çıktıları hariç oluşturup içerik taramasıyla doğrula
- [x] Master Phase A — CORS allowlist, CSRF kapsamı, env doğrulaması, legacy Wallet/AI kaynakları, Stripe tutarlılığı ve oturum iptalini P0 güvenlik sınırında denetle/düzelt
- [x] Master Phase A — P0 güvenlik, yetki, oturum, webhook ve secret regresyonlarını çalıştır; PASS olmadan finansal/kimlik özelliklerini değiştirme
- [x] Master Phase B — Consent ledger, TR/EN privacy, IYS iletişim tercihleri, provider retention, ülke/sağlayıcı regülasyon takibi ve dayanıklı scheduler altyapısını tamamla
- [x] Master Phase B — Kısmi iade ve payout yaşam döngüsünü gerçek gateway callback’ine idempotent, uzlaştırılabilir ve fail-closed bağla
- [x] Master Phase C — Organization/corporate account, RBAC/Super Admin, uluslararasılaştırma, çoklu para birimi ve branding source-of-truth işlerini tamamla
- [x] Master Phase D — MoveTrust Passport, Job Capsule, No Surprise Price, AI Price Intelligence, Safety Center ve Provider Business Cockpit güven katmanını uygula
- [x] Master Phase D — Corporate Fleet/Facility ve MoveOS Operations Control yüzeylerini ortak API/DB/MFA güvenlik modeliyle tamamla
- [x] Master Phase E — SBOM/SCA, gözlemlenebilirlik, dead/legacy code temizliği, OpenAPI, tam regresyon, Android/iOS/web doğrulaması ve mock/fake final taramasını tamamla
- [x] Master Phase E — MoveOS Operations Control, sistem sağlığı ve inceleme kuyruğunu MFA/RBAC ve immutable audit sınırlarıyla uygula
- [x] Master Phase E — Structured/redacted log, correlation ID ve fail-closed APM adapter sözleşmesini uygula
- [x] Master Phase E — SBOM, lisans envanteri, bağımlılık/secret taraması ve CI kalite kapılarını ekle
- [x] Master Phase E — Authorization, rate-limit, webhook, ödeme ve uyum testlerini davranış temelli sertleştir
- [x] Master Phase E — Ölü/legacy/mock kaynakları ve görünür sabit metinleri güvenli biçimde temizle; OpenAPI sözleşmesini güncelle
- [x] Master Phase E — Tam regresyon, build, mobil export ve final mock/fake/secret taramasından sonra checkpoint al
- [x] Master final — Her faz için gerçek PASS/PARTIAL/BLOCKED raporu, checkpoint ve production-readiness kararını yalnız doğrulanmış bulgularla sun
- [x] Master Phase A P0 — CORS allowlist’i fail-closed uygula; cookie tabanlı tRPC ve MoveOS mutasyonlarında CSRF’yi gerçek oturum bağlamıyla zorunlu kıl
- [x] Master Phase A P0 — ENCRYPTION_KEY üretimde zorunlu, legacy REST logout oturum iptalli, token rotasyonu ve Stripe/Wallet kaynakları denetlenmiş hale getir
- [x] Master Phase B — Rol/ülke/belge sürümüne bağlı immutable yasal onay defteri ve yeniden-onay akışını uygula
- [x] Master Phase B — TR/EN gizlilik politikası durumu, marketing/transactional ayrımı ve İYS-uyumlu opt-in/out defterini uygula
- [x] Master Phase B — Sağlayıcı belge retention silme yaşam döngüsü, ödeme sağlayıcısı health/regülasyon kapısı ve idempotent callback zamanlamasını uygula
- [x] Master Phase B — Kısmi iade, kalan sağlayıcı ödemesi, anlaşmazlık kilidi ve uzlaştırma mismatch akışını gerçek ledger state machine ile tamamla
- [x] Master Phase B–E — Yeni gerçek secret veya credential istemeden dış bağımlı yüzeyleri NOT_CONFIGURED / EXTERNAL_CONFIGURATION_REQUIRED fail-closed durumda tut; finalde tek pending listede topla
- [x] Master Phase B — Ödeme sağlayıcısı sağlık ve düzenleyici uygunluk durumunu fail-closed ülke/para birimi aktivasyon kapısına bağla
- [x] Master Phase B — TR/EN gizlilik politikası kataloğunu sürümlü, public ve kayıt onayıyla ilişkilendirilebilir hale getir
- [x] Master Phase B — Belge sürümü değişiminde yalnız güncel belge kataloğuna dayanan yeniden-onay sorgu ve kayıt akışını uygula
- [x] Master Phase C — Organizasyon, corporate account, üyelik ve sahiplikli kurumsal iş erişimi veri/API temelini uygula
- [x] Master Phase C — Super Admin/RBAC izin politikasını backend enforcement ve immutable audit olaylarıyla uygula
- [x] Master Phase C — Merkezi i18n kapsamını tamamla ve TRY-only modelini çoklu para birimi biçimleme/validasyon temeliyle genişlet
- [x] Master Phase C — Maskeli iletişim sağlayıcı adaptörünü NOT_CONFIGURED fail-closed durumda hazırla
- [x] Master Phase C — Uygulama branding source-of-truth, bundle/payment kimliği ve template kalıntılarını güvenli biçimde temizle

## FINAL MASTER COMMAND P0
- [x] Opaque media ID ve kaynak-tabanlı erişim kontrolünü public URL dönüşleri olmadan uygula
- [x] Capability/jurisdiction fail-closed kararını teklif, kabul, iş başlangıcı ve profesyonel fırsat görünümüne transaction-içi savunma katmanıyla bağla
- [x] Dynamic credential requirement, PII-minimized DTO, MoveAI policy guard ve production debug gate eksiklerini kapat
- [x] P0 kapanışı — Capability kararını fırsat görünümü ve iş başlangıcında uygula; kategori/ülke/policy sürümüne bağlı credential denetimi, PII-minimized DTO, MoveAI iddia politikası ve production debug allowlist gate için regresyon ekle

## FINAL MASTER COMMAND P3
- [x] 13 dil desteği, cihaz locale fallback ve RTL destek altyapısını uygula
- [x] AI mesaj çevirisini izinli, kaynaktan bağımsız, saklamayan ve hata durumunda kaynak metni koruyan yapıyla ekle
- [x] P3 kapanışı — Locale, RTL ve çeviri fail-closed davranışını birim, yetki ve hata regresyonlarıyla doğrula

## FINAL MASTER COMMAND P4
- [x] MoveAI çoklu ortam taslağını kullanıcı onayı, redaksiyon, minimum veri, saklamama ve fail-closed model sınırlarıyla uygula
- [x] Profesyonel AI yardımcılarını karar verici olmayan, açıklanabilir, policy-korumalı ve insan onaylı iş akışlarıyla sınırla
- [x] P4 kapanışı — Yetki, hata, redaksiyon ve güvenli model yokluğu regresyonlarını doğrula
- [x] P4 — Taslak-medya staging, kullanıcı sahipliği, açık rıza ve onayda güvenli request-media aktarımını additive şema ve tRPC yüzeyleriyle uygula
- [x] P4 — MoveAI ekranına izinli görsel seçimi, ses kaydı, rıza bilgisi ve gönderim durumlarını gerçek API akışıyla ekle
- [x] P4 — Çoklu ortam, rıza, yetki, redaksiyon, hata ve profesyonel AI sınırı regresyonlarını ekle; kalite kapılarını çalıştır

## FINAL MASTER COMMAND P5
- [x] Türkiye ödeme sağlayıcısı seçimi, TRY-only settlement kuralları, tutar/tarife doğrulaması ve idempotent escrow başlatma sınırlarını denetle ve sertleştir
- [x] iyzico/Stripe credential, webhook ve reconciliation yüzeylerini yapılandırılmadığında NOT_CONFIGURED/fail-closed bırak; gerçek teslimat üretmeden sağlık durumunu görünür kıl
- [x] Türkiye country launch gate, sürümlü kategori/hizmet/capability/credential/fiyat-komisyon/vergi kaynak denetimini yönetsel kontrol ve immutable audit ile güçlendir
- [x] P5 için birim, entegrasyon, yetki, hata ve edge-case ödeme/ledger/lansman regresyonlarını ekle; kalite kapılarını çalıştır

## FINAL MASTER COMMAND P6
- [x] Aktif iş katılımcılarıyla sınırlı, açık foreground izinli, minimum koordinatlı ve paylaşımı durdurulabilir canlı konum sözleşmesini uygula
- [x] Sahiplikli destek talebi, immutable olay zaman çizelgesi ve yetkili karar akışlarını ekle
- [x] Claim/sigorta vaka kaydı, kanıt erişimi, insan inceleme ve otomatik ödeme yaratmayan karar durumlarını ekle
- [x] Türkiye KDV hesaplama ve sürümlü vergi kuralı doğrulamasını ödeme/iş dosyası bağlamında fail-closed uygula
- [x] P6 konum, destek, claim, vergi ve upload güvenliği için birim, entegrasyon, yetki, hata ve edge-case regresyonlarını ekle; kalite kapılarını çalıştır

## FINAL MASTER COMMAND P7
- [x] MoveOS vaka kuyruğunu claim, destek, uyum ve ödeme incelemeleri için veri-minimize, filtrelenebilir ve MFA/Super Admin korumalı biçimde bütünleştir
- [x] Controlled publish/rollback, feature flag değişikliği, vergi/uyum kuralı ve yönetici kararları için immutable audit ve iki aşamalı doğrulama sınırlarını sertleştir
- [x] MoveOS operasyon görünümüne yalnız sahiplikli özetler, fail-closed aksiyonlar, durum/hata geri bildirimi ve denetim bağlantıları ekle
- [x] P7 için yönetici yetkisi, MFA, IDOR, hata, audit ve edge-case regresyonlarını ekle; kalite kapılarını çalıştır

## FINAL MASTER COMMAND P8
- [x] SBOM, lisans politikası, bağımlılık/audit eşiği ve kaynak secret/mock tarama kanıtlarını güncelle
- [x] Felaket kurtarma, restore doğrulaması, retention/scheduler çalışma kitabı ve sorumlu-operasyon kanıtlarını koddan ayrık, uygulanabilir dokümantasyonla tamamla
- [x] APM/health/operasyonel gözlemleme yüzeylerini secret yokluğunda fail-closed ve veri-minimize davranışla tekrar doğrula
- [x] iOS/Android mağaza çıkış metadata, izin gerekçeleri, privacy manifest ve release kontrol listesini eksik harici kaynakları açık blocker olarak kaydederek tamamla
- [x] P8 tedarik zinciri, DR, gözlemleme ve mağaza kontrollerini test/build/export/tarama kanıtlarıyla doğrula

## FINAL MASTER COMMAND P9
- [x] Customer, professional, MoveAI, ödeme, mesajlaşma, bildirim, MoveOS ve yetki sınırları için doğrulanmış E2E/test matrisi oluştur ve uygulanabilir senaryoları gerçek backend üzerinde çalıştır
- [x] Customer/Professional/Admin endpoint sınırları, CSRF, webhook doğrulaması, rate-limit, input validation ve frontend secret sızıntısı regresyonlarını kapsamlı çalıştır
- [x] iOS/Android/web export, deep link/route, responsive/safe-area ve fiziksel cihaz gerektirmeyen mobil akış kanıtlarını tekrar üret
- [x] P9 sonuçlarını gerçek PASS/FAIL/BLOCKED olarak kaydet; canlı credential, domain veya fiziksel cihaz gerektiğinde güvenli external blocker olarak ayır

## FINAL MASTER COMMAND P10
- [x] Tüm fazların çalışma ağacını, migration uygulama durumunu, kalite kapılarını ve external blocker kayıtlarını nihai kanıt setiyle doğrula
- [x] Son checkpoint’i kaydet; sürdürülebilir operasyon, hukuk ve credential blocker’larını gerçek durumuyla raporla
- [x] İstenen formatta tek nihai production durum raporunu teslim et

## P11 FINAL CORRECTION & RELEASE CLOSURE
- [x] P11 corrective migration’ları: scope/conditional rules, media quarantine, message translation/visibility, privacy rectification ve insurance/classification/safety modellerini additive olarak uygula
- [x] Provider insurance policy ve operating model kayıtlarını ownership, document quarantine, retention ve denetim kurallarıyla gerçek DB/tRPC katmanına bağla
- [x] Job safety rule kayıtlarını yalnız aktif kural DTO’suyla public okuma; MoveOS Super Admin + MFA ile inceleme/yönetim olarak uygula
- [x] Sigorta, worker classification ve job safety kararlarını teklif, kabul ve aktif iş yaşam döngüsünde server-authoritative fail-closed zorunlu kıl
- [x] Global payment resolver ve completion-dispute resolution politikasını gerçek checkout/refund/settlement sınırlarına bağla
- [x] P11 yetki, MFA, PII minimizasyonu, idempotency, hata ve edge-case regresyonlarını ekle
- [x] P11 bağımlılık denetimi, dead-code/TODO taraması, TypeScript, lint, build, test, iOS/Android/web export ve secret scan kalite kapılarını gerçek kanıtla tamamla
- [x] P11 checkpoint ve A/B/C nihai durum raporunu external blocker’ları ayrı listeleyerek teslim et

## P12 FINAL INTERNAL CLOSURE
- [x] P0-6 — Sesli mesaj ve MoveAI taslak medyalarını additive 0060 migration ile ortak fail-closed karantina yaşam döngüsüne al; imzalı scanner callback’ini secret yokluğunda 503/NOT_CONFIGURED bırak
- [x] P1-12 — MoveAI istemci fallback’indeki sabit fiyat, uygunluk, ödeme ve garanti iddialarını sunucu doğrulaması gerektiren nötr yönlendirmeyle değiştir
- [x] P1-17 — Profil düzenleme ekranını oturum sahibine bağlı auth.updateProfile tRPC mutasyonu, yükleme/hata/başarı ve yeniden doğrulama akışıyla bağla
- [x] P1-18 — /verify/email nested rotasını oturumdaki gerçek e-posta ve gerçek OTP mutasyonlarını kullanan doğrulama ekranına yönlendir
- [x] P12 — Tam regresyon, build/export, güvenlik taramaları, SBOM/lisans ve release evidence kalite kapılarını çalıştır
- [x] P12 — Checkpoint ve kanıta dayalı final üretim durum raporunu tamamla

## PASTED CONTENT 02 REVIEW
- [x] Pasted_content_02.txt talimatlarını P12 checkpoint'iyle karşılaştır, uygulanabilir açıkları kapat ve doğrulanmış sonuçları raporla

## P13 FINAL VERIFIED INTERNAL CLOSURE
- [x] TR-GOLD-2026-08-13-v1.0 onaylı paketini MD, JSON ve Official Source Registry birlikte doğrulanmış tek hukuki source-of-truth olarak versioned fail-closed compliance katmanına bağla
- [x] Onaylı TR Gold Master kaynak paketini doğrula; aktif katalog kapsamını yalnız kaynak temelli, sürümlü ve UNKNOWN=BLOCK kurallarıyla eşle
- [x] P0 compliance, jurisdiction, country gate, safety, onboarding, credential catalog, document access ve scanner orchestration açıklarını kapat
- [x] P0/P1 PII, masraf dosyası, payment/dispute, doğrulama rotaları, privacy UI ve environment sözleşmesi açıklarını kapat
- [x] P1 doğru 13 dil, tam i18n, message translation, demo route temizliği, profesyonel işletme UI ve package hygiene maddelerini kapat
- [x] P13 test, TypeScript, lint, build, export, supply-chain, audit ve güvenlik kalite kapılarını çalıştır
- [x] P13 checkpoint ve kanıta dayalı final A/B/C raporunu teslim et

## P13 Detailed Binding Closure Audit
- [x] P13-1 — Compliance requirement state, approved TR Gold Master kapsamı ve country launch gate runtime sözleşmelerini doğrula
- [x] P13-2 — Profesyonel onboarding, dinamik credential katalogu ve güvenli belge erişim akışlarını doğrula
- [x] P13-3 — Tüm kullanıcı yüklemeleri için dayanıklı scanner adapter/outbox, retry, dead-letter ve callback tamamlama akışını kapat
- [x] P13-4 — Sohbet/public DTO’larında e-posta ve telefon PII sızıntısı olmadığını liste, detay ve ilişkili yüzeylerde doğrula
- [x] P13-5 — Masraf dosyası ürün akışı, müşteri paylaşım yetkisi ve sohbetten masraf dosyası erişimini doğrula
- [x] P13-6 — Onaylı 13 dil, tam i18n, mesaj çevirisi ve RTL kapsamını doğrula
- [x] P13-7 — Service request jurisdiction snapshot, country-based payment context ve partial dispute settlement sözleşmelerini doğrula
- [x] P13-8 — Gizlilik merkezi, staged contact change ve gerçek telefon/e-posta doğrulama rotalarını doğrula
- [x] P13-9 — Production demo/placeholder route, legacy cüzdan ve package hygiene temizliğini doğrula
- [x] P13-10 — Job safety, provider operating model/insurance UI ve environment variable canonical contract açıklarını kapat
- [x] P13-11 — P13 tam regresyon, derleme, export, supply-chain/audit ve release evidence kalite kapılarını çalıştır
- [x] P13-12 — P13 checkpoint’i ve kanıta dayalı final A/B/C üretim raporunu hazırla

## P14 VERIFIED RESIDUAL CLOSURE
- [x] P14 residual closure talimatını baştan sona incele, baseline ile karşılaştır ve bağlayıcı uygulanabilir açıkları sınıflandır
- [x] P14 kapsamındaki uygulanabilir P0/P1 residual güvenlik, uyum, veri ve ürün açıklarını fail-closed olarak kapat
- [x] P14 için gerekli unit, integration, authorization, hata ve edge-case regresyonlarını ekle veya güncelle
- [x] P14 tam test, TypeScript, lint, build, export, supply-chain ve security kalite kanıtlarını üret
- [x] P14 checkpoint ve kanıta dayalı A/B/C final raporunu teslim et

### P14 Binding Residual Findings
- [x] P14-02 — Canonical service catalog, explicit legacy aliases ve ambiguous mapping fail-closed sözleşmesini kapat
- [x] P14-01 — Approved Gold Master scope’larını stable canonical category/subcategory ID’lerine explicit bağla
- [x] P14-04 — Jurisdiction/service/capability/provider-type kaynaklı dinamik credential definition/requirement modelini kapat
- [x] P14-06 — Country launch gate assertion’ını tüm yeni marketplace state transition’larında merkezi olarak uygula
- [x] P14-03 — Server-authoritative provider onboarding lifecycle ve activation gate’lerini E2E tamamla
- [x] P14-05 — Reviewer/admin document view kararını MFA, retention/legal-hold, quarantine, no-store ve audit ile uygula
- [x] P14-13 — Job safety belirsizliğini fail-closed bloklayan geçiş korumalarını doğrula
- [x] P14-12 — Completion dispute partial resolution/escrow transition fail-closed sözleşmesini doğrula
- [x] P14-16 — MoveAI canonical resolver ve service identity bağını kapat
- [x] P14-07 — Server-driven public launch registry ve explicit delivery-country UX’i uygula
- [x] P14-08 — Masraf Dosyası UI/media-role/chat entry/ledger görünürlüğünü tamamla
- [x] P14-09 — Shared exact 13-language runtime setini uygula
- [x] P14-10 — Üretim i18n string closure, formatters, Arabic RTL ve CI hard-coded string guard’ını tamamla
- [x] P14-11 — Chat translation metadata, persistent preference ve original-authority sözleşmesini tamamla
- [x] P14-14 — Privacy center gerçek uçlarını ve account-deletion görünürlüğünü doğrula
- [x] P14-15 — Staged email/phone verification lifecycle’ını gerçek backend akışıyla tamamla
- [x] P14-17 — Package/sample/dead-code hygiene’ı doğrula ve güvenli temizliği uygula
- [x] P14-18 — Dependency audit gate’ini doğrula, çözülebilen transitif riskleri kapat ve kalan gate’leri kaydet

## P15 FINAL CLOSURE
- [x] P15-05 — Malware scanner state machine’i `pending_scan → scanning → clean/blocked/scan_failed` yaşam döngüsüyle, bounded retry ve operasyon kuyruğuyla güçlendir
- [x] P15-05 — Scanner callback HMAC, timestamp, nonce/replay, idempotency ve sıralama yarışı korumalarını uygula
- [x] P15-05 — Reviewer erişim ve manuel remediation için MFA, ayrı grant, kısa ömürlü signed URL, gerekçe ve audit sözleşmesini doğrula
- [x] P15-05 — Malware lifecycle unit, integration, authorization, hata ve edge-case regresyonlarını ekle ve çalıştır
- [x] P15-05 — Migration 0074’ü uygulayıp schema/veri katmanı sözleşmesini doğrula
- [x] P15-06 — Expo/Metro dependency advisory’lerini dependency path, runtime etkisi ve uyumluluk sınırıyla denetle
- [x] P15-06 — Resmi SDK 54 patch güncellemesini doğrula; kapanamayan Expo/Metro transitif bulguları VERIFIED EXTERNAL GATE olarak belgele
- [x] P15-07 — TR/EN zorunlu legal/privacy katalogunu version, locale, effective date, content hash ve machine-readable approval placeholder’larıyla tamamla
- [x] P15-07 — Server-authoritative legal re-consent ve ayrı, varsayılan kapalı marketing opt-in/withdrawal lifecycle’ını ekle
- [x] P15-07 — Hesap/veri silme, destek, provider/community, yasaklı hizmet, ödeme/iptal/iade/uyuşmazlık çerçevesinin fail-closed legal metadata’sını tamamla
- [x] P15-07 — Legal/privacy policy, authorization ve edge-case regresyonlarını ekle ve çalıştır
- [x] P15-08 — Merkezi secret/environment contract’ını canonical isimler, rotation metadatası ve fail-closed production davranışıyla genişlet
- [x] P15-08 — AES-256-GCM encrypted payload’larına key version ekle; legacy decrypt uyumluluğu ve plaintext-fallback reddi testlerini ekle
- [x] P15-09 — Authorization/IDOR veri-minimizasyonu, MoveAI fail-closed ve country/capability gate regresyonlarını yeniden denetle ve eksikleri kapat
- [x] P15-09 — Operasyonel readiness, PII redaction, cron/webhook secret kontrolü ve runbook/supply-chain kanıtlarını doğrula
- [x] P15-10 — Tam regresyon, lint, TypeScript, backend build, iOS/Android/web export, Expo doctor ve diff denetimlerini çalıştır
- [x] P15-10 — Dependency audit, source secret scan, SAST/SCA, SBOM/lisans, migration integrity ve production bundle hijyen kanıtını üret
- [x] P15-10 — P15 final kalite sonuçlarını ham çıktı dosyalarına ve release gate matrisine kaydet
- [x] P15-11 — Denetim amaçlı credential’sız kaynak ZIP/manifesti ve kanıta dayalı A/B/C closure raporunu hazırla; final checkpoint ile sürümü sabitle

## P16 RESIDUAL CLAIM-RECONCILIATION
- [x] P16-01 — Completion dispute için server-authoritative full release, full refund ve gateway-doğrulanmış partial resolution plan/finalization akışını uygula
- [x] P16-01 — Kısmi dispute ledger reference/event type, safe whole-TRY invariant, callback amount eşleşmesi, idempotency ve concurrent settlement korumalarını ekle
- [x] P16-01 — MoveOS dispute çözüm yüzeyini server quote/policy verisine bağla ve partial split UI’ını tamamla
- [x] P16-01 — Partial completion dispute source, runtime, authorization, callback replay, ledger balance ve UI acceptance regresyonlarını ekle ve çalıştır
- [x] P16-02 — Job Safety Engine’de missing, unknown veya malformed kuralı fail-closed yap; explicit activity status sözleşmesini additive migration ile uygula
- [x] P16-02 — Safety kararını teklif, offer acceptance ve aktif iş başlatma/progress geçişlerinde server-authoritative zorunlu kontrol olarak doğrula
- [x] P16-02 — Safety policy, runtime lifecycle ve negative-path regresyonlarını çalıştır; backend build ve lint ile doğrula
- [x] P16-03 — Provider dashboard’dan gerçek server-authoritative onboarding akışına giriş ve ilerleme durumu ekle
- [x] P16-03 — Canonical kategori/alt kategori/capability seçimlerini server catalog’a bağla; operating model, ülke ve inceleme bekleme adımlarını uygula
- [x] P16-03 — Dinamik belge gereksinimleri, activation eligibility ve provider/customer yetki sınırı için acceptance regresyonlarını ekle ve çalıştır
- [x] P16-04 — Provider credential requirement resolver’ını selected capability, jurisdiction, provider type ve requirement state ile category-only fallback olmadan bağla
- [x] P16-04 — Onboarding checklist, provider verification refresh ve belge ekranını aynı server-authoritative capability-specific kaynakla eşitle
- [x] P16-04 — Capability/jurisdiction/provider-type/unknown/expired/optional ve cross-provider authorization regresyonlarını ekle ve çalıştır
- [x] P16-05 — Masraf Dosyası formuna ürün/tedarikçi/konum ve semantic evidence metadata alanlarını ekle; medya rollerini scanner koruması altında sakla
- [x] P16-05 — İş ve sohbet ekranına yalnız ilgili request/job için authoritative Masraf Dosyası geçişini ekle; müşteri read-only ve no-debt anlamını koru
- [x] P16-06 — P16’de değişen production ekranlardaki kullanıcı metinlerini 13 dilli type-safe registry’ye taşı; Arabic RTL ve hard-code guard’ını doğrula
- [x] P16-07 — Privacy Center’a rectification talebini mevcut re-auth, owner-only, legal-hold ve geçmiş listesi semantiğini koruyarak ekle
- [x] P16-08 — E-posta/telefon değişimini pending challenge ve atomik promotion ile staged lifecycle’a taşı; doğrulanmamış primary overwrite’i engelle
- [x] P16-09 — MoveAI intentlerini server canonical ServiceCatalogResolver üzerinden çöz; hard-coded numeric category fallback’ini kaldır ve belirsiz/unknown isteği clarification ile blokla
- [x] P16-10 — Country Launch Gate’in public-safe registry DTO’sunu customer ve provider country seçimlerine bağla; silent TR/currency fallback’lerini kaldır
- [x] P16-11 — Scanner outbox’ta stuck job watchdog, bounded recovery/dead-letter ve scanner’a özel cron secret isolation uygula
- [x] P16-11 — AES-256-GCM key-version rotasyonunda legacy payload decrypt uyumluluğunu gerçek key-ring sözleşmesiyle doğrula
- [x] P16-12 — Production’da demo/sample/test seed veya geliştirme route’larının erişilemediğini doğrula; fixture’ların canlı veri katmanına sızmasını engelle
- [x] P16-12 — Ödeme SCA/3DS sorumluluk kararını mevcut gateway adapter davranışı ve credential eksikliğiyle EXTERNAL BLOCKER olarak kanıt dosyasına kaydet
- [x] P16-13 — Final tam regresyon, TypeScript, lint, backend build, iOS/Android/web export, Expo Doctor ve whitespace kalite kapılarını doğrula
- [x] P16-14 — P16 final closure raporu, üretim durumu eki ve kanıta dayalı A/B/C release kararını hazırla

## P17 — Verified Source-Truth Correction Closure (baseline: a314ce97)

- [x] P17-00 — `p17-verified-closure` branch'ini a314ce97 baseline’ından oluştur, deployment/public-store durumunu kanıtla ve madde bazlı checkpoint disiplinini uygula
- [x] P17-01 — Provider onboarding akışına operating-model submission/review adımını, service-area doğrulamasını ve fail-closed activation yolunu entegre et
- [x] P17-02 — Provider document/onboarding/activation kararlarını capability-jurisdiction-providerType credential resolver’ın tek authoritative DTO’sunda birleştir
- [x] P17-03 — Scanner dispatch attempt generation/token correlation, stale callback red ve behavioral race testlerini uygula
- [x] P17-03-R — Uygulanmış 0081 scanner migration’ı için eksik Drizzle journal kaydını source-of-truth ile hizala
- [x] P17-04 — Explicit legacy encryption key contract, gerçek old-key decrypt/migration roundtrip ve fail-closed rotation testlerini uygula
- [x] P17-05 — Masraf Dosyası multi-evidence collection, secure video desteği ve scanner-bound persistence akışını uygula
- [x] P17-06 — Tüm production app/components user-facing metinlerini 13-dil i18n’ye taşı, RTL/hard-coded UI scanner kapsamını genişlet
- [x] P17-07 — MoveAI candidate taxonomy’yi public-safe canonical catalog snapshot ve locale-aware response policy ile birleştir
- [x] P17-08 — SPDX expression-aware license policy, attribution çıktısı ve behavioral parser testlerini uygula
- [x] P17-09 — qs runtime vulnerability için uyumlu remediable resolution/upgrade araştır, uygulayabiliyorsa güvenli yükseltme ve finansal regressions çalıştır
- [x] P17-10 — Deterministik JSON tabanlı SCA parser/CI policy, advisory/path/disposition raporları ve approved toolchain exception kaydını uygula
- [x] P17-11 — Partial settlement downstream analytics, reconciliation ve admin/payment semantic ayrımını authoritative realized amounts ile düzelt
- [x] P17-12 — Canonical `MEDIA_SCANNER_CRON_SECRET` dokümantasyon/config sözleşmesini hizala ve config-contract testini ekle
- [x] P17-13 — Authoritative final-production-status belgesini current P17 durumu en üstte görünecek şekilde yeniden düzenle
- [x] P17-14 — Kritik P17 sözleşme smoke testlerinin yanına router/database behavioral test kanıtlarını tamamla
- [x] P17-15 — qs disposition’ını release classification ile açıkça bağla ve safe resolution yoksa BLOCKED_INTERNAL_DEPENDENCY olarak kaydet
- [x] P17-16 — Translation preference/provenance ile contact verification geçmişini Privacy Center export/delete lifecycle’ına bağla
- [x] P17-17 — Masraf evidence item sayısı/boyut/süre limitlerini config tabanlı ve server-authoritative olarak uygula
- [x] P17-FINAL — Final kalite kapıları, P17 closure raporu, production status, per-item checkpoint referansları ve immutable audit exportu tamamla

## P17-16 Privacy Retention / Erasure Execution
- [x] Privacy Center export çıktısına owner translation preference/provenance ve contact verification geçmişini dahil et
- [x] Privacy Center silme akışını mevcut re-auth, legal-hold ve retention semantiğini koruyarak bu veri kümelerine bağla
- [x] P17-16 owner/export/delete route-db behavioral, authorization ve edge-case testlerini ekle

## Türkiye Otonom Belge Doğrulama — Blok 1: Nakliye / Çekici / Evden Eve
- [x] B1-P1 — Mevcut servis, capability, sağlayıcı ve credential veri modelinin read-only envanterini çıkar
- [x] B1-P2 — Nakliye/çekici/evden eve capability profile schema’sını additive ve fail-closed tasarla
- [x] B1-P3/4 — Resmî kaynak taslağı, SOURCE_UNVERIFIED service–credential matrix ve coverage manifestini hazırla
- [x] B1-Gate-A — Yetkin hukuk/uyum sorumlusu `LEGAL_SOURCE_APPROVAL` vermeden rule-pack aktivasyonunu kapalı tut
- [x] B1-P5 — Capability profile veri katmanı, owner-only tRPC yazma/okuma sözleşmesi ve onboarding activation bağını uygula
- [x] B1-P6 — Capability profile, acil durdurma ve activation fail-closed davranış testlerini ekle
- [x] B1-P7 — Migration bütünlüğü ile tam regression, lint, TypeScript ve backend build kalite kapılarını doğrula
- [x] B1-P8 — Faz 8-A Blok 1 ara checkpoint’i ve kanıta dayalı durum raporunu hazırla
- [x] B1-H1 — Sürümlü ve kayıpsız operating model eşlemesi ile mevcut profile kayıtlarını additive migre et
- [x] B1-H2 — Append-only immutable approval ledger ve doğrulanmış onay bağını ekle
- [x] B1-H3 — Profile, kaynak, hukuk, release, kullanıcı askısı ve enforcement durumlarını ayrıştırılmış state-machine olarak uygula
- [x] B1-H4 — Ledger doğrulamalı activation ile sistem askısı için yetkili/auditli kaldırma kapısını uygula
- [x] B1-H5 — Sahte/geçersiz/stale onay, askı aşma ve eşzamanlı yazma davranış testlerini ekle
- [x] B1-H6 — Additive migration, kalite kapıları ve non-destructive veri eşlemesini doğrula
- [x] B1-H7 — Blok 1 kilidini koruyan v3 salt-okunur kanıt paketini teslim et

## Beş Ülke Güvenli Altyapı — Faz 0 ve Germany/Berlin CHECKPOINT A
- [x] G5-P0 — Üç ek dosyayı, binding komutu ve default-off seed sınırını eksiksiz denetle
- [x] G5-P0 — Türkiye checkpoint, kullanıcı verisi ve production/country activation koruma sınırlarını kanıtla
- [x] G5-S1 — Common Global Scaffold’u yalnız additive ve default-off olarak kur
- [x] G5-DE-A — Germany/Berlin SOURCE_UNVERIFIED kaynak, connector, legal locale ve capability scaffoldunu CHECKPOINT A sınırında doğrula
- [x] G5-DE-A — Germany/Berlin CHECKPOINT A kapsamını uygulayıp ülke/capability activationını kapalı tut
- [x] G5-QA — Migration, authorization, fail-closed ve regresyon kalite kanıtlarını tamamla
- [x] G5-CP-A — CHECKPOINT A kanıt paketini hazırla ve sonraki bloklara geçmeden dur
- [x] G5-CP-A-R1 — Canlı katalog snapshot’ı, canonical capability hesap ve 13 hizmet eşleşme kanıtını oluştur
- [x] G5-CP-A-R2 — 79 satırlık UNKNOWN=BLOCK service–credential matrix ve hukukçu review template’ini oluştur
- [x] G5-CP-A-R3 — Berlin source registry, connector gap, locale, migration, authorization ve OOM kanıtlarını tamamla
- [x] G5-CP-A-R4 — Hash-manifestli salt-okunur ZIP inceleme paketini oluştur ve CHECKPOINT A’da dur
- [x] G5-CP-A-R5 — Kullanıcı revizyonuna göre satır-bazlı katalog, matrix, source, connector, locale ve migration kanıtını denetle
- [x] G5-CP-A-R6 — DE_BERLIN_CHECKPOINT_A_REVIEW_PACKAGE adlı revize ZIP ve dış dosya/hash tutarlılığını teslim et
- [x] G5-CP-A-R7 — Audit export kopyalarını TypeScript kaynak kapsamından çıkarıp gerçek proje typecheck’ini yeniden doğrula

## Beş Ülke Belge Doğrulama v2 — ABD / California / Los Angeles
- [x] G5V2-US-P0 — Teslim paketini, binding komutu ve mevcut CHECKPOINT A dondurma koşullarını salt-okunur denetle
- [x] G5V2-US-A1 — 16 hizmet/62 alt hizmet için canonical ID tabanlı California/Los Angeles matrix ve coverage kanıtını kur
- [x] G5V2-US-A2 — Tüm US requirement/source/connector/locale kayıtlarını additive, SOURCE_UNVERIFIED, PENDING ve DRAFT_MACHINE default-off olarak oluştur
- [x] G5V2-US-A3 — Provider eligibility, transition-window ve Türkiye/Berlin izolasyonu için fail-closed politika/test kanıtlarını tamamla
- [x] G5V2-US-CP-A — US/California/Los Angeles CHECKPOINT A kanıt paketini üret ve Rusya’ya başlamadan dur
- [x] G5V2-US-EXPORT-1 — 62 coverage, 26 bundle, 28 source, connector, locale ve provider-impact satır-bazlı audit kanıtlarını genişlet
- [x] G5V2-US-EXPORT-2 — Diff, migration/FK/unique/append-only/rollback, Türkiye-Berlin izolasyonu ve quality/OOM kanıtlarını derle
- [x] G5V2-US-EXPORT-3 — İstenen adlarla salt-okunur US_CA_LA_CHECKPOINT_A_REVIEW paketini hash/manifest ile oluşturup teslim et ve dur
- [x] G5V2-US-EXPORT-4 — US_CA_LA_CONNECTOR_GAP_REPORT.md ve US_CA_LA_LEGAL_REVIEW_TEMPLATE.xlsx deliverable’larını üretip nihai pakete ekle

## Türkiye-Only Production ve Owner Country Control
- [x] TRC-P0 — Türkiye/diğer ülke state, gate, allowlist ve Berlin-US freeze başlangıç durumunu salt-okunur denetle
- [x] TRC-P1 — Desired/effective country state, owner reason/MFA audit ve emergency kill-switch veri modelini additive kur
- [x] TRC-P2 — Owner-only country ve pazar yönetimi API/panelini server-authoritative fail-closed uygula
- [x] TRC-P3 — Kapalı ülke için onboarding, activation, discovery, offer, booking, payment, payout ve notification bypasslarını engelle
- [x] TRC-P4 — Türkiye readiness matrisi, production allowlist taslağı, diğer ülkeler INFRA_ONLY kanıtı ve rollback planını üret
- [x] TRC-P5 — Yetki/bypass/transition regressionları ile kalite kapılarını çalıştır; report/evidence teslim edip yayın yapmadan dur

## Türkiye Production Readiness — Hukuk, Connector ve Fiziksel Cihaz E2E
- [x] TRR-A0 — Mevcut TR catalog/matrix, source, connector, legal approval, capability ve country-control durumunu salt-okunur denetle
- [x] TRR-A1 — 16 aile/62 alt hizmet için SOURCE_UNVERIFIED/LEGAL_REVIEW_REQUIRED satır-bazlı hukuk ve counsel review paketini üret
- [x] TRR-A2 — Resmî connector ve external credential register’ını izinli doğrulama yüzeyleriyle fail-closed sınıflandır
- [x] TRR-B1 — Fiziksel iOS/Android cihaz E2E, gerçek credential ve store/DNS bağımlılıklarını BLOCKED_EXTERNAL_INPUT olarak kanıtla
- [x] TRR-FINAL — Capability readiness sınıflandırması, allowlist/NO-GO, hashli evidence paketleri ve final report’u yayın yapmadan teslim et

## Login Signup Satırı Görünürlük Düzeltmesi
- [x] LOGIN-SIGNUP-1 — “Hesabınız yok mu? Kayıt Ol” satırının mevcut tema, yönlendirme ve durum stillerini denetle
- [x] LOGIN-SIGNUP-2 — Semantic tema tokenlarıyla dark/light, pressed/focused/disabled görünürlüğünü hedefli düzelt
- [x] LOGIN-SIGNUP-3 — iPhone Safari dark/light tema, kontrast, tüm-satır yönlendirmesi ve VoiceOver fiziksel kanıtını doğrula; yayın yapmadan teslim et

## Login Safari Tema Regresyonu
- [x] LOGIN-THEME-1 — Authoritative tema kaynağı, Safari prefers-color-scheme ve regresyon diffini denetle
- [x] LOGIN-THEME-2 — Yalnız login ekranındaki foreground/muted semantic token ve canlı dark/light senkronunu düzelt
- [x] LOGIN-THEME-3 — iPhone Safari dark/light fiziksel kontrol, refresh/kontrast ve register yönlendirmesi kullanıcı kanıtıyla PASS
- [x] LOGIN-THEME-4 — Safari kanıt checkpoint’ini kaydet; native iOS/Android fiziksel doğrulamasını WAITING FOR PHYSICAL DEVICE EVIDENCE olarak açık bırak
- [ ] LOGIN-NATIVE-PHYSICAL — Native iOS ve Android uygulama build’i üzerinde dark/light, VoiceOver/TalkBack ve register yönlendirmesi fiziksel kanıtını tamamla
- [ ] AUTH-EMAIL-DELIVERY — Gerçek SMTP/e-posta teslimatını credential ve canlı sağlayıcı kabulüyle ayrıca doğrula; enumeration korumasını delivery PASS sayma

## Salt-Okunur Uygulama Geneli Tema ve Görünürlük Denetimi
- [x] THEME-AUDIT-1 — Authoritative router/role ekran envanteri, semantic token/hard-coded renk taraması, dark/light görünürlük ve WCAG evidence matrisi üret; sorunları düzeltmeden raporla

## Kontrollü Runtime Tema Doğrulama ve Minimal Remediasyon
- [ ] THEME-RUNTIME-1 — İzole development/staging müşteri, provider ve owner/admin yüzeylerinde 61 user-facing rota için web dark/light runtime kanıtı topla
- [ ] THEME-RUNTIME-2 — Her raw-color/opacity bulgusunu legitimate accent/status veya confirmed contrast defect olarak sınıflandır
- [ ] THEME-RUNTIME-3 — Yalnız runtime’da doğrulanmış kontrast/tema kusurlarını minimal semantic token düzeltmeleriyle gider
- [ ] THEME-RUNTIME-4 — Test/build/screenshot regresyonu, güncel matrix ve native blockerlarla checkpoint/report teslim et

## Fail-Closed Dark/Light Runtime Harness
- [x] THEME-HARNESS-1 — Baseline checkpoint, non-production environment, hostname/database/credential preflight ve no-write failure path’ini doğrula (BLOCKED_PRECHECK; yazım yapılmadı)
- [ ] THEME-HARNESS-2 — Test-only run_id, sentetik fixture, scoped cleanup, TTL/crash recovery ve before/after/orphan kayıt raporunu uygula
- [ ] THEME-HARNESS-3 — Public/customer/provider/owner-admin ekranlarında dark/light runtime screenshot, UI state ve contrast manifestini üret
- [ ] THEME-HARNESS-4 — Doğrulanmış kusurları minimal semantic düzelt; grup bazlı test/build/screenshot regresyonu çalıştır
- [ ] THEME-HARNESS-5 — Cleanup kanıtı, güncel 74 rota matrixi, BLOCKED nedenleri, checkpoint kimlikleri ve native/external blockerlarla teslim et

## Yerel İzole Same-Engine Tema Denetim Ortamı
- [x] THEME-LOCAL-1 — Mevcut DB motoru ile sandbox localhost üzerinde `theme_audit_<run_id>` test veritabanı ve browser altyapısı fizibilitesini no-write preflight ile doğrula (BLOCKED_TECHNICAL: local TiDB/MySQL server, localhost listener ve container runtime yok; yazım 0)
- [ ] THEME-LOCAL-2 — Güvenli geçerse run-id fixture, network isolation, scoped cleanup/TTL/crash-recovery ve before/after/orphan kayıt modelini uygula
- [ ] THEME-LOCAL-3 — Yerel public/role-gated rotalarda dark/light screenshot, contrast ve UI-state manifestini üret; erişilemeyen rotaları BLOCKED bırak
- [ ] THEME-LOCAL-4 — Doğrulanmış kusurları minimal düzelt, kalite kapılarını çalıştır ve evidence/cleanup/checkpoint teslim et

## TiDB’siz Public ve Component Fixture Tema Kanıtı
- [x] THEME-PUBLIC-1 — Production DB olmadan erişilebilen public rotaları ve mevcut 14 ekran fixture’ını preflight ile ayır (Login PASS; 14 fixture DB-write nedeniyle BLOCKED; 51 role rota BLOCKED_TIDB_RUNTIME)
- [ ] THEME-PUBLIC-2 — Public rota runtime ve 14 component fixture için ayrı Dark/Light screenshot, refresh/contrast/UI-state manifestini üret
- [ ] THEME-PUBLIC-3 — Sadece yeniden üretilen kusurları minimal düzelt; tüm TiDB/role-gated rotaları BLOCKED_TIDB_RUNTIME bırak
- [ ] THEME-PUBLIC-4 — Secrets içermeyen taşınabilir harness .env.example/preflight/run/cleanup talimatını ekle, kalite kapıları ve güncel 74 rota matrixiyle teslim et

- [x] THEME-PUBLIC-1 — Public/fixture kapsamını production ve TiDB preflight’inden ayrı sınıflandır; no-write blocker sonucunu belgeledi
- [x] THEME-PUBLIC-4 — Secrets içermeyen taşınabilir harness .env.example/preflight/run/cleanup talimatını ekle (visual run BLOCKED)
