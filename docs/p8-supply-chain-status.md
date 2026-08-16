# P8 Tedarik Zinciri Durumu

**Tarih:** 2026-08-16  
**Kapsam:** İzlenen kaynaklar, üretim bağımlılıkları, lisans politikası ve CycloneDX SBOM.

## Doğrulanmış Kapılar

| Kontrol | Sonuç | Kanıt / Not |
|---|---|---|
| Lisans politikası | PASS | `pnpm supply:licenses`; proje politikası dışı lisans tespit edilmedi. |
| CycloneDX SBOM | PASS | `pnpm supply:sbom`; SBOM kaynak ağacında üretilir ve CI tarafından tekrar üretilebilir. |
| İzlenen kaynak secret taraması | PASS | Gerçek anahtar/sertifika/token eşleşmesi yok; yalnız test verileri, kullanıcı girdi alanları ve fail-closed açıklamalar ayrık kayda alındı. |
| Kaynak mock/fake taraması | PASS WITH REVIEW RECORD | Üretim davranışını taklit eden başarılı teslimat bulunmadı; eşleşmeler test, kullanıcı metni veya fail-closed açıklamadır. |
| Üretim bağımlılık audit’i | EXTERNAL TOOLCHAIN RISK | Expo CLI/Metro geçiş zincirindeki `postcss@8.4.49` ve `image-size@1.2.1` yüksek önem seviyeli advisory üretmektedir. Uygulama kaynak kodunda veya doğrudan runtime bağımlılığında açık bulunmadı. |

## Düzeltme Sınırı

`postcss` için pnpm çalışma alanı override’ı ve zorunlu lockfile yeniden çözümü denenmiştir. `pnpm why postcss` sonucu Expo CLI/Metro aracılık zincirinin savunmasız sürümü çözmeye devam ettiğini göstermiştir. Expo SDK/Metro uyumluluk sözleşmesini zorla kıracak yükseltme uygulanmamıştır.

`image-size` bulgusu da Expo Metro geçiş zincirindedir. Bu nedenle her iki bulgu, **Expo SDK/Metro destekli güncelleme yayımlandığında yeniden değerlendirilmesi gereken external toolchain risk** olarak takip edilir. İmzalı release veya production GO kararı, kurumun kabul edilmiş risk politikasına ve güncel SDK audit sonucuna bağlıdır.

> Bu kayıt, bulguları kapatılmış olarak göstermez. Gerçek provider credential, DNS/HTTPS, imzalı mobil artifact ve cihaz testi gibi ayrı external release gate’leri de geçersiz kılmaz.

## Tekrarlanabilir Komutlar

```sh
pnpm supply:verify
pnpm audit --prod --audit-level=high
pnpm why postcss
pnpm why image-size
```
