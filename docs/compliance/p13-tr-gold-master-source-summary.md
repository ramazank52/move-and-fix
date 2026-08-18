# P13 — Onaylı TR Gold Master Kaynak Özeti

Bu dosya, kullanıcı tarafından sağlanan `MoveFix_TR_Gold_Master_Approved_Source_Pack.zip` içindeki üç birlikte doğrulanan kaynağın (`TR_Gold_Master_Country_Pack_v1.json`, `TR_Official_Source_Registry_v1.json`, `TR_Gold_Master_Country_Pack_v1.md`) uygulama kapsamına alınan özetidir. Tek hukuki source-of-truth paketin `pack_id` değeri **`TR-GOLD-2026-08-13-v1.0`**, ülke değeri **`TR`**, kaynak durumu ise **`RESEARCH_COMPLETE_DRAFT__PRODUCTION_LEGAL_SIGNOFF_REQUIRED`** olarak okunmuştur.

> Bu paket bir ülke veya kategori lansmanını onaylamaz. Paket yüklenmiş olması, `country_launch_gate` veya herhangi bir compliance package için `enabled` durumu yaratmaz. Kaynakta olmayan bir kural eklenmez; eşleştirilemeyen ya da yerel/iş kapsamı belirsiz her durum `UNKNOWN = BLOCK / LEGAL_REVIEW_REQUIRED` olarak kalır.

| Onaylı paket hizmet anahtarı | Katalog işareti | Kaynakta doğrulanan kural yaklaşımı |
|---|---:|---|
| `cleaning` | Evet | Tek ülke-geneli ruhsat varsayımı yok; ortak kimlik/çalışma/faaliyet kontrolü gerekir. |
| `plumbing` | Evet | MYK/MEB veya yerel su idaresi kapsamı; mühürlü/idare ekipmanı çözülene dek block. |
| `electrical` | Evet | İş kapsamına göre yetkinlik/fen adamı/şebeke yetkisi; kapsam kanıtlanmazsa block. |
| `painting` | Evet | MYK/MEB kabul edilen muafiyet modeliyle kaynak-temelli değerlendirme. |
| `air_conditioning` | Evet | F-gaz devresi gibi özel işlerde gerekli unsur doğrulanmazsa block. |
| `heating` | Evet | Doğal gaz iç tesisatta kişi, işletme ve yerel dağıtım kuralı birlikte doğrulanmadan block. |
| `moving` | Evet | Ticari taşıma ve ekipman kapsamı için güncel yetki zinciri gerekir. |
| `locksmith` | Evet | Acil erişim işlerinde müşteri mülkiyet/kullanım yetkisi kanıtı gerekir. |
| `towing` | Evet | UAB kapsamı ve gerekli operatör zinciri çözülmezse block. |
| `roadside_assistance` | Evet | Yakıt ulaştırma kaynakta disabled; çekici/kilit açma işleri üst kuralları devralır. |
| `courier` | Evet | Faaliyet/taşıt kapsamına göre kurye yetki zinciri ve geçiş kuralı gerekir. |
| `furniture` | Hayır | Paket aktif katalog olarak işaretlemez; yalnız kaynakta tanımlı değerlendirme yapılabilir. |
| `automotive` | Hayır | Paket aktif katalog olarak işaretlemez; yalnız kaynakta tanımlı değerlendirme yapılabilir. |

## Uygulama Sınırları

1. Kural kararı yalnız sürümlü package + capability + kaynak kaydına bağlı olarak çözümlenir.
2. Kaynak paketinin kendisi `legal_review` durumunda tutulur; canlı enable için ayrı MFA-korumalı hukuk onayı, launch-gate ve harici operasyon ön koşulları gerekir.
3. Kaynakta belirtilen `inherit` ilişkileri, devralınan capability bağlamı doğrulanamadığında genişletilmez.
4. Kaynakta `BLOCK`, `DISABLED`, yerel kural çözümü veya kapsam kanıtı şartı bulunan işler otomatik onaylanmaz.
