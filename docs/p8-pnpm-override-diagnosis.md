# P8 — pnpm Override Teşhis Kaydı

**Tarih:** 2026-08-16  
**Yerel paket yöneticisi:** `pnpm 9.12.0`

## Doğrulanmış Bulgular

1. Resmî pnpm ayar belgesi, dependency-resolution ayarlarının `pnpm-workspace.yaml` içinde tanımlanabileceğini belirtmektedir. Ancak ilgili URL’ler güncel belgede v11/v12 içeriğine yönlenmiştir; bu nedenle bu belgedeki davranış pnpm 9.12.0 için tek başına uyumluluk kanıtı sayılmamıştır.[^workspace]
2. Projede `pnpm-workspace.yaml` içine hem genel hem sürüm-seçicili PostCSS override denendi.
3. Zorunlu lockfile yeniden çözümünden sonra `pnpm why postcss` hâlâ Expo CLI/Metro geçiş zincirinden gelen `postcss@8.4.49` yolunu gösterdi.
4. Üretim bağımlılık audit’i bu geçiş yolunda yüksek önem seviyeli PostCSS advisory’sini göstermeye devam etti. Uygulama kaynak kodunda veya doğrudan runtime bağımlılığında ayrı bir PostCSS kullanımı tespit edilmedi.

## Karar

Bu bulgu **SDK araç zinciri kaynaklı, dış yükseltme/uyumluluk takibi gerektiren risk** olarak korunur. Uygulamanın doğrudan bağımlılıklarını zorla veya uyumsuz sürüme yükseltmek yerine, Expo SDK/Metro tarafından desteklenen bir sürümde düzeltilecek; P8/P9 final raporunda açıkça listelenecektir.

[^workspace]: pnpm, "Settings (pnpm-workspace.yaml)", https://pnpm.io/9.x/pnpm-workspace_yaml (erişim: 2026-08-16). İstek mevcut sitede v11/v12 içerik döndürmüştür; yalnız referans ve yapılandırma yönü olarak kullanılmıştır.
