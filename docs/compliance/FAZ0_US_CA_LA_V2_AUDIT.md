# Faz 0 — US-CA-LOS_ANGELES v2 Salt-Okunur Denetimi

**Tarih:** 23 Ağustos 2026  
**Başlangıç checkpoint’i:** `1af167774ea5d62969d1d19ae6e0d91109f17d3c` (`1af16777`)  
**Branch:** `main`  
**Kapsam:** Paket bütünlüğü, v2 araştırma girdileri ve mevcut Move&Fix durumunun salt-okunur envanteri. Bu denetim production activation, hukuk/connector onayı, provider transition veya kullanıcı verisi değişikliği yapmaz.

> Paket içeriği yalnız **AI_RESEARCHED_UNVERIFIED** araştırma ve default-off tasarım girdisidir. Bu denetim, hiçbir kaynak satırını `SOURCE_VERIFIED`, hiçbir requirement’ı `LEGAL_APPROVED`, hiçbir connector’ı yetkili veya hiçbir capability’yi açılmış saymaz.[1] [2]

## 1. Teslim Paketi Bütünlüğü ve İncelenen İçerik

`MF5_v2_HASH.txt` dosyasındaki beklenen SHA-256 ile `MF5_v2.zip` dosyasının hesaplanan SHA-256 değeri birebir eşleşmiştir: `81a7860dee2597471372f7acd4e5298568233eaff45bca48fa5048f6c2f252ed`. ZIP testinde hata yoktur. Arşiv, bir PDF, eşdeğer Markdown raporu, 310 satırlık Excel matrisi, JSON research rule-pack seed’i ve bağlayıcı v2 komutunu içerir; hiçbir içerik çalıştırılmamıştır.

| Arşiv üyesi | Denetim yöntemi | Sonuç | Yetki sınırı |
|---|---|---|---|
| `MoveFix_Manus_5_Ulke_Belge_Dogrulama_Komutu_v2.txt` | Tam metin okuma | İncelendi | Kullanıcı tarafından bağlayıcı olarak sunuldu |
| Ana rapor PDF | Arşiv testi, 55 sayfa görünüm ve tam metin çıkarımı | İncelendi | Araştırma girdisi; hukuk görüşü değildir |
| Ana rapor Markdown | 1.607 satır, country/bundle/source bölümleri | İncelendi | PDF ile tutarlı research input |
| Excel matrisi | 9 worksheet, 310 coverage satırı ve 24 kolon | İncelendi | Default-off research matrix |
| JSON seed | Top-level/array/coverage/audit yapısal denetimi | İncelendi | Production source-of-truth değildir |

Excel ve JSON denetimleri, 5 pilot jurisdiction, 16 aile, 62 alt hizmet, 310 benzersiz coverage row, 100 requirement bundle ve 95 kaynak kaydı verdiğini göstermektedir. JSON’un kendi audit alanları, duplicate row olmadığını; eksik bundle referansı olmadığını; `authoritative=true` satırı olmadığını; 95 kaynağın tamamının unverified olduğunu ve 62 Rusya satırının `INFRA_ONLY_NO_GO` kaldığını bildirir. Bu değerler external counsel veya resmi kurum kanıtı değildir; yalnız paket içi tutarlılık bulgusudur.[2] [3]

## 2. Mevcut Uygulama, Berlin Freeze ve Production Durumu

Canlı managed DB envanterinde tüm country shell flag’leri kapalıdır. US country kaydı `SCAFFOLD_ONLY`; `countryShellEnabled`, `jurisdictionEnabled`, `providerOnboardingEnabled`, `bookingEnabled`, `paymentsEnabled` ve `productionStateReachable` alanları `0`dır. US için yalnız ülke root node’u vardır; `US-CA-LOS_ANGELES` city node’u henüz yoktur. Berlin city node’u `DE-BE-BERLIN` olarak mevcut olsa da `SCAFFOLD_ONLY` durumundadır.

| Alan | DB kanıtı | Faz 0 sonucu |
|---|---:|---|
| Country shell | CN, DE, JP, RU, US | Hepsi feature-gate kapalı |
| Russia state | `INFRA_ONLY_NO_GO` | Açılma yolu yok |
| US city node | 0 | LA scaffold henüz oluşturulmadı |
| US source/requirement/connector/document/policy | 0 / 0 / 0 / 0 / 0 | US country shell dışında v2 veri kaydı yok |
| Berlin policy | 79 `BLOCKED` | Freeze korunur |
| Berlin source/legal/connector/release | `UNVERIFIED` / `PENDING` / `PENDING` / `PENDING` | Berlin onaylanmış kabul edilmez |
| Türkiye Blok 1 | SOURCE_UNVERIFIED / NO-GO sözleşmesi | Değiştirilmedi |
| Publish/activation | 0 | Yapılmadı |

