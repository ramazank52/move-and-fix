# P8 — pnpm Bağımlılık Override Kaynak Notu

## Karar

Expo Metro zincirinden gelen transitif `postcss` sürümü için override, `package.json` içindeki artık okunmayan `pnpm` alanında değil, proje kökündeki `pnpm-workspace.yaml` dosyasında tanımlanır.

## Doğrulanmış Kaynak

- pnpm resmi ayarlar belgesi: <https://pnpm.io/settings>
- Erişim tarihi: 16 Ağustos 2026
- Belge, proje ayarlarının `pnpm-workspace.yaml` üzerinden alındığını ve `overrides` ayarını Dependency Resolution altında tanımlar.
- Aynı belge, `packages` alanı atlanırsa kök paketin yine çalışma alanına dahil edildiğini belirtir. Bu projede yapılandırma açık ve denetlenebilir olması için kök paket `'.'` olarak listelenmiştir.

## Sınır

Bu kayıt yalnız paket yöneticisi yapılandırmasının yerini açıklar. Expo SDK 54 araç zincirinin transitif bağımlılık uyumluluğu, gerçek çözüm ağacı ve audit sonucu ile ayrıca doğrulanmalıdır; yayınlanmış çalışma zamanı paketine ilişkin sahte bir başarı iddiası oluşturmaz.
