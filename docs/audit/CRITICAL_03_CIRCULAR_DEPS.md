# Kritik Bulgu #3 — Servis Bağımlılık Döngüleri

**Durum:** Kapatıldı  
**Tarih:** 7 Ağustos 2026

## Tespit

`EventService` ve `NotificationService`/`NotificationServiceV2` arasında statik bir import döngüsü bulunmamaktaydı; ancak `EventService` içindeki tüm handler metotları, `notificationService` ve `walletService` çağrılarını yorum satırı olarak (commented-out stub) içeriyordu. Bu, döngüsel bağımlılık niyetini ve entegrasyon açığını temsil ediyordu: handler'lar aktive edildiğinde doğrudan import döngüsü oluşacaktı.

## Uygulanan Düzeltmeler

### 1. Ortak Servis Arayüzleri (`server/services/interfaces.ts`)

`IEventPublisher`, `INotificationSender`, `IWalletService`, `IAIService`, `IPaymentGatewayService` arayüzleri tanımlandı. Bu arayüzler servisler arası doğrudan import'u kaldırır ve test double'ları mümkün kılar.

### 2. EventService — Bağımlılık Enjeksiyonu

`EventService` sınıfına `setNotificationSender()` ve `setWalletService()` metodları eklendi. Tüm handler'lar (`handlePaymentCompleted`, `handlePaymentFailed`, `handleOrderCreated`, `handleOrderCompleted`, `handleWithdrawalCompleted`, `handleUserRegistered`, `handleAICommandExecuted`) yorum satırı stub'lardan çıkarıldı ve enjekte edilen adapter'lar üzerinden çağrı yapar hale getirildi.

### 3. NotificationServiceV2 — Event Publisher Adapter

`NotificationServiceV2` sınıfına `setEventPublisher()` metodu eklendi. Bildirim başarılı/başarısız olduğunda `EventType.NOTIFICATION_SENT` / `EventType.NOTIFICATION_FAILED` event'leri enjekte edilen publisher üzerinden yayımlanır.

### 4. Composition Root (`server/routers.ts`)

Tüm servis wiring'i `routers.ts` içinde yapılır:
- `eventService.setNotificationSender(notificationService)`
- `eventService.setWalletService(walletService)`
- `notificationServiceV2.setEventPublisher(eventService))

Bu, döngüsel import'u mimari düzeyde önler.

## Doğrulama

| Kapı | Sonuç | Kanıt |
|---|---:|---|
| TypeScript strict kontrol | Başarılı | `.manus-logs/audit/critical-3/check.log` |
| Döngüsel bağımlılık testleri | Başarılı, 4/4 | `.manus-logs/audit/critical-3/targeted-test.log` |
| Sunucu build | Başarılı | `.manus-logs/audit/critical-3/build.log` |
| Tam test paketi | 50 başarılı, 24 başarısız (önceki borç), 5 atlanan | `.manus-logs/audit/critical-3/full-test.log` |

Başarılı test sayısı Kritik #1 ve #2'den 46'ya yükselmişti; Kritik #3'ün 4 yeni testi ile 50'ye yükselmiştir. Başarısız 24 test başlangıç taban çizgisindeki aynı taslak E2E/sanitizasyon borcudur; yeni regresyon eklenmemiştir.

## Regresyon Değerlendirmesi

Mevcut servis davranışları korunmuştur. EventService handler'ları artık aktif olarak çalışıyor ve enjekte edilen adapter'lar üzerinden bildirim/escrow işlemlerini yürütüyor. Hiçbir mevcut API veya UI akışı değiştirilmemiştir.
