# P14 Dependency Audit Gate

**Kapsam:** P14-18 bağımlılık güvenliği ve P15 Faz 2 doğrulanmış release gate kaydı
**Tarih:** 19 Ağustos 2026  
**Durum:** **PARTIAL — EXTERNAL RELEASE GATE OPEN**

## Uygulanan politika

`pnpm-workspace.yaml` tek yetkili bağımlılık çözüm politikası olarak tutulur. Doğrudan ve transitif çözümlemelerde güvenli sürümü tercih etmek amacıyla aşağıdaki PostCSS override tanımlanmıştır:

```yaml
overrides:
  postcss: 8.5.26
  '@expo/metro-config>postcss': 8.5.26
  postcss@8.4.49: 8.5.26
```

`package.json` içinde tekrarlanabilir denetim komutu vardır:

```json
"audit:high": "pnpm audit --audit-level=high"
```

## Gerçek doğrulama

| Kontrol | Komut | Sonuç | Kanıt |
|---|---|---|---|
| Workspace policy | `pnpm install --no-frozen-lockfile` | PASS | `pnpm-workspace.yaml` versiyon kontrollüdür. |
| Uygulama düzeyi PostCSS | `pnpm why postcss --depth 6` | PASS | Uygulama/Vite/Tailwind çözüm yolları `postcss 8.5.26` kullanır. |
| Expo/Metro transitif PostCSS | `pnpm why postcss --depth 6` | BLOCKED | `expo 54.0.36 → @expo/metro-config 54.0.17 → postcss 8.4.49` zinciri, Expo paketi kendi dar semver aralığını yayımladığı için sürmektedir. |
| High audit | `pnpm audit --audit-level=high` | BLOCKED | `postcss 8.4.49` için high severity advisory devam eder. |

## Karar ve fail-closed yaklaşım

Bu bulgu **uygulama runtime bağımlılığı değil**, Expo/Metro geliştirme ve bundle araç zinciri transitif bağımlılığıdır. Mevcut Expo SDK 54 uyumluluk sözleşmesini keyfi bir araç zinciri yükseltmesiyle bozmak güvenli değildir. Workspace override politikası tanımlı kalır; ancak pnpm mevcut Expo/Metro paketinin dar `~8.4.32` bildirimini audit çözümünde güvenli PostCSS sürümüne taşıyamamaktadır.

> Release kararı **fail-closed** kalır. Audit high bulgusu, Expo tarafından PostCSS güncellemesi içeren uyumlu bir SDK/Metro sürümü yayımlanana veya kontrollü araç zinciri yükseltmesi bağımsız regresyonlarla doğrulanana kadar **EXTERNAL_RELEASE_GATE** olarak değerlendirilmelidir.

## Takip koşulları

| Önkoşul | Kapanış kanıtı |
|---|---|
| Expo/Metro uyumlu güncellemesi | Güncellenmiş lockfile ve `pnpm why postcss` çıktısında 8.4.49’un olmaması |
| Audit kapanışı | `pnpm audit --audit-level=high` sıfır high bulguyla başarıyla tamamlanmalı |
| Uyum regresyonu | TypeScript, lint, test, backend build ve iOS/Android/web export yeniden PASS olmalı |

## P15 Faz 2 yeniden doğrulaması — 20 Ağustos 2026

SDK 54 için yayımlanmış en güncel resmi patch olan `expo 54.0.37` kuruldu. Bu güncelleme `@expo/cli 54.0.27` sürümünü getirirken, Expo’nun kendi resmi dependency sözleşmesi `@expo/metro-config 54.0.17` ve `@expo/metro 54.2.0` üzerinde kalır. Bu paketler sırasıyla `postcss 8.4.49` ve `metro 0.83.3 → image-size 1.2.1` çözümlerini sabitler.

| Advisory | Mevcut çözüm / dependency path | Düzeltme durumu | Runtime ve karar |
|---|---|---|---|
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | `postcss 8.4.49`; `expo → @expo/metro-config 54.0.17` | `>=8.5.12` mevcut; Expo SDK 54 resmi zinciri düzeltmeyi tüketmiyor | Sadece build/bundle aracı, uygulama veya Node backend runtime’ına paketlenmez; **VERIFIED EXTERNAL GATE** |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | Aynı `postcss 8.4.49` transitif çözümü | `>=8.5.18` mevcut; Expo SDK 54 resmi zinciri düzeltmeyi tüketmiyor | Sadece build/bundle aracı; **VERIFIED EXTERNAL GATE** |
| [GHSA-w3rx-r6r6-pgpr / CVE-2025-71330](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | `image-size 1.2.1`; `expo/react-native → metro 0.83.3` | Yamalı sürüm yayımlanmamış | Sadece Metro araç zincirinin asset çözümleme yüzeyi; **VERIFIED EXTERNAL GATE** |
| [GHSA-5p2g-fcmc-qvqq / CVE-2025-71329](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | Aynı `image-size 1.2.1` transitif çözümü | Yamalı sürüm yayımlanmamış | Sadece Metro araç zincirinin asset çözümleme yüzeyi; **VERIFIED EXTERNAL GATE** |

`pnpm install --force` ile workspace override’ı tekrar çözümlendi; Expo’nun `@expo/metro-config` paketindeki resolved `postcss 8.4.49` değişmedi. `metro 0.83.8` mevcut olsa da `@expo/metro 54.2.0` Metro 0.83.3 bileşen grubunu tam sürümle sabitler. Bu nedenle doğrudan Metro/image-size override’ı Expo SDK uyumluluğu bağımsız doğrulanmadan uygulanmamıştır.

| P15 doğrulaması | Gerçek sonuç |
|---|---|
| `pnpm audit --audit-level=high` | **4 high advisory açık**; yukarıdaki iki PostCSS ve iki image-size kaydı |
| `pnpm why postcss --depth 6` | Uygulama/Vite/Tailwind `8.5.26`; yalnız Expo/Metro `8.4.49` |
| `pnpm why image-size --depth 6` | Yalnız Expo/React Native Metro zinciri `1.2.1` |
| `pnpm lint && pnpm build && pnpm test` | **PASS — 103 test dosyası / 632 test** |

> **P15 Faz 2 durumu: B — VERIFIED EXTERNAL GATE.** Uygulamanın doğrudan bağımlılığı güncel SDK 54 patch’e yükseltildi ve regresyonu geçti. Kalan high advisory’ler Expo/Metro araç zincirinin resmi, transitif ve uyumlu bir güncellemesi olmadan güvenle override edilemez. Bu kayıt release kararını fail-closed tutar; audit PASS olarak gösterilmez.

Bu kayıt hiçbir credential, token veya secret içermez.
