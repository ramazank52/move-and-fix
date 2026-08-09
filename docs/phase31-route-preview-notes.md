# Phase 31 Rota Önizleme Uygulama Notları

- `create-service.tsx` içinde rota hizmetleri `moving`, `courier` ve `tow_truck` olarak ortak sözleşmede tanımlı.
- Mevcut form başlangıç ve varış adreslerini, manuel mesafeyi, taşınma kat/asansör bilgilerini ve cihazın mevcut koordinatını topluyor.
- Mevcut `Konumumu Kullan` davranışı rota hizmetlerinde başlangıç adresini ve ana talep koordinatını dolduruyor; varış koordinatı henüz üretilmiyor.
- Phase 4 için platforma özel `RequestRouteMap` bileşenleri oluşturuldu; mobil form henüz bu bileşeni kullanmıyor.
- Tamamlama yaklaşımı: başlangıç/varış adreslerini Expo geocoding ile çözmek, Haversine kuş uçuşu mesafesini açıkça **yaklaşık** olarak göstermek, iki koordinatı API payload’una geçirmek ve iOS/Android’de harita, web’de güvenli koordinat özeti render etmek.
- Harici ücretli directions servisi veya sahte yol mesafesi kullanılmayacak; kullanıcı manuel kilometreyi düzenlemeye devam edebilecek.

`RequestRouteMap`, nullable başlangıç ve varış koordinatlarını; iki adres etiketini ve runtime tema renklerini kabul ediyor. Native bileşen kendi içinde mutlak dolgu kullandığı için çağıran ekran sabit yüksekliğe ve `overflow: hidden` değerine sahip bir kapsayıcı sağlamalıdır. Koordinatlar henüz çözümlenmemişse aynı alan içinde açıklayıcı boş durum gösterir; iki koordinat olduğunda marker ve doğrusal rota önizlemesi render eder.

## Eski özel hizmet route denetimi

- `app/service/courier.tsx` yalnız yerel state, sabit fiyat hesaplayıcı ve `onPress` işlemi olmayan CTA içeriyor; `requests.create` veya başka bir gerçek API çağrısı bulunmuyor.
- `app/service/roadside.tsx` yalnız yerel state, sabit fiyat kartları ve `onPress` işlemi olmayan CTA içeriyor; konum düğmesi ve talep oluşturma gerçek işlev taşımıyor.
- `app/service/tow-truck.tsx` de yalnız yerel state, sabit fiyat hesaplayıcı ve `onPress` işlemi olmayan CTA içeriyor; gerçek talep API'sine bağlı değil.
- Bu iki ekran gerçek ürün akışı değildir ve kategori detayından yönlendirilerek ortak API-first `create-service` akışına paralel ikinci bir talep sistemi görünümü oluşturur.
- Bu üç ekran gerçek ürün akışı değildir ve kategori detayından yönlendirilerek ortak API-first `create-service` akışına paralel ikinci bir talep sistemi görünümü oluşturur.
- Geriye dönük deep-link uyumluluğu korundu; eski route dosyaları silinmeden ilgili kategori slug'ı ile ortak gerçek talep ekranına yönlendirildi.
