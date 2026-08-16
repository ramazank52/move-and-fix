# Master Phase D — Uygulama Notları

Phase D ürün yüzeyleri mevcut API-first, tRPC ve Drizzle mimarisine additive biçimde eklenecektir. Her kullanıcıya ait kaydın sahipliği veri katmanında doğrulanacak; istemciden gelen fiyat, güven puanı, ödeme ve durum bilgileri yetkili sunucu tarafında yeniden hesaplanacaktır.

## Güvenlik ve doğruluk sınırları

- **MoveTrust Passport** geçmiş olaylardan türetilen, açıklanabilir bir güven özeti olacaktır; yeni bir rozet veya doğrulama durumu yalnız denetlenebilir mevcut kayıtlardan üretilecektir.
- **Job Capsule** tamamlanan işin kanıt, ödeme, durum ve değerlendirme bağlantılarını değiştirmeden sabitleyen bir özet kaydı olacaktır. Kapsül erişimi yalnız iş katılımcıları ve yetkili operasyon rolleriyle sınırlı kalacaktır.
- **No Surprise Price** teklif/anlaşma özetindeki kullanıcıya sunulan üst limiti server-side koruyacak; limit üstü değişiklik için sahiplikli, açık ve denetlenebilir change order gerekecektir.
- **AI Price Intelligence** yalnız sunucuda çağrılacak, şemaya göre ayrıştırılacak ve model/altyapı hatasında fiyat veya ETA uydurmayacaktır. Öneri bağlayıcı değildir; uzlaştırma yalnız mevcut TRY settlement kurallarıyla yürür.
- **Safety Center** acil olay kaydını sahte çağrı, SMS ya da konum teslimatı üretmeden saklayacak; dış teslimatlar secret yokken NOT_CONFIGURED/fail-closed kalacaktır.

Bu not, Phase D testlerinin yetki, hata, edge-case, idempotency ve mevcut çalışır akışları koruma hedeflerini belirler.

## Master kabul kriterleri

MoveTrust Passport, doğrulamayı tek bir genel rozet yerine hizmet kapsamı, jurisdiction ve credential bağlamında göstermelidir. Job Capsule, mevcut request, offer, agreement, change-order, tracking, kanıt, ödeme, iade/itiraz, settlement ve değerlendirme olaylarını gereksiz tablo kopyalamadan tek denetlenebilir zaman çizelgesinde birleştirmelidir. No Surprise Price katmanı, müşterinin açık onayı olmadan anlaşma fiyatını, ek tahsilatı veya profesyonel ödemesini değiştirmemelidir. AI Price Intelligence, yeterli tamamlanmış iş ve kabul edilmiş teklif verisi bulunmadığında açıkça veri yetersizliği bildirmeli; yalnız açıklanabilir istatistiksel göstergelerden öneri oluşturmalı ve hiçbir finansal kaydı değiştirmemelidir.

Safety Center, acil servis olduğunu iddia etmez; iş/profesyonel kimlik özeti, ETA, aktif iş durumu, güvenilir kişi paylaşımı, check-in, olay bildirimi, destek kısayolu, maskeli iletişim ve audit kayıtlarını feature-flag kontrollü bir temel olarak sunar. Provider Business Cockpit yalnız gerçek veritabanı verilerinden kazanç, bekleyen settlement, tamamlanan iş, teklif dönüşümü, tekrar müşteri, ortalama puan, belge sona ermesi, iptal oranı ve kategori performansı üretir; veri yetersizliğinde sıfır veya veri yetersizliği gösterir. Corporate Fleet/Facility, Phase C organizasyon sahipliğini temel alarak şube, yönetilen mülk, varlık/araç, tekrar eden bakım ve onay akışlarını mevcut Job domain’ini çoğaltmadan ekler.
