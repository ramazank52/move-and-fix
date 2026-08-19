# P14 Dependency Audit Gate

**Kapsam:** P14-18 bağımlılık güvenliği ve release gate kaydı  
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

Bu kayıt hiçbir credential, token veya secret içermez.
