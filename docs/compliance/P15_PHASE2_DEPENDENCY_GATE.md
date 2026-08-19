# P15 Faz 2 — Expo/Metro Dependency Security Gate

**Baseline:** P15 Faz 1 sonrası çalışma alanı  
**Tarih:** 20 Ağustos 2026  
**Durum:** **B — VERIFIED EXTERNAL GATE**

## Uygulanan düzeltme sırası

1. Resmi Expo SDK 54 uyumlu patch incelendi: `54.0.37` en güncel sürüm olarak doğrulandı.
2. `expo` paketi `~54.0.37` sürümüne yükseltildi; `@expo/cli` `54.0.27` oldu.
3. Expo’nun resmi SDK 54 dependency sözleşmesi incelendi: `@expo/metro-config 54.0.17` ve `@expo/metro 54.2.0`, sırasıyla `postcss 8.4.49` ve Metro `0.83.3` bileşenlerini tüketir.
4. Workspace PostCSS override’ı korunarak zorla yeniden çözümlendi; resolved Expo iç ağacı değişmedi.
5. Keyfi Metro veya `image-size` override’ı uygulanmadı; çünkü Expo’nun Metro paket grubu tam sürüm sözleşmesiyle uyumluluk sınırı oluşturur.

## Advisory envanteri

| Package | Advisory | Severity | Düzeltme | Dependency path | Production bundle etkisi |
|---|---|---|---|---|---|
| postcss 8.4.49 | GHSA-6g55-p6wh-862q | High | `>=8.5.12` | `expo 54.0.37 → @expo/metro-config 54.0.17` | Metro build/bundle aracı; mobil/Node runtime’a dahil değildir |
| postcss 8.4.49 | GHSA-r28c-9q8g-f849 | High | `>=8.5.18` | Aynı Expo/Metro zinciri | Metro build/bundle aracı; mobil/Node runtime’a dahil değildir |
| image-size 1.2.1 | GHSA-w3rx-r6r6-pgpr / CVE-2025-71330 | High | Yamalı sürüm yok | `expo/react-native → metro 0.83.3` | Metro asset parser aracı; mobil/Node runtime’a dahil değildir |
| image-size 1.2.1 | GHSA-5p2g-fcmc-qvqq / CVE-2025-71329 | High | Yamalı sürüm yok | Aynı Metro zinciri | Metro asset parser aracı; mobil/Node runtime’a dahil değildir |

image-size advisory’leri, özel hazırlanmış ICNS ile JXL/HEIF inputlarının Node event-loop’u durdurabilmesine ilişkindir. Bu repository’nin uygulama backend’i upload doğrulamasını kendi byte/MIME politikasıyla yapar; buna rağmen build altyapısında güvenilmeyen asset inputları işleme riski gerçek kabul edilmiştir. Bu nedenle gate kapatılmamış ve audit sonucu PASS sayılmamıştır.

## Doğrulama kanıtı

| Komut | Gerçek sonuç |
|---|---|
| `pnpm view expo@54 version --json` | `54.0.37` SDK 54 içindeki en güncel yayın olarak doğrulandı |
| `pnpm view expo@54.0.37 dependencies --json` | `@expo/metro-config 54.0.17` ve `@expo/metro ~54.2.0` resmi sözleşmesi doğrulandı |
| `pnpm audit --audit-level=high` | **4 high advisory**; durum fail-closed açık gate |
| `pnpm why postcss --depth 6` | Uygulama araçları `8.5.26`; Expo zinciri `8.4.49` |
| `pnpm why image-size --depth 6` | Yalnız Metro zincirinde `1.2.1` |
| `pnpm lint && pnpm build && pnpm test` | PASS; **103 test dosyası / 632 test** |

## Kapanış koşulu

Bu gate ancak aşağıdaki kanıtların tamamıyla CLOSED olabilir:

1. Expo’nun uyumlu SDK/Metro sürümü `postcss >=8.5.18` tüketmelidir.
2. image-size için yayımlanmış bir düzeltme veya Expo tarafından desteklenen güvenli kaldırma yolu bulunmalıdır.
3. Güncellenmiş lockfile’da etkilenen çözümler görünmemelidir.
4. `pnpm audit --audit-level=high`, lint, TypeScript, test, backend build ve iOS/Android/web export yeniden başarılı olmalıdır.

Bu belge herhangi bir secret, token veya credential içermez.
