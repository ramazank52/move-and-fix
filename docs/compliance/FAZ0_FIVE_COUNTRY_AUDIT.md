# Faz 0 — Beş Ülke Güvenli Altyapı Salt-Okunur Denetimi

**Tarih:** 22 Ağustos 2026  
**Bağlayıcı talimat:** `MoveFix_Manus_Bes_Ulke_Guvenli_Altyapi_Komutu_v1(1).txt`  
**Baseline:** `70645d3c4631e150012367cd57e5d8a7b5ab7394` (`70645d3`)  
**Kapsam sınırı:** Bu denetim hiçbir country deployment, rule-pack, connector, release kaydı veya production aktivasyonu oluşturmaz.

> Bu belge yalnız Faz 0 gerçeklik envanteridir. Araştırma raporu ve seed dosyası **SOURCE_UNVERIFIED** / bağlayıcı olmayan başlangıç girdisidir. Hiçbir satır hukuk onayı, resmi kaynak doğrulaması ya da ürün yayın onayı değildir.

## 1. Sonuç ve Korunan Durum

Çalışma ağacı `main` dalında ve HEAD `70645d3` checkpoint’indedir. Çalışma ağacındaki tek değişiklik `todo.md` idi; bu kullanıcı/iş takip değişikliği korunmuştur. Audit sırasında production publish, country veya capability activation, kullanıcı verisi değişimi ve Türkiye Blok 1’e yazım yapılmamıştır.

| Denetim maddesi | Kanıt / sonuç | Durum |
|---|---|---|
| Aktif dal ve HEAD | `main`, `70645d3c4631e150012367cd57e5d8a7b5ab7394` | Korundu |
| Kirli çalışma ağacı | Yalnız `todo.md` değiştirilmişti | Korundu; üzerine yazılmadı |
| Türkiye Blok 1 | `transport.freight`, `moving.household`, `towing.roadside` SOURCE_UNVERIFIED / NO-GO | Değişmedi |
| LEGAL_SOURCE_APPROVAL | Yok | NO-GO korunur |
| PRODUCT_RELEASE_APPROVAL | Yok | NO-GO korunur |
| Publish / production activation | Yapılmadı | Yasak sürüyor |

## 2. Mevcut Migration ve Capability Profile Gerçekliği

`0083_faz8a_capability_profile.sql`, `provider_capability_profiles` tablosunu eklemiştir. Bu tablo ilk sürümde provider/capability/jurisdiction kapsamı, legacy `operatingModel`, profile statüsü ve serbest metin onay referanslarını içeriyordu. `0084_faz8a_approval_ledger_state_machine.sql`, mevcut 0083 satırlarını silmeden operating model sürümü/kodu, ayrık declaration/source/legal/release/voluntary suspension/enforcement durumları ve optimistic `stateVersion` eklemiştir.

| Varlık | Doğrulanmış mevcut güvenlik niteliği | Beş ülke scaffold açısından sınır |
|---|---|---|
| `provider_capability_profiles` | Provider’a ait capability profili; enforcement ve ayrı state alanları mevcut | Global country deployment veya jurisdiction hierarchy değildir |
| `provider_capability_approval_ledger` | Profile-bazlı, append-only olay modeli; legal source/product release türleri | Tüm artifact türlerini kapsayan ülke-geneli ledger değildir |
| `provider_capability_enforcement_events` | Suspend/block/release olayları, yetkili/auditli akış | Country-level release veya connector state modeli değildir |
| `jurisdictions` | `countryCode` + isteğe bağlı `regionCode`; tekil country-region kaydı | Parent/child hierarchy, locale/timezone/data plane ve pilot state içermez |
| `service_capabilities` | Mevcut capability envanteri | Canonical service/subservice/task + risk + required dimensions global modeli değildir |

Migration günlüğünde son kayıt `0084_faz8a_approval_ledger_state_machine` olduğundan sonraki additive migration numarası **0085**’tir.

## 3. Türkiye Blok 1 ve Sağlayıcı Etkisi

Faz 0 sorgusu yalnız toplulaştırılmış sonuç üretmiştir; kişisel veri alınmamıştır. Mevcut sistemde 2 sağlayıcı bulunur; 0 sağlayıcı doğrulanmış/onaylı, 2 sağlayıcı müsait durumundadır. Bu sonuç herhangi bir profile activation veya transition window başlatmaz.

