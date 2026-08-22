# Germany / Berlin — CHECKPOINT A Source and Service-Credential Matrix

**Country deployment:** `DE` — `SCAFFOLD_ONLY`  
**Pilot jurisdiction node:** `DE-BE-BERLIN` — `SCAFFOLD_ONLY`  
**Scope boundary:** Common Global Scaffold + Germany/Berlin Faz 1–4 only  
**Status:** **CHECKPOINT A — NO-GO / owner decision required**

> Bu kayıtlar, kullanıcı tarafından sağlanan başlangıç araştırmasından alınmış **OFFICIAL_SOURCE_FOUND + SOURCE_UNVERIFIED** discovery satırlarıdır. URL’nin kaydedilmesi, hukuki metnin doğrulanması, bir istisnanın yorumlanması, bir issuer’ın yetkilendirilmesi veya connector erişim izni anlamına gelmez. Bu belge hiçbir şekilde `LEGAL_SOURCE_APPROVAL` ya da `PRODUCT_RELEASE_APPROVAL` değildir.

## 1. Coverage ve Varsayılan-Kapalı Karar

Mevcut canlı kataloğun 79 canonical capability kaydı, `service_capability_definitions` tablosundaki `capability:*` kaydıyla bire bir ilişkilendirilmiştir. `DE-BE-BERLIN` için bu 79 kaydın her biri ayrı `capability_policy_decisions` satırına sahip olsa da tamamı `BLOCKED` durumundadır. Bu, capability’nin Berlin’de sunulabileceği veya herhangi bir belge gerektiği anlamına gelmez; yalnız belirsizlikte market erişiminin kapalı kaldığını gösterir.

| Ölçüm | Değer | Güvenlik etkisi |
|---|---:|---|
| Canonical capability tanımı | 79 | Mevcut katalog kapsamı kayıpsız ilişkilendirildi |
| Berlin policy kararı | 79 | Her satır `BLOCKED` |
| `SOURCE_VERIFIED` policy | 0 | Hiçbiri policy eligible değildir |
| `DRAFT_MACHINE` policy localization | 79 | Kullanıcı runtime’ına açılamaz |
| Berlin dışı sonraki checkpoint city node’u | 0 | Tokyo/LA/Shanghai/Moskova başlatılmadı |

| Ortak capability-decision alanı | Berlin başlangıç değeri | Açılma sonucu |
|---|---|---|
| `decision` | `BLOCKED` | Teklif, onboarding, booking ve ödeme açılmaz |
| `sourceState` | `UNVERIFIED` | SOURCE_VERIFIED / POLICY_ELIGIBLE üretilemez |
| `legalState` | `PENDING` | Local counsel onayı yok |
| `connectorState` | `PENDING` | Resmî doğrulama yok |
| `releaseState` | `PENDING` | Product release onayı yok |
| `translationState` | `DRAFT_MACHINE` | Legal/runtime fallback yasak |
| `dataResidencyState` | `NOT_READY` | Data/privacy gate kapalı |
| `sanctionsState` | `UNKNOWN` | Belirsizlikte blok |

## 2. Service–Credential Matrix

Bu checkpoint’te hiçbir credential type, canlı capability’ye hukuken bağlanmış değildir. Bu nedenle aşağıdaki satırlar **belge isteme kuralı değildir**; yalnız sonraki counsel/source review için boş, default-off credential şablonlarıdır. Painting, towing, moving, courier veya başka bir capability’ye bu checkpoint’te otomatik belge yükleme zorunluluğu uygulanmaz; capability zaten kapalıdır.

| Capability coverage | Credential shell | Classification | Extraction / verification | Mevcut karar |
|---|---|---|---|---|
| 79 canonical Berlin capability’sinin tamamı | `DE_HANDWERKSROLLE` | `UNCLASSIFIED` | `extractionAllowed=0`; authority verification yok | `BLOCKED` |
| 79 canonical Berlin capability’sinin tamamı | `DE_UTILITY_INSTALLER_LIST` | `UNCLASSIFIED` | `extractionAllowed=0`; connector yok | `BLOCKED` |
| 79 canonical Berlin capability’sinin tamamı | `DE_FGAS_PERSON_COMPANY_CERTIFICATE` | `UNCLASSIFIED` | `extractionAllowed=0`; issuer/scope doğrulanmadı | `BLOCKED` |
| 79 canonical Berlin capability’sinin tamamı | `DE_FREIGHT_AUTHORITY_AND_INSURANCE` | `UNCLASSIFIED` | `extractionAllowed=0`; route/weight/vehicle trigger doğrulanmadı | `BLOCKED` |
| 79 canonical Berlin capability’sinin tamamı | `DE_POSTAL_PROVIDER_REGISTRY` | `UNCLASSIFIED` | `extractionAllowed=0`; postal/cargo ayrımı doğrulanmadı | `BLOCKED` |

