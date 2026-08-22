# CHECKPOINT A — Migration ve Managed DB Durumu

**Kapsam:** Bu belge yalnız salt-okunur denetim sonuçlarını kaydeder. Production database veya production change-record için kanıt değildir.

| Kontrol | Gözlem | Sonuç |
|---|---|---|
| 0085 migration | `0085_global_country_scaffold.sql` additive country/global-policy tablolarını ekler | Managed test/staging DB’de tablo ve default-off seed sonucu gözlendi |
| 0086 migration | `0086_global_country_capability_binding_berlin_scaffold.sql` canonical capability bağını ve Berlin discovery shells’ini ekler | Managed test/staging DB’de 79 `BLOCKED` policy, 10 source, 4 connector ve 6 locale shell gözlendi |
| Country shell | DE, JP, US, CN, RU | 5 kayıt; DE/JP/US/CN `SCAFFOLD_ONLY`, RU `INFRA_ONLY_NO_GO` |
| Berlin node | `DE-BE-BERLIN` | 1 kayıt; `SCAFFOLD_ONLY`, all feature gate `false` |
| Canonical capability binding | `service_capability_definitions` | 79 capability bound; 79 Berlin decision `BLOCKED` |
| Türkiye Blok 1 | `transport.freight`, `moving.household`, `towing.roadside` | `SOURCE_UNVERIFIED` mutasyonu 0; NO-GO korunmuş |
| Drizzle metadata | `__drizzle_migrations` | Eski metadata kaydı gözlendi; 0085/0086 için ayrı applied-record kanıtı yok |
| Environment separation | Managed DB vs production | **ENVIRONMENT_SEPARATION_UNVERIFIED** |

## Güvenli Yorum

0085/0086 SQL’i destructive değildir ve önceki provider/capability/profile verisini silmez. Managed ortamda şema/seed etkisi gözlense bile, Drizzle metadata eksikliği ve production change record yokluğu nedeniyle bu çalışma **production-applied** diye beyan edilmez. Production replay yalnız ayrı change request, onaylı backup/rollback planı ve runtime evidence ile değerlendirilebilir.

Logical rollback destructive schema geri alma değildir: ilgili country deployment `SUSPENDED`/`SCAFFOLD_ONLY` kalır, tüm gate’ler `false` tutulur ve policy kararları `BLOCKED` kalır. Bu akış Türkiye Blok 1’e dokunmaz.
