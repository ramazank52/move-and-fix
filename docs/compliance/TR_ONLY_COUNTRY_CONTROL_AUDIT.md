# Türkiye-Only Production ve Owner Country Control — Faz 0 Denetimi

**Tarih:** 24 Ağustos 2026  
**Baseline:** `5803314c` — US/California/Los Angeles read-only audit checkpoint  
**Kapsam:** Salt-okunur başlangıç envanteri. Bu denetim hiçbir marketi açmaz, yayınlamaz veya Türkiye Blok 1 / Berlin / US scaffold durumunu değiştirmez.

> **Faz 0 kararı:** Türkiye marketi için `desired_state=ACTIVE` talebi bir yayın emri değildir. Yerel hukuk, resmi kaynak, connector, locale, ödeme, güvenlik, cihaz E2E ve açık owner release onayı tamamlanmadan efektif pazar durumu **ACTIVE olamaz**.

## Başlangıç Kanıtı

Mevcut country deployment tablosu yalnız CN, DE, JP, RU ve US shell’lerini içerir. CN/DE/JP/US `SCAFFOLD_ONLY`; RU `INFRA_ONLY_NO_GO` durumundadır. Tüm shell/market feature flag’leri sıfırdır; hiçbir country deployment için active capability veya activation run bulunmamaktadır. Berlin’de 79 capability policy kaydı vardır ve aktif karar sayısı sıfırdır. US coverage ve policy kayıtları default-off durumda kalır. Türkiye country deployment shell’i henüz mevcut değildir; Türkiye’nin legacy launch-gate modeli ise ayrı `jurisdictions` / `jurisdiction_launch_gates` yapısındadır.

| Alan | Doğrulanmış mevcut durum | Türkiye-only gereksinimi açısından sonuç |
|---|---|---|
| Country shell | CN, DE, JP, RU, US | TR shell additive olarak kurulmalı |
| Diğer beş ülke | Tüm market flag’leri `0` | INFRA_ONLY preservation gerekir |
| RU | `INFRA_ONLY_NO_GO` | Asla owner ACTIVE isteğiyle açılmamalı |
| Berlin | 79 policy, 0 active | Freeze; approval sayılmaz |
| US/LA | default-off coverage | Freeze; owner action olmadan açılmaz |
| Türkiye Blok 1 | SOURCE_UNVERIFIED / NO-GO; provider profile aggregate’leri `0` approval | Korumalı NO-GO listesi |
| Production publish | Yapılmadı | Bu görevde de yapılmayacak |

## Korunacak Mevcut Davranışlar

`CountryDeploymentPolicy` market transitions için `PRODUCTION_ACTIVE`, country shell/jurisdiction flag’i ve action-specific flag şartını server-side denetler. `CountryCoverageActivationBlockReasons` da mapping, source, legal, connector, policy decision, assurance, legal approval ve product release alanlarını ayrı fail-closed değerlendirir. `CountryLaunchGateService` Türkiye için 22 release checklist maddesi, onaylı compliance package, verified official source ve operasyonel payment provider gerektirir.

MoveOS `adminMfaProcedure` / `superAdminMfaProcedure` ile MFA grant korumasına sahiptir. MFA challenge ve grant süreli oturum bağlamına bağlıdır. Mevcut owner router country compliance envanteri okuyabilir; ancak desired/effective market state, gerekçe, emergency kill switch, revalidation ve bağımsız append-only country-state event yüzeyi bulunmaz.

## Gap List

| Gap | Etki | Additive fail-closed çözüm |
|---|---|---|
| Desired/effective state ayrımı yok | Owner isteği ile efektif operasyon ayrışmaz | Yeni country market control kaydı, server-derived effective state |
| TR country deployment yok | Türkiye-only allowlist tek modelde yönetilemez | TR `READINESS_BLOCKED` shell; tüm flag `0` |
| Owner country control audit log yok | Gerekçe/MFA/actor/önceki-sonraki state izlenemez | Append-only control event ledger |
| Owner country paneli yok | Pazar durumu ve gate görünürlüğü eksik | MFA korumalı MoveOS country management surface |
| Current transition enum eksik | Payout, badge, notification ve discovery action’ları kapsam dışı kalabilir | Geçiş türlerini genişlet, tümü server-side gate |
| Client country input | `assertCountryMarketplaceTransition` countryCode parametresi alır | Service-address jurisdiction snapshot resolver; input mismatch/unknown block |
| Disable wind-down modeli yok | Yeni işlem ve mevcut job tasfiyesi ayrışmaz | `PAUSED` / `EMERGENCY_DISABLED` ile yeni işlemleri anında blokla; existing workflow read/settlement paths korunur |
| Türkçe release gates | Legacy gate ayrı, country state ile atomic değil | Server-side combined evaluator + activation run/event modeli |
| Store country planı | Runtime/store planı tek allowlistte kanıtlı değil | TR-only distribution declaration ve immutable report; mağaza yayınlama yok |

## Migration ve Rollback Planı

Son uygulanan migration `0088` olduğundan yeni work `0089+` ile additive olacaktır. `country_market_controls` tablosu desired/effective state, owner reason, MFA grant/actor reference, last evaluated blockers, revalidation gereksinimi, emergency metadata ve optimistic version tutacaktır. `country_market_control_events` tablosu önceki/sonraki desired/effective state, actor, reason, MFA grant, gate snapshot hash, correlation ID ve timestamp içeren append-only olay defteri olacaktır.

TR row’u `desired=ACTIVE`, `effective=READINESS_BLOCKED` ve tüm runtime feature flag’leri `0` olarak seed edilir. CN/DE/JP/US `INFRA_ONLY`, RU `INFRA_ONLY_NO_GO` olarak mirror edilir; hiçbir eski country deployment, Berlin/US coverage veya Türkiye Blok 1 kaydı değiştirilmez. Mantıksal rollback yalnız `EMERGENCY_DISABLED` / `PAUSED` effective state ile yapılır; `DROP TABLE`, user/provider silme veya automatic capability release yapılmaz.

## Faz 0 Kararı

**TRC-P0 tamamlandı.** Türkiye-only control kurulabilir; fakat başlangıç effective state `READINESS_BLOCKED` kalacaktır. Türkiye production gates için mevcut kanıtlar FAIL-CLOSED / pending olduğu için OWNER ACTIVE isteği dahi release/activation yaratmayacaktır. Diğer beş ülke mirror edilen INFRA_ONLY durumunda kalacak, RU kesin NO-GO olarak korunacaktır.
