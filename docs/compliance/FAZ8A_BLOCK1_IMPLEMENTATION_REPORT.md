# Faz 8-A Blok 1 — Uygulama ve Doğrulama Raporu

**Durum:** Internal Blok 1 uygulaması tamamlandı; ilgili Türkiye hizmet capability’leri için production aktivasyonu **NO-GO** durumunda kalmaya devam eder. Bu sonuç hukuk onayı değildir.

## Kapsam ve Güvenlik Kararı

Blok 1, yalnız `transport.freight`, `moving.household` ve `towing.roadside` capability anahtarlarını kapsar. `TR-GOLD-2026-08-13-v1.0` paketinin taslak hukuk statüsü nedeniyle hiçbir requirement satırı `SOURCE_VERIFIED` veya `POLICY_ELIGIBLE` yapılmamıştır. `LEGAL_SOURCE_APPROVAL` ile `PRODUCT_RELEASE_APPROVAL` ayrı nullable referans alanları olarak kalıcılaştırılmıştır; ikisi olmadan profile etkinleşemez.[1]

| Katman | Uygulanan koruma | Sonuç |
|---|---|---|
| Veri modeli | Additive `provider_capability_profiles` tablosu; sağlaycı, capability, `TR`, çalışma modeli, araç tipi, statü ve iki onay referansı | `0083` TiDB’ye uygulandı |
| Yazma yetkisi | `provider.setCapabilityProfile` yalnız oturum sahibi profesyonelin gerçek profil verisini kaydetmesine izin verir | Provider `legal_approved` veya `active` yazamaz |
| Activation | `ProviderCapabilityProfilePolicy` her iki ayrı kayıt, canonical scope ve statüyü değerlendirir | Eksik/çelişkili durum `BLOCKED` |
| Onboarding | Eksik, taslak, hukuk incelemede, kaynak doğrulanmamış, askıda veya scope çözümlenmemiş profile blocker ekler | `UNKNOWN = BLOCK` |
| Acil durdurma | Sahte, iptal/askıda, süresi dolmuş veya başka kişiye ait belge için mevcut credential/document başarısız kararı korunur | `DOCUMENTS_NOT_APPROVED` ve/veya `DYNAMIC_CREDENTIALS_NOT_VERIFIED` ile fail-closed |

## Kaynak ve Onay Sınırı

Servis-belge matrisi, yalnız onaylı Gold Master paketi ve paket tarafından referanslanan resmî kayıt uçlarına dayanır. Paket üretim hukuk sign-off’u içermediğinden matristeki 24 satır `SOURCE_UNVERIFIED` veya `LEGAL_REVIEW_REQUIRED` statüsünde tutulur. Yeni hukuk kuralı, belge zorunluluğu veya geçiş süresi üretilmemiştir.[1]

> `LEGAL_SOURCE_APPROVAL`, yetkin Türkiye hukuk/uyum sorumlusu tarafından verilecek kayıtlı onaydır. AI, Manus, ürün sahibi veya provider bu onayı üretemez. `PRODUCT_RELEASE_APPROVAL` ayrı bir ürün/operasyon kararıdır ve hukuk onayının yerini tutmaz.

## Doğrulama Kanıtı

| Kontrol | Gerçek sonuç |
|---|---|
| Hedefli Faz 8-A testleri | `1` dosya, `5` test PASS |
| İlgili onboarding regresyonu | `4` dosya, `15` test PASS |
| Tam regresyon | `125` dosya, `729` test PASS |
| Lint | PASS |
| TypeScript | 1792 MB uncached PASS; 512 MB incremental-cache doğrulaması PASS |
| Backend build | PASS |
| Drizzle integrity | `pnpm drizzle-kit check` PASS |
| Whitespace | `git diff --check` PASS |

İlk tam regresyon denemesi, doğrulama öncesi geçici olarak durdurulmuş API nedeniyle 29 HTTP testinde `ECONNREFUSED` ile başarısız olmuştur; API yeniden başlatıldıktan sonraki tekrar `125/729 PASS` sonucunu vermiştir. Bu başlangıç sonucu başarı olarak sayılmamıştır.

## Kalan Gerçek Kapılar

| Kapı | Durum | Etki |
|---|---|---|
| Yetkin Türkiye hukuk/uyum sorumlusu `LEGAL_SOURCE_APPROVAL` | PENDING | Blok 1 source/rule-pack production aktivasyonu kapalı |
| Görevi veren kişi `PRODUCT_RELEASE_APPROVAL` | PENDING | Hukuk onayından bağımsız release kapısı kapalı |
| Resmî doğrulama connector’ları ve hukuken uygun sorgu kapsamı | PENDING | Görüntü analizi tek başına resmi doğrulama yerine geçemez |
| Gerçek servis credential’ları / fiziksel cihaz E2E | EXTERNAL INTEGRATION GATE | Canlı production doğrulaması yapılamaz |

## Kaynak

[1]: ../../server/compliance/approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Gold_Master_Country_Pack_v1.json "TR Gold Master Country Pack v1"
