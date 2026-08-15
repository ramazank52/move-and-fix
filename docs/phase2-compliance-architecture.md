# Faz 2 — Capability Uyum Mimarisi

## Değişmez Sınırlar

Bu faz, mevcut `providers.isVerified` hesabı doğrulamasını kaldırmaz. Bu alan yalnız hesap/kimlik seviyesi görünürlük için korunur; belirli bir hizmeti sunma yetkisi **provider + capability + jurisdiction** bağlamında ayrı değerlendirilir.

Her capability kararı, resmî kanıt veya insan onaylı kural olmadan `VERIFIED` üretemez. OCR, belge türü tahmini, QR çıkarımı ve sahtecilik sinyalleri yalnız öneri niteliğindedir. Belge görüntüsü tek başına en yüksek `F` güvence seviyesidir ve doğrulanmış sonuç üretmez.

> Bilinmeyen hukuki veya belge gereksinimi yalnız ilgili capability’yi engeller. Bu durum profesyonelin tüm hesabını, başka doğrulanmış hizmetlerini veya geçmiş kazançlarını etkilemez.

## Mevcut Modelle Eşleme

| Mevcut bileşen | Korunan davranış | Faz 2 genişletmesi |
|---|---|---|
| `providers` | Kimlik/profil doğrulama ve genel durum | Capability yetkisi için kaynak değildir; yalnız profil seviyesi sinyal olarak kalır. |
| `provider_documents` | Sahiplik, dosya hash’i, yönetici incelemesi | Credential kaydına bağlanır; resmî kanıt, geçerlilik, kaynak ve saklama durumu ayrıştırılır. |
| `service_categories` / `service_subcategories` | Hizmet katalog kimliği | Capability eşlemesinde hizmet ve alt hizmet hedefi olur. |
| Yönetici belge incelemesi | İnsan onaylı karar | İnsan incelemesi, itiraz ve kayıtlı karar zincirinin bir adımı olur. |
| Ödeme/cüzdan | Mevcut güvenlik kuralları | Capability uyumu ödeme defterini değiştirmez; yalnız yeni iş/fırsat uygunluğunu sınırlar. |

## Faz 2 Karar Durumları

Capability kararları: `VERIFIED`, `VERIFIED_LIMITED_SCOPE`, `MANUAL_REVIEW`, `REJECTED`, `EXPIRED_OR_SUSPENDED`, `LEGAL_REVIEW_REQUIRED`.

Her kararda kanıt güvence seviyesi (`A`–`F`), yargı alanı, kural sürümü, kaynak sürümü, geçerlilik tarihleri, iptal durumu ve yeniden kontrol zamanı tutulur. `F` seviyesi hiçbir politika yolunda `VERIFIED` ile sonuçlanamaz.

## Süreç ve Yetkilendirme

Profesyonel yalnız kendi credential’ını yükleyebilir, kendi kararını görebilir ve kendi capability’si için itiraz/yeni belge sunabilir. Yönetici yalnız insan incelemesi yapabilir; hukuk kuralları taslak olarak girilir ve ayrı hukuk onayı olmadan aktif olamaz. AI, resmî kaynak veya hukuk kuralı yazamaz; yalnız karar vermeyen analiz önerisi sunabilir.

## Otomasyon Kararı

Sona erme hatırlatmaları ve yeniden kontrol aday seçimi deterministiktir. Uygulamanın imzalı iç zamanlama uçları üzerinden günlük çalışacak şekilde tasarlanır; bu iş için bağımsız bir AI görevi veya sürekli istemci işlemi kullanılmaz. Resmî kaynak doğrulaması, yalnız yönetici onaylı bir kaynak bağlantısı ve sağlayıcı erişim koşulları tanımlandığında etkinleştirilecektir.

## Türkiye Pilotu

Türkiye için teknik seed kabuğu ve sürümleme hazırlanabilir. Ancak kullanıcının sağladığı, hukuk onayından geçmiş kaynaklar olmadan hangi faaliyette hangi belgenin zorunlu olduğu üretim verisi yazılmaz. Bu durumda ülke marketplace kapısı `BLOCKED` kalır.
