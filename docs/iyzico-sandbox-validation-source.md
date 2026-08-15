# iyzico Sandbox Checkout Doğrulama Kaynağı

Bu kayıt, credential doğrulama betiğinin ödeme tahsilatı oluşturmadan yalnız Checkout Form başlatma yanıtını sınamak için kullandığı resmî API sözleşmesini belgeler.

| Doğrulanan konu | Resmî kaynak bulgusu |
|---|---|
| Checkout başlangıcı | Başarılı CF Initialize yanıtı `token` ve `paymentPageUrl` döndürür. |
| Zorunlu alıcı alanları | `id`, ad, soyad, kimlik numarası, e-posta, GSM, kayıt adresi, şehir ve ülke istenir. |
| Callback gereksinimi | `callbackUrl` geçerli SSL sertifikasına sahip olmalıdır. |
| Sandbox başarı örneği | Resmî örnek, checkout başlangıcı için sandbox alıcı alanları içerir. |

Doğrulama komutları sır, token, ödeme sayfası URL’si veya provider ham yanıtı yazdırmaz.

## Kaynaklar

- [CF Initialize — iyzico Documentation](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize)
- [Checkout Form Sample Implementation — iyzico Documentation](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-sample-imp.)
