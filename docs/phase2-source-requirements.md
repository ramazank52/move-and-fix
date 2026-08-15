# Faz 2 Kaynak Gereksinim Kaydı

Bu kayıt, kullanıcının sağladığı `Pasted_content_02.txt` belgesinin teknik gereksinimlerini değişmeden izlenebilir kılmak için oluşturulmuştur. Bu belge **hukuki görüş veya ülke kuralı içeriği değildir**.

## Değişmez Ürün Kuralları

| Kural | Teknik karşılık |
|---|---|
| Doğrulanmış kişi bütün hizmetleri otomatik yapamaz | Kararlar `provider + capability + jurisdiction` düzeyinde tutulur. |
| Bilinmeyen hukuk veya belge zorunluluğu | İlgili capability fail-closed olarak engellenir; hesap bütünüyle kapatılmaz. |
| Kanıt seviyesi F yalnız belge görüntüsüdür | Seviye F tek başına `VERIFIED` üretmez. |
| AI hukuk veya resmî kayıt otoritesi değildir | AI yalnız öneri/çıkarım sinyali üretir; karar resmî kanıt, sürümlü kural ve insan onayından türetilir. |
| Sona eren belge | Yalnız bağlı capability durdurulur ve yeniden denetim sürecine alınır. |

## Ülke Uyum Yönetimi

Ülke, bölge/şehir, hizmet, alt hizmet, faaliyet ve sağlayıcı türü düzeyinde sürümlü kurallar desteklenmelidir. Ülke kuralı ve resmî kaynak kayıtları yalnız yönetici tarafından `DRAFT → LEGAL_REVIEW → APPROVED → ACTIVE` benzeri onay akışıyla üretimde kullanılabilir hâle gelir. AI, yeni ülke hukuku veya resmî kaynak kaydını kendiliğinden üretim veritabanına yazamaz.

## Ülke Açma Kapısı

Profesyonel marketplace, hizmet uyumu, belge kuralları, resmî kaynaklar, platform hukuku, ödeme/vergi/gizlilik/sigorta/tüketici/AI/güvenlik/destek/store uyumu, hukuk-gizlilik-ödeme-güvenlik onayları ve üretim testleri tamamlanmadan etkinleşmez. Kritik bir kalem eksikse ülke profesyonel marketplace’i engellenir.

## Türkiye Pilot Sınırı

Kullanıcı `TR_Gold_Master_Country_Pack_v1.md`, `TR_Gold_Master_Country_Pack_v1.json` ve `TR_Official_Source_Registry_v1.json` kaynaklarını belirtmiştir. Bu dosyalar mevcut çalışma alanına iletilmediği için Türkiye’ye ait hukuki kural veya resmî kaynak içeriği uydurulmayacaktır. Altyapı, bu dosyalar hukuken onaylı içerikle sağlandığında sürümlü import ve insan onayı için hazır tutulacaktır.
