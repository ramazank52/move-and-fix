# ADR-005: Dependency Injection Pattern

**Tarih:** 7 Ağustos 2026  
**Durum:** Accepted

## Bağlam

EventService ve NotificationServiceV2 arasında döngüsel bağımlılık (circular dependency) vardı. EventService, NotificationService'i doğrudan import ediyordu; NotificationService de EventService'i import ediyordu. Bu durum runtime hatalarına ve memory leak'lere yol açabilirdi. Ayrıca servislerin test edilebilirliği düşüktü çünkü bağımlılıklar somut sınıflara sıkı sıkıya bağlıydı.

## Karar

Dependency Injection (DI) pattern uygulandı. Servisler arası doğrudan import kaldırıldı; bunun yerine arayüzler (interfaces) üzerinden bağımlılık enjeksiyonu kullanıldı.

- `IEventPublisher` arayüzü: Event yayınlama sözleşmesi
- `INotificationSender` arayüzü: Bildirim gönderme sözleşmesi
- Composition root (`routers.ts`): Servislerin wiring'i tek bir yerde

## Gerekçe

1. **Döngüsel bağımlılık kırıldı:** EventService artık NotificationService'i import etmiyor; bunun yerine `INotificationSender` enjekte ediliyor.
2. **Test edilebilirlik arttı:** Mock test doubles (`MockWalletService`, `MockNotificationSender`, `MockPaymentGatewayService`) ile servisler izole test edilebilir.
3. **Geleceğe hazırlık:** Farklı implementasyonlar (örn. Redis-based event publisher) kolayca eklenebilir.
4. **InversifyJS gibi ağır DI container yerine sade çözüm:** Manuel DI, proje karmaşıklığına uygun, gereksiz bağımlılık yok.

## Sonuçlar

- Servis constructor'ları artık bağımlılık parametreleri alıyor (opsiyonel, default ile).
- Composition root (`routers.ts`) servis wiring'ini yönetiyor.
- Yeni servisler eklenirken arayüz tanımlanması ve wiring eklenmesi gerekiyor.
- Test double'lar `server/services/interfaces.ts` içinde tanımlı.
