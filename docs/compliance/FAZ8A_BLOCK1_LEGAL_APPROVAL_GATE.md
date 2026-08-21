# Faz 8-A Blok 1 — Kaynak ve Hukuk Onay Kapısı

**Kapsam:** `transport.freight`, `moving.household` ve `towing.roadside` capability profilleri.  
**Kural paketi:** `TR-GOLD-2026-08-13-v1.0`.  
**Durum:** **NO-GO — tüm production aktivasyonları kapalıdır.**

> `LEGAL_SOURCE_APPROVAL` yetkin Türkiye hukuk/uyum sorumlusunun, somut requirement satırını yürürlükteki resmî kaynakla doğrulayıp kayda geçirmesidir. AI, Manus, ürün sahibi veya operasyon kullanıcısının mesajı, desteği ya da ref numarası bu onayın yerine geçmez.

| Ayrı kayıt | Mevcut durum | Yetkili kişi | Etkisi |
|---|---|---|---|
| `LEGAL_SOURCE_APPROVAL` | **PENDING — Yetkin Türkiye hukuk/uyum sorumlusu onayı bekleniyor** | Yetkin Türkiye hukuk/uyum sorumlusu | Kaynak satırını `SOURCE_VERIFIED` ve hukukça uygun duruma taşımak için zorunludur. |
| `PRODUCT_RELEASE_APPROVAL` | **PENDING — Görevi veren kişi onayı bekleniyor** | Görevi veren ürün/operasyon sorumlusu | Hukuk onayından bağımsız release/operasyon kararını kaydeder; hukuk onayı yerine geçmez. |

## SOURCE_UNVERIFIED / LEGAL_REVIEW_REQUIRED Envanteri

Kaynak paketinin production legal sign-off gerektiren taslak statüsü nedeniyle Blok 1’deki **tüm** requirement satırları aşağıdaki kuyrukta kalır. Sayısal coverage sonucu: `SOURCE_VERIFIED = 0`, `SOURCE_UNVERIFIED veya LEGAL_REVIEW_REQUIRED = 24`, `POLICY_ELIGIBLE = 0`.[1]

| capability_key | Kaynak kapsamı / satır grubu | Bekleyen karar | Çalışma zamanı statüsü |
|---|---|---|---|
| `moving.household` | Yurtiçi ev/büro taşıma: K3, taşıt, ehliyet, SRC4, ODY4/ÜDY4, psikoteknik/sağlık | Kuralın güncel uygulanabilirliği ve resmî doğrulama connector kapsamı | `pending_legal_review` |
| `moving.household` | Uluslararası + yurtiçi ev/büro taşıma: C3, taşıt, SRC3, ODY3/ÜDY3 | Kuralın güncel uygulanabilirliği ve resmî doğrulama connector kapsamı | `pending_legal_review` |
| `transport.freight` | Yurtiçi genel ticari eşya: K1/K1*, taşıt, SRC4 | Faaliyet/araç modeli eşleşmesi ve resmî doğrulama connector kapsamı | `pending_legal_review` |
| `transport.freight` | Asansörlü nakliye / mobil vinç-kaldırma: operatör, tescil, periyodik kontrol | Somut ekipman sınıfı ve yerel/güncel kural çözümü | `source_unverified` |
| `towing.roadside` | Ticari araç kurtarma/çekme: K1Ö, ruhsat-taşıt, ehliyet, SRC, operatör | Somut oto-kurtarıcı modelinin UAB kapsamı ve ekipman-sürücü zinciri | `pending_legal_review` |
| `towing.roadside` | Akü takviyesi; lastik/jant; yol üstü mekanik onarım | Temel destek ile yüksek riskli onarım sınırı, güncel zorunluluk/muafiyet ve resmî connector kapsamı | `pending_legal_review` |
| `towing.roadside` | Araç çekme/kurtarma | `towing:1` zincirinin resmî doğrulaması | `source_unverified` |
| `towing.roadside` | Yolda yakıt ulaştırma | Kaynak paketi `DISABLED_PENDING_DANGEROUS_GOODS_FUEL_PACK` ve `BLOCK` | `source_unverified` (hard block) |

## Fail-Closed Geçiş ve Acil Durdurma Kuralı

Her capability yalnız kendi statüsünden yönetilir; doğrulanamayan veya sona eren hizmet kabiliyeti askıya alınır.[1] Geçiş penceresi otomatik ya da koşulsuz değildir. Aşağıdaki koşullardan biri varsa profile `suspended` yapılır; mevcut sağlayıcı için geçiş süresi yoktur:

| Acil durdurma nedeni | Zorunlu davranış |
|---|---|
| Faaliyet belgesiz yürütülemiyorsa, zorunlu belge yoksa veya belge başka kişi/işletmeye aitse | İlgili capability derhal durdurulur. |
| Belge sahte/değiştirilmiş, iptal/geri alınmış/askıda veya süresi dolmuşsa | İlgili capability derhal durdurulur. |
| Türkiye’de çalışma hakkı yoksa | İlgili capability derhal durdurulur. |
| Araç, taşıma, iş makinesi ya da diğer yüksek riskli faaliyette ciddi güvenlik açığı varsa | İlgili capability derhal durdurulur. |
| Resmî kurum kararı veya kabul edilemez fraud/kimlik/hesap ele geçirilmesi riski varsa | İlgili capability derhal durdurulur. |

Geçiş yalnız hukuken izin verilebilen, güvenlik bakımından kabul edilebilir, belgesi geçerli olup yalnız yeni platform kanıtı gereken ve ayrıca yetkin hukuk/uyum sorumlusunca geçişe uygun bulunan sağlayıcıya uygulanabilir. Süreyi AI, Manus veya ürün sahibi belirleyemez.

## Production Aktivasyon Sözleşmesi

Bir profile `active` durumu verilebilmesi için aşağıdaki tüm kayıtlar birlikte sağlanmalıdır. Bu Blok 1’de henüz hiçbir satır bu eşiği karşılamaz.

| Zorunlu koşul | Mevcut durum |
|---|---|
| Capability profile tam ve `TR` yargı alanında | `providerCapabilityProfiles` ve `ProviderCapabilityProfilePolicy` ile server-authoritative zorunlu. |
| Her zorunlu belge/evidence için resmî kaynak sinyali | Connector/özel resmî sorgu kapsamı hukuken onaylanana kadar beklemede. |
| Kayıtlı `LEGAL_SOURCE_APPROVAL` | **PENDING** |
| Kayıtlı `PRODUCT_RELEASE_APPROVAL` | **PENDING** |
| Acil durdurma sinyali olmaması | Credential/document kararları ve `suspended` profile statüsü onboarding kararında fail-closed denetlenir. |

Uygulama sahibi yalnız `draft`, `pending_legal_review`, `source_unverified` veya `suspended` statüsünde profil kaydedebilir. `legal_approved`, `active`, `LEGAL_SOURCE_APPROVAL` ve `PRODUCT_RELEASE_APPROVAL` alanları provider yazma sözleşmesinin dışındadır. Böylece provider, AI veya kullanıcı mesajı hukuk onayı üretemez.

## Kaynaklar

[1]: ../../server/compliance/approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Gold_Master_Country_Pack_v1.json "TR Gold Master Country Pack v1"
