# NetGSM SMS Entegrasyon Kaynağı

| Konu | Resmî belge bulgusu |
|---|---|
| Gönderim endpointi | `POST https://api.netgsm.com.tr/sms/rest/v2/send` |
| Kimlik doğrulama | HTTP Basic Authentication; kullanıcı adı ve parola Base64 ile Authorization başlığında gönderilir. |
| Gövde | JSON: `msgheader`, `messages` (her kayıt için `msg` ve `no`), `encoding`, `iysfilter`, `appname`. |
| Başarı | `code: "00"`, `jobid` ve `description: "queued"`. |
| Hata | Başarı kodu dışı `code`, boş `jobid` ve açıklama döner. |
| Operasyonel ön koşul | API çağrıları için yetkilendirilmiş NetGSM alt kullanıcısı gerekir; SMS gönderimi yalnız POST ile desteklenir. |

## Kaynak

- [NetGSM API Dokümanı](https://www.netgsm.com.tr/dokuman/#api-dokumani)
