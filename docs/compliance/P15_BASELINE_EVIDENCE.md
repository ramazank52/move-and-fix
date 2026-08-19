# P15 Baseline Evidence

**Tarih:** 19 Ağustos 2026  
**P14 başlangıç commit’i:** `0003661cac92060caa77c43c4eed88c0879b760c`  
**Branch:** `main`  
**Recovery anchor:** `0003661c`

## Amaç ve Kanıt İlkesi

Bu belge, P15 başlamadan önceki gerçek çalışma ağacı ve kalite durumunu sabitler. Testler, Metro watch sürecinin backend yaşam döngüsünü etkilememesi için paketlenmiş, bağımsız backend (`NODE_ENV=test node dist/index.js`) ayaktayken yeniden koşulmuştur. İlk birleşik koşumda HTTP E2E dosyaları `ECONNREFUSED` nedeniyle başarısız oldu; bu sonuç gizlenmemiş, altyapı başlatıldıktan sonraki bağımsız sonuç aşağıda ayrı kaydedilmiştir.

## Başlangıç Kontrolleri

| Kontrol | Komut | Sonuç |
|---|---|---:|
| TypeScript | `pnpm exec tsc --noEmit --skipLibCheck` | **PASS** |
| Lint | `pnpm lint` | **PASS** |
| Backend build | `pnpm build` | **PASS** |
| Tam regresyon (bağımsız backend) | `pnpm test` | **PASS — 102 dosya / 616 test** |
| İlk tam regresyon (backend dinlemeden) | `pnpm test` | **FAIL — yalnız HTTP E2E’lerde `ECONNREFUSED 127.0.0.1:3000`** |
| iOS export | `npx expo export --platform ios` | **P14 kanıtında PASS; P15 finalde yeniden koşulacak** |
| Android export | `npx expo export --platform android` | **P14 kanıtında PASS; P15 finalde yeniden koşulacak** |
| Web export | `npx expo export --platform web` | **P14 kanıtında PASS; P15 finalde yeniden koşulacak** |
| `git diff --check` | `git diff --check` | **P14 finalde PASS; P15 finalde yeniden koşulacak** |
| High dependency audit | `pnpm audit --audit-level=high` | **OPEN — Expo SDK 54 / Metro transitif advisory; P15 Faz 2’ye devredildi** |

## Başlangıçta Açık veya Dışarıda Bırakılan Konular

| Konu | Başlangıç durumu | P15 yaklaşımı |
|---|---|---|
| Malware scanner production credential/callback secret | **NOT_CONFIGURED** | Faz 1’de state machine, adapter, callback doğrulaması ve test yüzeyi; secret yokken fail-closed davranış. |
| Expo/Metro dependency advisory | **OPEN** | Faz 2’de CVE/path/runtime reachability/uyumluluk incelemesi ve `CLOSED` veya `VERIFIED EXTERNAL GATE` kararı. |
| Hukuki metinlerin avukat onayı | **BLOCKED — EXTERNAL** | Faz 3’te versioned legal-content altyapısı, acceptance/consent kaydı ve screen routing hazırlanır; onay uydurulmaz. |
| Gerçek ödeme/iletişim/push credential’ları | **BLOCKED — EXTERNAL** | Adapter/config schema ve fail-closed hata sözleşmeleri korunur; canlı teslimat yapılmaz. |
| Fiziksel cihaz kabulü ve production DNS/HTTPS | **BLOCKED — EXTERNAL** | P15 final release gate olarak kalır. |

## Kaynak Günlükler

- İlk kalite günlüğü: `/tmp/p15-baseline.log`
- Bağımsız backend tam regresyon günlüğü: `/tmp/p15-baseline-full-regression.log`
- Bağımsız backend sağlık çıktısı: `/tmp/p15-health.out`

Bu baseline hiçbir external release gate’i kapatmaz ve canlı yayın izni vermez.
