# CHECKPOINT A — Kalite Kapısı Sonuçları

**Çalıştırma tarihi:** 22 Ağustos 2026  
**Kapsam:** Germany/Berlin default-off scaffold + review-evidence araçları  
**Release yorumu:** Bu sonuçlar CHECKPOINT A test kanıtıdır; production release izni değildir.

| Kapı | Komut | Sonuç | Gerçek çıktı özeti |
|---|---|---|---|
| Targeted policy regression | `pnpm vitest run tests/global-country-scaffold-contract.test.ts tests/country-deployment-policy.test.ts tests/country-launch-gate-contract.test.ts tests/faz8a-capability-profile.test.ts` | PASS | 4 dosya / 20 test |
| Full regression | `pnpm test` | PASS | 125 dosya / 732 test |
| Lint | `pnpm lint` | PASS | `expo lint`, uyarı yok |
| TypeScript constrained | `NODE_OPTIONS=--max-old-space-size=512 pnpm exec tsc --noEmit --skipLibCheck` | BLOCKED | Node heap OOM; peak observed RSS 612,416 KiB; V8 heap 524.2 MB limit |
| TypeScript expanded | `NODE_OPTIONS=--max-old-space-size=1792 pnpm exec tsc --noEmit --skipLibCheck` | PASS | Hata çıktısı yok |
| Backend build | `pnpm build` | PASS | `dist/index.js` üretildi |
| Drizzle integrity | `pnpm drizzle-kit check` | PASS | `Everything's fine` |
| Supply chain | `pnpm supply:sca` | PASS | 4 advisory, 0 blocking release, 2 approved exception |
| Whitespace | `git diff --check` | PASS | Çıktı yok |

## Yorum

512 MB TypeScript sonucu çevresel bir bellek kapasitesi problemidir ve PASS sayılmaz. Bu ölçüm için local Metro/backend geliştirme süreçleri durdurulmuştur; buna rağmen Node, 512 MB heap limiti altında OOM ile kapanmıştır. Aynı tam typecheck 1792 MB heap ile hatasız tamamlanmıştır. Minimum kalıcı CI bellek bütçesi bu kanıtla sertifikalanmamıştır.

Yeni policy testleri, `DRAFT_MACHINE` legal locale’in runtime-selectable olmasını yalnız `SOURCE_VERIFIED` + legal approval + content hash + storage key + runtime flag birlikte doğru olduğunda kabul eder. Mevcut Berlin satırları bu koşulları karşılamaz ve `false` döndürür.

## Test Keşfi Bütünlüğü

Audit ZIP’i altında saklanan test kopyaları uygulamanın test süitinin parçası değildir. `vitest.config.ts`, tam kaynak test kümesini `tests/**/*.{test,spec}.{ts,tsx}` ile açıkça içerir ve `exports/**` dizinini hariç tutar. Bu ayar, 125 kaynak test dosyasının tamamının çalıştırılmasını korur; export artefaktlarının eksik import grafiğiyle regresyonu bozmasını önler.