| Alan | Değer | Sonuç |
|---|---:|---|
| Toplam sağlayıcı | 2 | Sadece etki envanteri |
| Doğrulanmış/onaylı sağlayıcı | 0 | Geçiş penceresi/aktif kural tetiklemez |
| Müsait sağlayıcı | 2 | Kişisel veri olmadan toplulaştırıldı |
| Türkiye mevcut jurisdiction kaydı | 1 | Mevcut veri korunacak |
| Türkiye üç yüksek risk capability | 3 | SOURCE_UNVERIFIED ve NO-GO değişmeden kalacak |

Türkiye rule-pack ve profile politikasında provider’ın kendi API’siyle source, legal, release veya enforcement state oluşturmasına izin verilmez. Provider belge/profil beyanı yazabilir; sistem durumları server/owner yetkisine ve doğrulanmış ledger ilişkilerine bağlıdır. Bu ayrım 0084 modelinde `declarationState`, `sourceVerificationState`, `legalApprovalState`, `releaseApprovalState`, `voluntarySuspensionState` ve `enforcementState` ile açıkça bulunur.

## 4. Katalog, Yerelleştirme ve Environment Envanteri

Gerçek database sorgusuna göre aktif katalogda 16 üst hizmet, 62 aktif alt hizmet ve 46 aktif alias bulunur. Mevcut capability sayısı 79’dur. Bunlar henüz beş-ülke canonical mapping’i değildir; bu nedenle yeni ülkeler için `canonical_mapped_count`, `unmapped_count`, `blocked_count` ve coverage yüzdesi Faz 0’da hesaplanamaz. Scaffold sonrasında tüm yeni country/capability yolları varsayılan olarak block edilmiş başlayacaktır.

| Envanter | Doğrulanmış değer | Faz 0 yorumu |
|---|---:|---|
| Aktif üst hizmet | 16 | Canlı katalog source-of-truth |
| Aktif alt hizmet | 62 | Country service matrix henüz yok |
| Aktif alias | 46 | Alias resmi/uyum fallback’i değildir |
| Mevcut capability | 79 | Yeni service capability definitions ile ilişkilendirilecek, kopyalanmayacak |
| Feature-flag sürüm kaydı | 0 | Country-specific default-off bayrakları yeni scaffold ile eklenecek |
| Mevcut country/jurisdiction kaydı | 1 | Türkiye kaydı korunacak |

Uygulama bugün `tr-TR` ve 13-dil i18n altyapısına; para birimi alanlarında `TRY` varsayılanına; bazı kayıtlarda `countryCode` alanına sahiptir. Ancak country deployment’a bağlı locale/timezone/address profile/data plane modeli yoktur. `price_intelligence_assessments` tablosu `countryCode` ve üç harfli `currency` tutsa da tek başına bir country launch gate oluşturmaz.

Environment sözleşmesi `NODE_ENV=production` için zorunlu secret/config kontrolleri uygular; salt-okunur denetim mevcut managed TiDB çalışma ortamına ve development server’a erişmiştir. Production, staging ve development’ın fiziksel/veri/log/connector olarak ayrıldığına ilişkin kanıt veya production change-record yoktur. Bu nedenle durum **ENVIRONMENT_SEPARATION_UNVERIFIED**’dır; hiçbir migration production-applied sayılmaz.

## 5. Mevcut Privacy, Notice, Appeal, Incident ve Audit Modelleri

| Alan | Mevcut model | Global scaffold gap’i |
|---|---|---|
| Privacy | `privacy_rights_requests`, `privacy_legal_holds` | Country legal text/data-residency bağları yok |
| Incident | `safety_incidents`, check-in/contact modelleri | Jurisdiction clock/regulator/template matrisi yok |
| Appeal | `provider_capability_appeals` | Country notice locale, bağımsızlık kanıtı ve policy-decision referansı yok |
| Audit | Job timeline, consent events ve Faz 8-A ledger/event tabloları | Tek bir country artifact/approval/activation audit graph’ı yok |
| Legal documents | Uygulama yüzeylerinde i18n ve privacy metinleri vardır | `legal_documents` / `localized_legal_versions` sürüm-onay ledger’ı yok |

## 6. Preserve List

