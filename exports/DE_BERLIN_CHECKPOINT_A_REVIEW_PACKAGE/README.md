# Move&Fix — CHECKPOINT A Berlin İnceleme Paketi

Bu paket Germany/Berlin CHECKPOINT A için salt-okunur inceleme materyalidir.
Paket hiçbir production aktivasyonu, legal approval, source verification, connector authorization veya product release approval üretmez.

## Güvenlik Durumu

| Alan | Durum |
|---|---|
| Berlin capability policy | 79/79 `BLOCKED` |
| Germany country state | `SCAFFOLD_ONLY` |
| Resmî kaynak | 10/10 `SOURCE_UNVERIFIED` |
| Connector | 4/4 `PENDING`, assurance `NONE` |
| Legal locale | 6/6 `DRAFT_MACHINE`, runtime selectable `false` |
| Türkiye Blok 1 | Korundu, SOURCE_UNVERIFIED / NO-GO |
| Production publish / activation | Yapılmadı |

## Ana Giriş Noktaları

1. `evidence/DE_BERLIN_LIVE_CATALOG_SNAPSHOT.json`: 16 hizmet, 62 alt hizmet, 46 alias ve 79 capability canlı snapshot.
2. `evidence/DE_BERLIN_SERVICE_CREDENTIAL_MATRIX.csv`: 79 satırlık UNKNOWN=BLOCK matrix.
3. `evidence/DE_BERLIN_OFFICIAL_SOURCE_REGISTER.csv`: SOURCE_UNVERIFIED kaynak registry.
4. `evidence/DE_BERLIN_LEGAL_REVIEW_TEMPLATE.csv`: hukukçu doldurması için boş review alanları.
5. `reports/CHECKPOINT_A_GERMANY_BERLIN_REPORT.md`: outcome, NO-GO, rollback, quality gate ve pending listesi.
6. `CHECKPOINT_A_CHANGESET.patch`: `70645d3c` baseline’dan bu çalışma ağacına birleşik diff.
7. `evidence/DE_BERLIN_SCOPE_SEPARATION_GUARDS.md`: Otomatik Meisterbrief, utility-zone, freight/courier, towing/repair, cleaning ve carpentry kapsam eşleştirmelerini engelleyen negatif guard’lar.
8. `evidence/DE_BERLIN_AUTHORIZATION_BOUNDARY_EVIDENCE.md`: Provider state-write engelleri, RLS teknoloji sınırı, Türkiye izolasyonu ve hedefli negatif test kanıtı.

Raw CSV/JSON dosyaları yalnız supporting evidence’tır. Karar ve özet için Markdown raporları esas alınmalıdır. `source/tests/` kopyaları bağımsız çalıştırılabilir proje değildir; audit kanıtıdır. Ana proje Vitest kapsamı yalnız gerçek `tests/**/*.{test,spec}.{ts,tsx}` dosyalarıyla açıkça sınırlandırılmıştır.
