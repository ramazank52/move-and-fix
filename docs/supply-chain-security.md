# Güvenli Tedarik Zinciri Politikası

Move&Fix, bağımlılık güvenliğini uygulama kalitesinin bir parçası olarak ele alır. Her doğrulama çalıştırması, tip denetimi, lint, test, sunucu derlemesi, lisans politikası, SBOM üretimi ve üretim bağımlılıkları için yüksek önem seviyesinde paket yöneticisi taramasını içerir.

| Kontrol | Komut | Başarısızlık davranışı |
|---|---|---|
| Lisans politikası | `pnpm supply:licenses` | İzin verilmeyen veya sınıflandırılamayan bir lisans bulunduğunda süreç başarısız olur. |
| Yazılım envanteri | `pnpm supply:sbom` | `artifacts/sbom.cdx.json` içinde CycloneDX 1.5 envanteri oluşturulur. |
| Güvenlik açığı | `pnpm audit --prod --audit-level=high` | Yüksek veya kritik üretim bağımlılığı açığında süreç başarısız olur. |

SBOM dosyası yalnız derleme girdilerinin envanteridir; anahtar, kullanıcı verisi veya yapılandırma değeri içermez. CI, kilit dosyasını değiştirmeden `pnpm install --frozen-lockfile` kullanır ve sonuç SBOM’u bir build artefaktı olarak saklar.