1. Türkiye Blok 1 üç capability’sinin SOURCE_UNVERIFIED, NO-GO, approval yok ve enforcement fail-closed statüsü.
2. Mevcut kullanıcı, provider, katalog, credential ve financial kayıtları.
3. 0083/0084 provider profile, ledger ve enforcement davranışları.
4. Mevcut `jurisdictions`, `service_capabilities`, provider document, appeal, privacy, incident ve audit tablolarının isimleri ve davranışları.
5. Kullanıcının `todo.md` değişikliği ve tüm mevcut mobil/MoveOS UI düzeni.
6. Mevcut 13-dil i18n düzeni; yeni makine-çevirisi runtime’a veya kullanıcıya gösterilmeyecek.

## 7. Gap List

1. Beş country shell için `country_deployments`, ayrı feature gate’ler, data plane kimliği ve immutable activation run kaydı yoktur.
2. Parent/child jurisdiction, official code, locale, timezone, currency ve address profile taşıyan hiyerarşik model yoktur.
3. Canonical service/subservice/task + risk + required profile dimensions + `blocked_by_default` modeli yoktur.
4. Global `official_sources`, `legal_requirements`, credential type/issuer, verification connector/evidence/event modelleri yoktur.
5. Country-wide source/legal/connector/release/enforcement/translation/data/sanctions durumlarını ayrı tutan policy decision modeli yoktur.
6. Ülke/yargı alanına göre legal-document localisation, incident notice matrix, appeal ve country activation preflight modelleri yoktur.
7. Country dashboard, catalog coverage, source/legal/connector dashboard ve activation preflight owner ekranları yoktur.
8. DE-BE-BERLIN için Handwerksordnung/NAV/AVBWasserV/DVGW/VDE/TAB satırları yoktur; kaynak onayı veya connector kanıtı da yoktur.

## 8. Additive Migration ve Uygulama Planı

| Sıra | Planlanan işlem | Başlangıç güvenlik durumu |
|---|---|---|
| 0085 | Global country deployment, jurisdiction node, capability definition, source/legal/credential/connector/evidence, legal localisation, decision, appeal, incident ve activation-run tabloları | Tüm country gate’leri `false`; state `SCAFFOLD_ONLY`; source `SOURCE_UNVERIFIED`; authoritative `false` |
| 0085 seed | Beş country shell ve root/pilot jurisdiction kayıtları | DE/JP/US/CN `SCAFFOLD_ONLY`; RU `INFRA_ONLY_NO_GO`; hiçbir capability açılmaz |
| Policy | Server-only country activation preflight, explicit allowlist, NO-GO/unknown block | Provider system state yazamaz; machine locale `DRAFT_MACHINE` kalır |
| DE-BE | Berlin source/matrix/locale/connector shell | Requirement ve connectorlar UNVERIFIED/PENDING; tüm capability’ler blocked |
| QA | Migration-forward, authorization, default-off, NO-GO, Türkiye regression testleri | Test atlama veya zayıflatma yok |

## 9. Rollback Planı

Bu görev için rollback destructive `DROP TABLE` değildir. Uygulama geri alma planı aşağıdaki gibi kalacaktır:

1. Owner/server-only kill switch ile ilgili country gate’lerini `false` yap.
2. `country_deployments.state` değerini `SUSPENDED` veya başlangıç kabuğuna geri döndür; activation run’a immutable rollback olayı ekle.
3. Her capability policy decision’ı `BLOCKED` / NO-GO üretir; mevcut Türkiye policy verisine dokunulmaz.
4. Forward migration tabloları korunur; test/staging dışındaki fiziksel schema rollback yalnız onaylı change record ve doğrulanmış yedek/restore planı ile değerlendirilir.
5. Her migration için idempotent/additive forward test ve mantıksal rollback testi yazılır.

## 10. Faz 0 Kararı

**Faz 0 tamamlandı.** Common Global Scaffold, yalnız yukarıdaki preserve/gap/migration/rollback sınırları altında uygulanabilir. Audit herhangi bir local counsel, official source, connector, legal approval veya product release approval üretmemiştir. Germany/Berlin çalışması yalnız **CHECKPOINT A** kapsamına kadar ilerleyebilir; Japan/Tokyo ve sonraki ülke blokları başlatılamaz.
