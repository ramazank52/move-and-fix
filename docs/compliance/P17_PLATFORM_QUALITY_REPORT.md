# Move&Fix — P17 Platform Quality Report

**Kanıt zamanı:** 20 Ağustos 2026, 20:44 UTC  
**Kapsam:** P17 FINAL CLOSURE çalışma ağacı; gerçek servis credential’ı veya yayın işlemi içermez.

| Kalite kapısı | Sonuç | Kanıt |
|---|---:|---|
| Frozen dependency install | **PASS** | `pnpm install --frozen-lockfile`; lockfile güncel, çözümleme atlandı. |
| TypeScript | **PASS** | `NODE_OPTIONS=--max-old-space-size=2048 pnpm check`; hata yok. |
| Expo lint | **PASS** | `pnpm lint`; hata/uyarı yok. |
| Backend production build | **PASS** | `pnpm build`; `dist/index.js` üretildi. |
| Web export | **PASS** | `npx expo export --platform web`; 79 statik route üretildi. |
| iOS export | **PASS** | `npx expo export --platform ios`; HBC bundle ve metadata üretildi. |
| Android export | **PASS** | `npx expo export --platform android`; Hermes bundle ve metadata üretildi. |
| Expo Doctor | **PASS** | `npx expo-doctor`; 20/20 kontrol geçti. |
| Tam regresyon | **PASS** | `pnpm test`; 124 dosya / 724 test geçti. Önceki iki HTTP timeout, durdurulmuş yerel API servisi yeniden başlatıldıktan sonra tekrarlanmadı. |
| Migration integrity | **PASS** | 78 SQL migration = 78 Drizzle journal kaydı. |
| SPDX license policy | **PASS** | 1.011 installed package, compound SPDX policy geçti. |
| SBOM | **PASS** | CycloneDX 1.5, 1.011 component üretildi. |
| Deterministic SCA | **PASS** | 4 advisory, 0 blocking release, 2 exact approved toolchain exception. |
| Source secret content scan | **PASS** | Yüksek güvenli secret deseni eşleşmesi: 0. |
| Source secret path scan | **PASS** | `.env.example` dışı yasaklı credential path eşleşmesi: 0. |
| i18n / seed / route validation | **PASS** | 4 dosya / 77 test geçti. |

## Ham Kanıt Dosyaları

- `docs/compliance/evidence/p17_full_regression.log`
- `docs/compliance/evidence/p17_platform_quality.log`
- `docs/compliance/evidence/p17_i18n_seed_route_validation.log`
- `docs/compliance/evidence/p17_pnpm_why_qs.log`
- `docs/compliance/evidence/p17_pnpm_why_image-size.log`
- `docs/compliance/evidence/p17_source_secret_content_scan.log`
- `docs/compliance/evidence/p17_source_secret_path_scan.log`
- `artifacts/sca/pnpm-audit-prod.json`
- `artifacts/sca/sca-report.json`
- `artifacts/sca/sca-report.md`
- `artifacts/sca/p17-pnpm-audit-raw.json`
- `artifacts/sbom.cdx.json`

> Bu sonuçlar **internal engineering doğrulamasıdır**. Gerçek ödeme, iletişim, scanner, production DNS/HTTPS, hukuk onayı, signing/store kabulü veya fiziksel cihaz E2E yerine geçmez.
