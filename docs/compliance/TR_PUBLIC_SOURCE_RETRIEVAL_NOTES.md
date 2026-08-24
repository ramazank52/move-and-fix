# Türkiye Kamuya Açık Kaynak Retrieval Notları

**Retrieval tarihi:** 24 Ağustos 2026  
**Statü:** `SOURCE_UNVERIFIED` / `LEGAL_REVIEW_REQUIRED`  
**Kullanım sınırı:** Bu not, yalnız kamuya açık discovery/retrieval metadata’sını korur. Satır-bazlı hukuk değerlendirmesi, source verification, effective-date kabulü veya connector yetkisi oluşturmaz.

| Kaynak | URL | Retrieval bulgusu | Doğrulama sınırı |
|---|---|---|---|
| MYK belge zorunluluğu portalı | https://portal.myk.gov.tr/index.php?belge_zorunlu=1&option=com_yeterlilik&view=arama | Portal, yeterlilik kodu, ad, seviye, revizyon, onay tarihi/sayısı ve belge zorunluluk tarihi alanlarını yayımlar; örneğin Ahşap Mobilya İmalatçısı ve klima yeterlilik kayıtları görünür. | Portal output’u sorgu yüzeyidir; tek başına belirli hizmete ilişkin güncel zorunluluk/istisna veya belge sahibinin doğrulanması değildir. |
| UAB Yetki Belgesi Hizmetleri | https://uhdgm.uab.gov.tr/yetki-belgeleri-hizmetleri | Resmi sayfa, e-Devlet üzerinde firma/yetki belgesi/taşıt belgesi sorgulama ve doğrulama yüzeylerine bağlantı listeler. | Login/izin gerektiren yüzeyler scrape edilmedi; API/sözleşme/izin kanıtı olmadan connector `PENDING` kalır. |
| EPDK doğal gaz sertifika işlemleri | https://www.epdk.gov.tr/Detay/Icerik/3-0-81/dogal-gazsertifika-islemleri | Kamuya açık sayfa EPDK kurum yüzeyini ve sertifika işlemleri bağlantısını gösterir. | Retrieval eksik/partial olabilecek içerik nedeniyle sertifika kapsamı, şartı, yürürlük veya doğrulama yöntemi kabul edilmedi. |
| SERBİS yetkili servis sorgusu | https://www.servis.gov.tr/Genel/Sorgu | Kamuya açık arayüz üretici/ithalatçı, marka, ürün, il ve ilçe seçimli yetkili servis sorgusu sunar. | İddia sahibinin kaydı için izinli API/issuer doğrulaması veya kayıtlı manuel teyit kanıtı yoktur; `AUTHORITY_VERIFIED` üretmez. |

## Counsel İnceleme Kuralları

1. Her source archive için resmi metnin tam kopyası veya resmî, değişmez referansı, SHA-256’si, retrieval zamanı ve kabul eden yerel hukukçu gerekir.
2. Resmî Gazete tarihi/sayısı, madde/ek/istisna ve yürürlük tarihi yalnız counsel tarafından satır bazında doldurulacaktır.
3. E-Devlet, CAPTCHA veya giriş gerektiren portallara otomatik giriş/scraping yapılmayacaktır.
4. OCR, belge görseli veya bu retrieval notu hiçbir zaman `AUTHORITY_VERIFIED` değildir.
