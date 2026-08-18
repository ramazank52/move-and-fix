# Onaylı Türkiye Gold Master Kaynak Kaydı

## Kaynak Kimliği

| Alan | Değer |
| --- | --- |
| Paket sürümü | `TR-GOLD-2026-08-13-v1.0` |
| Ülke | `TR` — Türkiye |
| Sağlanan paket | `MoveFix_TR_Gold_Master_Approved_Source_Pack.zip` |
| Birincil makine-okunur kaynak | `TR_Gold_Master_Country_Pack_v1.json` |
| İnsan-okunur kaynak | `TR_Gold_Master_Country_Pack_v1.md` |
| Resmî kaynak kaydı | `TR_Official_Source_Registry_v1.json` |

## Bağlayıcı Kullanım İlkeleri

Bu paket, Türkiye kapsamındaki hizmet/capability eşlemeleri için tek onaylı kaynak olarak kullanılacaktır. Kaynakta bulunmayan bir hukuki zorunluluk, belge türü veya yetki kuralı eklenmez. Kaynak kapsamı dışında kalan ya da dinamik yerel/kurumsal kuralı çözülemeyen durumlar `UNKNOWN`, `LEGAL_REVIEW_REQUIRED` veya ilgili açık blok koduyla fail-closed ele alınır.

Paketin bulunması veya seed edilmesi Türkiye country launch gate'ini otomatik olarak etkinleştirmez. Hukuk/uyum incelemesi, verified source durumu, ödeme sağlayıcısı hazır oluşu ve mevcut country launch gate kontrolleri ayrı ön koşullardır.

## Kaynakta Açıkça Belirtilen Kontrol Temaları

Kaynak; doğrulama zincirini **kimlik → belge → belgeyi veren kurum → resmî kayıt → geçerlilik/iptal → hizmet kapsamı → işletme → araç → sürücü/operatör → yerel yetki → sürekli yeniden kontrol** olarak tanımlar. Belge görseli tek başına `VERIFIED` oluşturamaz. İnsan/hukuk incelemesi gerektiren veya yerel/dağıtım/ekipman kapsamı çözülemeyen faaliyetler otomatik olarak yayına açılmaz.

Paketin katalog matrisi; temizlik, sıhhi tesisat, elektrik, boya, klima, ısıtma/doğal gaz, nakliyat, çilingir, çekici, yol yardımı ve kurye/evrak kapsamlarını içerir. Planlanan genişleme kategorileri aktif katalog kabul edilmez. Kaynakta açıkça `DISABLED_PENDING_DANGEROUS_GOODS_FUEL_PACK` olan yolda yakıt ulaştırma faaliyeti kapalı kalır.

## Doğrulama Yükümlülüğü

P13 uygulamasında üç dosyanın birbiriyle tutarlı olduğu denetlenir; kalıcı seed yalnız bu kaynaklardaki kategori, alt hizmet, durum, credential ve resmî kaynak tanımlarını taşır. Her release öncesi yetkin Türkiye hukuk/uyum uzmanı sürüm bazlı onay vermelidir.
