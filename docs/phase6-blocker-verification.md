# Faz 6 Sonrası Blocker Doğrulama Kaydı

## Gizlilik Politikası Public Rota

- Tarih: 2026-08-15
- Hedef: `/privacy-policy`
- Oturum gereksinimi: Yok
- İlk render bulgusu: `expo-router/head` girişinin runtime'da `Head` bileşenini dışa aktarmaması nedeniyle React "Element type is invalid" hata overlay'i oluştu.
- Kök neden düzeltmesi: Başlık bileşeni kurulu Expo Router paketinin gerçek `expo-router/build/head` dışa aktarımına bağlandı.
- Yeniden doğrulama: Public rota doğrudan açıldı; sayfa başlığı `Move&Fix Gizlilik Politikası`; mevcut katalogdaki Türkçe gizlilik metni, sürüm ve güncelleme tarihi render edildi; hata overlay'i görülmedi.
- Hukuki içerik kaynağı: `lib/data/legal.ts` içindeki mevcut `privacy` belgesi. Metin değiştirilmedi.
- Açık içerik eksikliği: Mevcut proje ve yüklenen belgelerde onaylı İngilizce gizlilik metni tespit edilmedi. İngilizce seçimi, yeni hukuki metin üretilmeden bu eksikliği görünür kılar; üretim yayını için onaylı metin sağlanmalıdır.

İngilizce sekme 2026-08-15 tarihinde ayrıca gerçek web render ile doğrulandı. Sayfa `Move&Fix Privacy Policy` başlığını, oturumsuz erişim bilgisini ve onaylı İngilizce metnin eksik olduğunu belirten kontrollü uyarıyı gösterdi; React hata overlay’i oluşmadı.

## Ödeme ve Dış Sağlayıcı Hazırlığı

- iyzico sandbox anahtarlarıyla, ödeme tahsilatı oluşturmayan Checkout Form başlangıç isteği başarıyla doğrulandı. Eksik ve bilinçli olarak geçersiz credential yolları ayrıca fail-closed kaldı.
- Kısmi sır girişindeki kayıt sorunu, her sağlayıcının credential kartını bağımsızlaştırarak giderildi. Yalnız `IYZICO_API_KEY` ve `IYZICO_SECRET_KEY` ile kaydetme doğrulandı.
- NetGSM, SendGrid ve Expo/FCM kod yolları gerçek credential yokken teslimat başarılıymış gibi davranmaz; credential sağlandığında gerçek sağlayıcı çağrısı yapacak şekilde fail-closed yapılandırıldı ve sözleşme testleri eklendi.
- NetGSM production credential’ı, SendGrid credential’ı, Stripe sandbox credential’ı ve EAS/Expo push kimliği henüz sağlanmadığı için gerçek sağlayıcı kabulü ile gerçek cihaz teslimatı **FINAL EXTERNAL INTEGRATION GATE** kapsamındadır.

## Bildirim ve Veritabanı

- `user_push_tokens`, `in_app_notifications` ve `user_notification_preferences` additive tabloları yönetilen veritabanında doğrulandı.
- Token kaydı, kalıcı uygulama içi geçmiş, okunma durumu ve kullanıcıya ait kanal/olay tercihi tRPC üzerinden sahiplik denetimli çalışır.
- iOS ve Android Expo export’ları native bildirim eklentisi, izin metinleri ve yeni istemci koduyla başarıyla tamamlandı; fiziksel cihazda izin/token/teslimat doğrulaması dış bağımlılık olarak açık kalır.

## Secret, Domain ve Kalite Bulguları

- İstemci kaynakları ile iOS/Android dışa aktarımlarında canlı sağlayıcı sırrı veya private key imzası bulunmadı.
- İzlenen Git geçmişinde eşleşen sır imzası ve izlenen `.env` dosyası bulunmadı.
- `app.config.ts` içinde tanımlı `https://moveandfix.app/privacy-policy` DNS çözümlemesi bu ortamda başarısız oldu. Domain/DNS/HTTPS yayını yapılmadan mağaza metadata URL’si canlı doğrulanmış sayılamaz.
- TypeScript, lint, backend build, tam regresyon ve iOS/Android export kalite kapıları uygulandı. Ayrıntılı test sayısı checkpoint raporunda kaydedilecektir.
