# Move&Fix Felaket Kurtarma ve Doğrulama Çalışma Kitabı

> Bu belge bir restore sonucunu iddia etmez. Her operasyon, sorumlu kişi tarafından kontrol edilip kanıt bağlantısı eklenmeden tamamlandı kabul edilmez.

## Kapsam ve Güvenlik İlkeleri

Bu çalışma kitabı ortak API, yönetilen MySQL/TiDB veritabanı, obje depolama, denetim kayıtları ve mobil istemci sürümü için geri dönüş sürecini tanımlar. Üretim erişimi veya altyapı sağlayıcısı kimlik bilgisi olmadan hiçbir geri yükleme çalıştırılmaz. Veri bütünlüğü şüphesinde sistem, mutasyonları feature flag veya bakım politikasıyla kapatılarak **fail-closed** tutulur.

| Varlık | Koruma kaynağı | Geri yükleme sahibi | Başarı kanıtı |
|---|---|---|---|
| MySQL/TiDB veri kümesi | Sağlayıcı yedeği ve point-in-time recovery | DBA / Super Admin | Salt-okunur sayım, migration durumu, denetim örneklemi |
| Şema ve migration | `drizzle/` ve yönetilen migration geçmişi | Uygulama sorumlusu | Uygulanan migration listesi, şema doğrulaması |
| Obje depolama | Sağlayıcı sürümleme/retention politikası | Depolama sorumlusu | Yetkili imzalı erişim ve örnek medya hash'i |
| Uygulama sürümü | Checkpoint, kaynak denetimi ve CI artefaktları | Release sorumlusu | Checkpoint kimliği, SBOM, build hash'i |
| Denetim/operation olayları | Uygulama veritabanı yedeği | Güvenlik sorumlusu | Zaman sıralı örneklem ve hash/ID tutarlılığı |

## Olay Sınıflandırması ve İlk Müdahale

| Olay | İlk güvenli hareket | Yasak hareket | Eskalasyon |
|---|---|---|---|
| Veri bozulması şüphesi | Etkilenen mutasyon flag'ini kapat, salt-okunur kanıt topla | Kaynak veriyi geri döndürülemez silme | DBA + Super Admin |
| Yetkisiz erişim şüphesi | Oturumları geçersizleştir, ilgili anahtarları sağlayıcıdan döndür, audit bağlamını sakla | Loglara PII/secret kopyalama | Güvenlik sorumlusu |
| Sağlayıcı kesintisi | Sağlayıcı adaptörünü `NOT_CONFIGURED`/`UNAVAILABLE` ile fail-closed bırak | Sahte teslimat, ödeme veya bildirim üretme | Operasyon sorumlusu |
| Uygulama sürümü geri alma | Son doğrulanmış checkpoint'ten rollback planı çıkar | Veritabanını kod rollback'iyle otomatik geri alma | Release sorumlusu + DBA |

## Geri Yükleme Prosedürü

1. Olay kimliği, kapsamı, başlangıç zamanı ve karar sahibini immutable operasyon kaydına ekleyin.
2. Etkilenen yazma yollarını feature flag, launch gate veya bakım prosedürüyle kapatın; yalnız okuma yolunun güvenli olduğunu ayrıca doğrulayın.
3. Sağlayıcı konsolunda seçilen yedek/PITR noktasını ikinci yetkili ile doğrulayın. Üretimde kimlik bilgisi, bağlantı dizesi veya ham yedek içeriği bu kayda yazılmaz.
4. Geri yüklemeyi önce izole ortamda gerçekleştirin. `drizzle` migration geçmişi, kullanıcı sayımları, service request/ledger referans tutarlılığı ve immutable operation event örneklemiyle karşılaştırın.
5. Ödeme/ledger etkisi varsa gateway callback referansı olmadan settlement veya refund tamamlanmış sayılmaz; mutasyonlar uzlaştırma bitene kadar blokeli kalır.
6. İzole doğrulama başarılı olduğunda, onaylı değişiklik penceresinde üretim geri yüklemesini gerçekleştirin. Ardından health, read-only sorgular, yetki kontrolleri, test paketi ve audit örneklemini yeniden çalıştırın.
7. Kanıtlar tamamlanmadan feature flag'leri geri açmayın. Kapanışta etkilenen veri aralığı, geri yükleme noktası, doğrulama komutları ve açık takip maddeleri kaydedilir.

## Zorunlu Doğrulama Matrisi

| Kontrol | Komut veya yöntem | Kabul ölçütü |
|---|---|---|
| Uygulama sağlık durumu | `GET /health`, `GET /ready`, `GET /live` | Veritabanı hata vermiyor; durum açıklaması gerçek bağımlılık durumunu yansıtıyor |
| Şema tutarlılığı | Migration geçmişi + salt-okunur sorgu | Beklenen migration'lar mevcut, beklenmeyen veri silinmesi yok |
| Yetki izolasyonu | Mevcut tRPC/HTTP yetki regresyonları | Customer, professional ve Super Admin sınırları korunuyor |
| Finansal bütünlük | Ledger/refund callback referans örneklemi | Gateway referanssız settlement yok; TRY minor/major birim kuralı korunuyor |
| Medya erişimi | Katılımcı bağlı imzalı erişim örneklemi | Opaque kimlik ve sahiplik kontrolü geçmeden erişim yok |
| Tedarik zinciri | `pnpm supply:verify` ve prod audit | Lisans/SBOM kapıları geçiyor; yeni bulgular kayda alınıyor |

## Zamanlanmış İşler ve Retention

Belge retention, completion otomatik bırakma ve benzeri zamanlanmış süreçler yalnız ilgili imzalı secret yapılandırıldığında etkinleşir. Secret yoksa ilgili uç nokta **NOT_CONFIGURED** döner; iş başarıyla koşmuş gibi kaydedilmez. Her etkinleştirme sonrası aşağıdaki kanıtlar gerekir:

| Kontrol | Kanıt |
|---|---|
| İmza/secret doğrulaması | Secret değeri açıklanmadan 2xx dışı geçersiz imza denemesi sonucu |
| Tekrarlama güvenliği | Aynı callback için idempotent karar ve tek audit olayı |
| Legal hold | Hold altındaki verinin purge edilmediğini gösteren yetkili sorgu |
| Geri alınabilirlik | Çalıştırma öncesi ve sonrası saklama sayımı |

## Mevcut Dış Operasyon Blokajları

- Sağlayıcı yedekleme, PITR ve obje depolama sürümleme politikalarının gerçek üretim hesabında doğrulanması gerekir.
- `DOCUMENT_RETENTION_CRON_SECRET`, APM erişim bilgileri ve dış sağlayıcı kimlik bilgileri eklenmeden ilgili gerçek teslimat/otomasyon denemesi yapılmaz.
- Üretim DNS/HTTPS ve fiziksel cihaz doğrulaması tamamlanmadan mağaza sürümü veya production recovery drill tamamlandı sayılmaz.