Mevcut country deployment katmanı, `SCAFFOLD_ONLY` ve `INFRA_ONLY_NO_GO` durumlarında marketplace transition’larını fail-closed reddeder. Country activation preflight’i de source, local legal approval, connector, locale, data/payment/privacy, product approval ve coverage booleans’ını arar. Bununla birlikte bu preflight, v2’nin istediği her capability için server-derived requirement bundle, subject binding, source archive ve evidence graph’ını henüz tek başına değerlendirmez.[4]

## 3. Katalog, Capability ve Provider Etkisi

Gerçek katalogta 16 aktif service category, 62 subservice ve 79 live capability bulunur. Mevcut global scaffold, 79 capability için bir canonical capability-definition linki üretmiştir; ayrıca 16 category-level definition `UNMAPPED_SERVICE_BLOCKED` durumundadır. Bu, v2 paketinin 5 × 62 = 310 country–subservice coverage satırını gerçek category/subservice ID’lerine bağlayan bir model değildir. `service_capability_definitions` tablosu subservice ID alanı içermediğinden, 62 satırın her biri için direct catalog binding bu aşamada kanıtlanamaz.

| Katalog/etki metriği | Gerçek değer | Güvenlik yorumu |
|---|---:|---|
| Aktif aile | 16 | v2 matrix ile reconcile edilecek |
| Aktif alt hizmet | 62 | Her biri için exact ID binding gerekir |
| Live capability | 79 | 79/79 global definition linki mevcut |
| Category-level `UNMAPPED_SERVICE_BLOCKED` | 16 | Ülke kuralına tek başına eligibility vermez |
| US v2 coverage rows | 62 research satırı | Uygulama DB’sine henüz yazılmadı |
| Toplam provider | 2 | Kişisel veri alınmadan toplulaştırıldı |
| Müsait provider | 2 | US transition tetiklemez |
| Provider `isVerified` | 0 | Yeni country’de verified gösterim yok |

Mevcut provider transition guard, authoritative capability ve jurisdiction context eksik olduğunda gerekli state’lerde fail-closed davranır; ancak US v2 coverage kayıtları henüz bu guard’a bağlı değildir. V2 talimatında istenen client-country yerine server-side service-address jurisdiction çözümü mevcut country policy tarafından genel olarak öngörülmüş olsa da US-CA-LA address/authority-zone resolver ve per-row evidence bridge’i yoktur.[5] [6]

## 4. Preserve List

Türkiye Blok 1’in profile, approval ledger ve enforcement durumu; mevcut Berlin `SCAFFOLD_ONLY` freeze’i; kullanıcı/provider/katalog verileri; mevcut 0083–0086 migrationları; 13-dil runtime; financial ve onboarding davranışları korunacaktır. Mevcut public UI, API contract, canonical catalog kaynakları ve database kayıtları destructive şekilde değiştirilmeyecektir.

## 5. Gap List

V2 US block’a başlamadan önce uygulama katmanında kapatılması gereken boşluklar aşağıdadır.

| Gap | Mevcut kanıt | Additive çözüm sınırı |
|---|---|---|
| US-CA-LOS_ANGELES node | Mevcut değil | US root altında default-off city node |
| 62 canonical subservice coverage binding | Mevcut definition’da subservice ID yok | Live category/subservice ID’li country coverage bridge |
| 310 row model | Yalnız paket Excel/JSON’unda | Country × live subservice unique coverage kayıtları |
| Requirement bundle M:N | Mevcut değil | Requirement–coverage–bundle join modeli |
| Subject binding | Mevcut değil | PERSON/BUSINESS/QUALIFIED_MANAGER/DRIVER/VEHICLE/SITE/OPERATOR/PROJECT bağları |
| Source archive/hash | US kaydı yok; research URL tek başına yeterli değil | Research retrieval hash + immutable archive reference; status unverified |
| Source–requirement exact link | Kısmi `officialSourceId`, per-row bağ yok | Requirement-source/link+section/effective/exception modeli |
| Connector registry | US için 0 kayıt | Her route `PENDING`/`NOT_CONFIGURED`; scraping yasak |
| Rule-pack version | Country-level v2 version kaydı yok | Sürüm/hash ve lifecycle modeli |
| DB FK | 0085 global scaffold tablolarında `0` foreign key | TiDB uyumlu additive referential-integrity yaklaşımı |
| Immutable country ledger | Uygulama-layer ledger mevcut ama DB trigger yok | TiDB trigger’sız append-only repository/role guard ve test |
| Per-capability server-derived preflight | Country preflight scalar booleans kullanır | Requirement/evidence graph üzerinden capability policy evaluator |
| Active provider transition | US’de country-specific impact modeli yok | Önce toplulaştırılmış impact; owner-approved notice/window olmadan bloke etme yok |