> **UNKNOWN = BLOCK:** Service/capability → credential bağının bulunmaması, ilgili capability için bir “belge gerekmiyor” sonucu değildir. Bu bağlantı kurulup yetkili local counsel tarafından onaylanana kadar `PROFILE_INCOMPLETE` / `SOURCE_UNVERIFIED` nedeniyle activation mümkün değildir.

## 3. Berlin Requirement–Source Matrix

| Requirement / discovery key | Araştırma referansı | Başlangıç kapsam notu | Source state | Authoritative / legal approval | Enforcement |
|---|---|---|---|---|---|
| `DE-BE-DE-HWO` | [Handwerksordnung](https://www.gesetze-im-internet.de/hwo/) | Anlage A/B craft/notification tetiklerinin araştırma kaydı | `SOURCE_UNVERIFIED` | `false` / `PENDING` | `BLOCKED` |
| `DE-BE-DE-NAV-13` | [NAV §13](https://www.gesetze-im-internet.de/nav/BJNR247710006.html) | Electric utility installer-list discovery | `SOURCE_UNVERIFIED` | `false` / `PENDING` | `BLOCKED` |
| `DE-BE-DE-AVBWASSERV-12` | [AVBWasserV §12](https://www.gesetze-im-internet.de/avbwasserv/BJNR007500980.html) | Water utility installer-list discovery | `SOURCE_UNVERIFIED` | `false` / `PENDING` | `BLOCKED` |
| `DE-BE-DE-NDAV-13` | [NDAV §13](https://www.gesetze-im-internet.de/ndav/__13.html) | Gas installer directory discovery | `SOURCE_UNVERIFIED` | `false` / `PENDING` | `BLOCKED` |
| `DE-BE-DE-CHEMKLIMASCHUTZV-2026` | [ChemKlimaschutzV 2026](https://www.gesetze-im-internet.de/chemklimaschutzv_2026/) | F-gas person/company discovery | `SOURCE_UNVERIFIED` | `false` / `PENDING` | `BLOCKED` |
| `DE-BE-DE-BALM-GUETERVERKEHR` | [BALM freight FAQ](https://www.balm.bund.de/DE/Service/FragenAntwortenFAQ/FragenAntwortenGueterverkehr/fragenantwortengueterverkehr.html) | Moving/freight authority, route/weight/insurance discovery | `SOURCE_UNVERIFIED` | `false` / `PENDING` | `BLOCKED` |
| `DE-BE-DE-POSTG-2024` | [PostG 2024](https://www.gesetze-im-internet.de/postg_2024/BJNR0EC0B0024.html) | Postal-service versus cargo discovery | `SOURCE_UNVERIFIED` | `false` / `PENDING` | `BLOCKED` |
| `DE-BE-DE-BNETZA-POST-DIRECTORY` | [Bundesnetzagentur provider directory](https://www.bundesnetzagentur.de/DE/Fachthemen/Post/Anbieterverzeichnis/artikel.html) | Postal provider directory discovery | `SOURCE_UNVERIFIED` | `false` / `PENDING` | `BLOCKED` |
| `DE-BE-DE-DVGW-INSTALLER-RESEARCH` | [DVGW](https://www.dvgw.de/) | Gas/water installer discovery reference | `SOURCE_UNVERIFIED` | `false` / `PENDING` | `BLOCKED` |
| `DE-BE-DE-VDE-TAB-RESEARCH` | [VDE](https://www.vde.com/) | VDE/TAB/utility technical reference discovery | `SOURCE_UNVERIFIED` | `false` / `PENDING` | `BLOCKED` |

**Source counts:** `SOURCE_VERIFIED = 0 / 10`; `SOURCE_UNVERIFIED = 10 / 10`; source hash present = `0 / 10`. Satırların hiçbirinde source hash veya counsel approval kaydı yoktur; bunun yerine `SOURCE_UNVERIFIED_LOCAL_COUNSEL_REQUIRED` blok nedeni bulunur.

## 4. Connector Registry

Bu dört kayıt bir connector integration veya yetkili sorgu yüzeyi değildir. Hepsi `PENDING`, assurance `NONE`, `forbiddenScraping=1` ve authorization evidence hash’i boştur. Login gerektiren portal scrape edilmemiştir.

| Connector key | Discovery source | Durum | Assurance | Forbidden scraping | Yetkili API/sözleşme |
|---|---|---|---|---:|---|
| `DE_HANDWERKSKAMMER_REGISTRY` | `DE-HWO` | `PENDING` | `NONE` | 1 | `NOT_CONFIGURED` |
| `DE_UTILITY_INSTALLER_REGISTRY` | `DE-NAV-13` | `PENDING` | `NONE` | 1 | `NOT_CONFIGURED` |
| `DE_BALM_FREIGHT_REGISTRY` | `DE-BALM-GUETERVERKEHR` | `PENDING` | `NONE` | 1 | `NOT_CONFIGURED` |
| `DE_BNETZA_POST_REGISTRY` | `DE-BNETZA-POST-DIRECTORY` | `PENDING` | `NONE` | 1 | `NOT_CONFIGURED` |

## 5. Legal Localization Shell

| Legal surface | Locale | Localization state | Runtime selectable | Legal approval |
|---|---|---|---:|---|
| Consumer terms | `de-DE` | `DRAFT_MACHINE` | 0 | `PENDING` |
| Provider agreement | `de-DE` | `DRAFT_MACHINE` | 0 | `PENDING` |
| Privacy notice | `de-DE` | `DRAFT_MACHINE` | 0 | `PENDING` |
| Cookie notice | `de-DE` | `DRAFT_MACHINE` | 0 | `PENDING` |
| Appeal notice | `de-DE` | `DRAFT_MACHINE` | 0 | `PENDING` |
| Incident notice | `de-DE` | `DRAFT_MACHINE` | 0 | `PENDING` |

Bu kayıtların `contentHash` ve `contentStorageKey` alanları boştur. Bu intentional fail-closed tasarımdır: makine taslağı üretildi, kullanıma sunuldu veya hukuken onaylandı iddiası yoktur.

## 6. Exact NO-GO List ve CHECKPOINT A Kararı

| NO-GO nedeni | Kapsam | Açılmayı engelleyen kanıt |
|---|---|---|
| Country shell kapalı | `DE` ve tüm 79 Berlin capability | Tüm feature gate’ler `0`; country state `SCAFFOLD_ONLY` |
| Jurisdiction scaffold-only | `DE-BE-BERLIN` | Node state `SCAFFOLD_ONLY` |
| Kaynak belirsiz | 10/10 discovery satırı | `SOURCE_UNVERIFIED`; source hash yok |
| Local counsel approval yok | Tüm source/requirement satırları | `authoritative=false`, legal state `PENDING` |
| Official connector yok | 4 connector shell | `PENDING`, `NONE`, `forbiddenScraping=1` |
| Legal locale onaylı değil | 6 de-DE legal surface | `DRAFT_MACHINE`, runtime selectable `0` |
| Product release onayı yok | Tüm Berlin capability | release state `PENDING` |
| Data/privacy/payment gate kapalı | Tüm Berlin capability | data-residency `NOT_READY` |
| Türkiye Blok 1 korunuyor | `transport.freight`, `moving.household`, `towing.roadside` | SOURCE_UNVERIFIED state mutasyonu = `0` |

**Exact PASS allowlist:** Yok.  
**Exact production allowlist:** Yok.  
**Checkpoint A kararı:** Germany/Berlin source/credential matrix owner incelemesine sunulmuştur. `SOURCE_VERIFIED`, `LEGAL_SOURCE_APPROVAL`, `PRODUCT_RELEASE_APPROVAL`, connector assurance veya production activation oluşturulmamıştır. CHECKPOINT B / Japan-Tokyo başlatılamaz.
