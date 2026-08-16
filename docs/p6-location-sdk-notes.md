# P6 Konum SDK Karar Notu

Bu not, Expo SDK 54 `expo-location` modül belgesine dayanır. Konum erişimi yalnız talep edilen kullanıcı eyleminden sonra foreground izinle başlatılacaktır. İzin reddi, tarayıcı desteği veya kapalı konum servisleri durumunda özellik konum verisi üretmeden güvenli hata durumu gösterecektir.

Arka plan takibi bu P6 kapsamına alınmamıştır. Expo Go’da desteklenmediği ve ayrı platform izinleri ile development build gerektirdiği için, uygulama yalnız etkin iş ekranında açık kullanıcı eylemiyle foreground konum paylaşımını değerlendirecektir.

## Kaynak

- Expo SDK 54, `expo-location` yerel dokümantasyonu: `/home/ubuntu/move-and-fix_helper/docs/location/location/DOCS.md`
- Konfigürasyon referansı: [Expo Location configuration](https://docs.expo.dev/versions/latest/sdk/location/)
