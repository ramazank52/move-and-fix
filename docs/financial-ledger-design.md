# Move&Fix Finansal Defter ve Uzlaştırma Tasarımı

**Tarih:** 15 Ağustos 2026  
**Durum:** Uygulandı; sağlayıcı credential’ları olmadan canlı mutabakat çalıştırılmaz.

## Amaç ve Kapsam

MoveWallet ekranı bakiyenin otoritesi değildir. Finansal gerçeklik, `financial_accounts`, `financial_ledger_entries` ve `financial_ledger_lines` kayıtlarından oluşan append-only çift taraflı defterdir. Her finansal olay tek bir idempotency anahtarı taşır ve en az iki satırın borç/alacak toplamı TRY major-unit cinsinden sıfır olmak zorundadır.

| İlke | Uygulama kuralı |
|---|---|
| Para birimi | Sistemin ödeme sözleşmesi TRY major-unit’tir; istemci tutarı ya da para birimini belirleyemez. |
| İmmutability | Defter postu sonradan güncellenmez veya silinmez. Düzeltme, ters kayıt veya yeni bir ayarlama postu ile yapılır. |
| İdempotency | `payment:{id}:hold`, `payment:{id}:release`, `payment:{id}:refund` gibi olay anahtarları benzersizdir. Aynı webhook/otomasyon yeniden gelse bile ikinci para hareketi yaratılmaz. |
| Atomiklik | Ödeme durumu, escrow çözümü, cüzdan hareketi ve ilgili defter postu aynı veritabanı transaction’ında yazılır. |
| Fail-closed | Dengesiz post, geçersiz hesap, eksik dış sağlayıcı credential’ı veya uzlaştırma hatası finansal başarı üretemez. |

## Hesaplar ve Olaylar

| Finansal olay | Borç | Alacak | Kanonik idempotency anahtarı |
|---|---|---|---|
| Tahsilat/hold | Müşteri tahsilat geçici hesabı | Escrow yükümlülüğü | `payment:{id}:hold` |
| İş serbest bırakma | Escrow yükümlülüğü | Profesyonel ödenecek hesabı | `payment:{id}:release` |
| Platform komisyonu | Escrow yükümlülüğü | Platform komisyon geliri | `payment:{id}:commission` |
| İade | Escrow yükümlülüğü veya platform rezervi | Müşteri iade hesabı | `payment:{id}:refund` |
| Para çekme | Profesyonel ödenecek hesabı | Payout bekleyen hesabı | `withdrawal:{id}:request` |
| Başarısız para çekme | Payout bekleyen hesabı | Profesyonel ödenecek hesabı | `withdrawal:{id}:reversal` |

İhtilaf, chargeback, kısmi iade, geri ödeme ve manuel düzeltme olayları için defter şeması ek hesap türleri ile genişletilebilir; bu olaylar doğrudan bakiye güncellemesiyle değil, yeni dengeli postlarla işlenir.

## Durum Geçişleri

Ödeme durumları `pending → held → released/refunded` kanonik sırasını kullanır. Webhook işleyicisi imza, replay/idempotency, tutar ve sağlayıcı referansı doğrulamasından geçmeden `held` durumu veya finansal post yazamaz. Escrow serbest bırakma yalnız müşteri onayı, yönetici ihtilaf çözümü veya imzalı 48 saatlik otomasyon tarafından başlatılır.

> Bu tasarım, cüzdan tablosunu kullanıcı arayüzü için operasyonel görünüm olarak korur; finansal mutabakat kaynağı immutable defterdir.

## Uzlaştırma

`FinancialReconciliationService`, Stripe veya iyzico’dan edinilen dış ödeme kaydını iç ödeme durumu, TRY tutarı, para birimi ve zorunlu defter idempotency anahtarlarıyla karşılaştırır. Her çalıştırma `financial_reconciliation_runs` içinde izlenir. Her uyumsuzluk `FINANCIAL_RECONCILIATION_ALERT` kodlu kritik uyarı olarak saklanır. Sağlayıcı credential’ı veya API çağrısı eksik/başarısızsa çalıştırma `failed` kapanır; varsayılan başarı veya yapay dış ödeme verisi oluşturulmaz.

Zamanlanmış çağrı yalnız `FINANCIAL_RECONCILIATION_CRON_SECRET` ile imzalanmış dahili endpoint üzerinden kabul edilir. Planlı yürütme için üretim scheduler’ı bu endpoint’i gerçek sırla çağırmalıdır.

## Operasyonel Sınırlar

Kart PAN/CVC verisi uygulama sunucusuna veya mobil istemciye yazılmaz; sağlayıcı token/PaymentIntent/checkout referansı kullanılır. Gerçek Stripe, iyzico, SMS, e-posta ve push credential’ları sağlanmadıkça kod fail-closed kalır ve canlı ödeme veya uzlaştırma PASS olarak raporlanmaz.