## 6. Additive Migration Planı

Son migration `0086` olduğundan, sonraki çalışma `0087+` ile additive yürütülmelidir. İlk migration, live catalog subservice identity’yi country coverage’a bağlayan `country_service_coverage`, versioned research rule-pack, requirement bundle, source-to-requirement reference, subject binding ve capability evidence-decision bridge tablolarını eklemelidir. Bu katman, source/approval/connector alanlarında başlangıçta yalnız `AI_RESEARCHED_UNVERIFIED`, `PENDING`, `NOT_CONFIGURED` ve `BLOCKED` durumlarını kabul edecektir.

İkinci migration, yalnız US root’a bağlı `US-CA-CALIFORNIA` ve `US-CA-LOS_ANGELES` jurisdiction nodes’u; 62 default-off coverage row’u; v2 research seed’inden 23 US bundle, 28 US source ve ilgili source reference kayıtlarını eklemelidir. Her seed satırı, live subservice ID bulunamadığında `UNMAPPED_SERVICE_BLOCKED` kalacak; source ve counsel statüsü bu migration ile yükseltilmeyecektir. Connector kayıtları, sadece registry/issuer/authority adı ve `forbiddenScraping=true` ile `PENDING` oluşturulabilir; erişim, API key veya official authorization uydurulmayacaktır.

TiDB’nin resmi dokümantasyonu, FK denetimlerinin v6.6.0’dan beri desteklendiğini; `CHECK` constraint’lerin ise `tidb_enable_check_constraint=ON` gerektirdiğini belirtir.[7] [8] Managed preflight sonucu `8.0.11-TiDB-v8.5.3-serverless`, `foreign_key_checks=1` ve `tidb_enable_check_constraint=0` olarak ölçüldü. Bu nedenle yeni US-only tablolarda named FK ve unique constraints kullanılabilir; fakat global/server-level ayar değiştirilmeden enforced CHECK constraint iddiası yapılamaz. US policy repository, schema-aware validator ve testler bu durumda fail-closed kalacak; CHECK enforcement `NOT_CONFIGURED` olarak raporlanacaktır.

## 7. Rollback ve Active Provider Impact

Rollback destructive `DROP TABLE` değildir. US country ve LA nodes’u tüm flag’leri `0` tutar; country state `SCAFFOLD_ONLY` veya `SUSPENDED` ile mantıksal olarak kapatılır; US coverage decisions `BLOCKED` kalır. Forward migration tabloları, migration history ve audit evidence silinmez. Provider etkisi, mevcut iki provider için yalnız toplulaştırılmış olarak ölçülmüştür. US country/capability halen kapalı olduğundan yeni kuralın sonucunda ani bloklama veya notification gönderimi yapılmamıştır. Gelecekte activation öncesinde etkilenen aktif provider sayısı yeniden sorgulanacak ve owner-approved transition window olmadan herhangi bir capability değişikliği uygulanmayacaktır.

## 8. Faz 0 Kararı

**Faz 0 tamamlandı.** ZIP integrity kontrolü `HASH_MATCH` ve archive test PASS’tir. V2 paketi, US/California/Los Angeles için yalnız default-off, AI-researched-unverified seed olarak kullanılabilir. Berlin onaylanmış kabul edilmez ve freeze kalır. US country shell dışında US source, connector, requirement, locale, rule-pack veya capability decision kaydı olmadığından; bir sonraki aşama yalnız 0087+ additive scaffold, 62 canonical coverage binding ve `BLOCKED` policy seed’i olmalıdır. Rusya, Almanya, Çin ve Japonya blokları başlatılamaz.

## References

[1]: file:///home/ubuntu/mf5v2_audit/MoveFix_Manus_5_Ulke_Belge_Dogrulama_Komutu_v2.txt "Move&Fix binding v2 command"
[2]: file:///home/ubuntu/mf5v2_audit/MoveFix_5_Ulke_Belge_Dogrulama_Ana_Raporu_v2.md "Five-country research report v2"
[3]: file:///home/ubuntu/mf5v2_audit/MoveFix_5_Ulke_Hizmet_Belge_Matrisi_v2.xlsx "Five-country service/credential matrix v2"
[4]: file:///home/ubuntu/move-and-fix/server/compliance/CountryDeploymentPolicy.ts "Country deployment policy"
[5]: file:///home/ubuntu/move-and-fix/server/compliance/CapabilityTransitionGuard.ts "Capability transition guard"
[6]: file:///home/ubuntu/move-and-fix/server/compliance/ServiceCatalogResolver.ts "Canonical service catalog resolver"
[7]: https://docs.pingcap.com/tidb/stable/foreign-key/ "TiDB FOREIGN KEY Constraints"
[8]: https://docs.pingcap.com/tidb/stable/constraints/ "TiDB Constraints"
