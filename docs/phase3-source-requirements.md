# Faz 3 Kaynak Gereksinimleri

Bu kayıt, kullanıcının sağladığı `Pasted_content_03.txt` belgesindeki teknik gereksinimlerin uygulanabilir özeti ve izlenebilirlik kaynağıdır. Hukuki hüküm veya sağlayıcı entegrasyonu sonucu üretmez.

## Değişmez Sınırlar

Faz 1 ve Faz 2 güvenlik, doğrulama, immutable ledger ve escrow korumaları korunacaktır. Gerçek sağlayıcı anahtarı olmadan tahsilat, payout veya refund üretim sonucu iddia edilmeyecektir.

## Uygulama Sözleşmeleri

| Alan | Zorunlu davranış |
|---|---|
| Ödeme | Tahsilat sonrası fon doğrudan profesyonel kullanılabilir bakiyesine geçmez; hold, settlement ve payout ayrı yaşam döngüleridir. |
| Komisyon | Varsayılan %10 olmakla birlikte kabul edilen işte versioned/prospective snapshot’a sabitlenir. |
| Tamamlama | Sağlayıcı tamamlandığını bildirdiğinde configurable review window boyunca müşteri onayı veya sorun bildirimi beklenir. |
| Dispute | Tutarın tartışmalı bölümü held kalır; AI yalnız özet/timeline sağlar, nihai karar insan/prosedür akışındadır. |
| Değişiklik | Sağlayıcı tek taraflı fiyat değiştiremez; customer onayı olmadan ChangeRequest snapshot’ı değiştirmez. |
| İş dosyası | Kabul edilmiş iş için agreement, ödeme, iletişim, medya, kanıt, değişiklik, dispute ve audit kayıtları merkezî olarak ilişkilendirilir. |

## Dış Bağımlılıklar

Gerçek ödeme sağlayıcı credential’ları, lisanslı marketplace/delayed-settlement sözleşmesi ve nihai ülke/policy içeriği sağlanmadan canlı tahsilat veya ödeme dağıtımı doğrulanamaz.
