# Faz 3 — Ödeme Yaşam Döngüsü ve İş Anlaşmaları Durumu

## A. Doğrulanmış ve tamamlanan kapsam

Teklif kabulü artık tek bir veritabanı işlemi içinde değişmez bir `jobAgreements` kaydı oluşturur. Anlaşma; kabul edilen ücret, hizmet kapsamı, ödeme koşulları, taraflar, kabul anındaki hizmet medyası metadatası, profesyonel doğrulama metadatası, uygulanan settlement policy sürümü, komisyon oranı ve completion-review penceresini saklar. Ödeme intent’i ve hold kontrolü anlaşma snapshot’ına bağlıdır; sonradan değiştirilen politika geçmiş işin tutarını değiştiremez.

Settlement policy kayıtları ülke, hizmet, ödeme sağlayıcısı ve sözleşme türü önceliğinde zaman geçerli olarak seçilir. Yeni policy sürümleri yalnız ileri tarihli kabul işlemlerine uygulanır. MoveOS’ta bu kayıtların okunması ve geleceğe dönük sürüm oluşturulması MFA grant ile korunur.

Müşteri ve profesyonel için nesne-sahiplik denetimli change order ve iptal prosedürleri gerçek tRPC yüzeyine eklendi. İptal dosyalarında güvenli kanıt kimlikleri saklanır; MoveOS yalnız MFA ile iptal incelemesi yapar ve müşteri-profesyonel change order geçmişini salt-okunur denetim görünümünde gösterir. İnceleme; no-payment, tam iade, kısmi iade ve profesyonel ödeme sonuçlarını kayıt altına alır. Tam iade, doğrulanmış gateway olayından sonra mevcut idempotent webhook/defter yoluyla kapanır.

| Doğrulama | Sonuç |
|---|---:|
| TypeScript | PASS |
| Lint | PASS |
| Sunucu derlemesi | PASS |
| Tam regresyon | 46 dosya / 341 test PASS |
| MoveOS oturumsuz REST denetimi | 401, fail-closed PASS |

## B. Sınırlı ancak güvenli davranış

Kısmi settlement için `refundAmount`, `providerGrossAmount`, `commissionAmount` ve `providerPayoutAmount` bileşenleri immutable inceleme planında tutulur. Hesaplama, major-unit TRY ve snapshot komisyon oranı üzerinden saf politika fonksiyonunda yapılır. Pozitif, tam TRY iade tutarı ve MFA koruması router düzeyinde doğrulanır. Bu plan herhangi bir para hareketi başlatmaz.

## C. Açık kapatma koşulu

Kısmi iade + profesyonel alacağı için sağlayıcının **doğrulanmış kısmi refund callback** biçimi, olay kimliği ve iade tutarı ile mevcut webhook normalleştiricisine henüz eklenmemiştir. Bu nedenle kısmi settlement planı para hareketi veya defter kaydı üretmez; sistem fail-closed kalır. Tam iade ise doğrulanmış callback ile mevcuttur.

Bu açığın güvenli biçimde kapanması için Stripe ve iyzico sandbox kimlik bilgileri ile her sağlayıcının imzalı kısmi iade callback örnekleri gerekir. Entegrasyon; callback tutarını kaydedilmiş `refundAmount` ile karşılaştırmalı, tek idempotency anahtarıyla karma defter kaydı oluşturmalı, ardından anlaşmayı ve iş talebini atomik olarak çözmelidir. Sağlayıcı kimlik bilgileri ya da imzalı sandbox callback’i olmadan bu akış gerçek başarılı kabul edilmemelidir.
