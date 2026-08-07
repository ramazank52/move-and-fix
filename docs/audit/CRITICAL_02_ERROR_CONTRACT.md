# Kritik Bulgu #2 — Merkezi Hata Türleri ve Servis Sözleşmesi

**Durum:** Kapatıldı  
**Tarih:** 7 Ağustos 2026

## Uygulanan Düzeltmeler

`server/_core/errors.ts` içinde tek bir domain hata sözleşmesi oluşturuldu. Sözleşme `AppError`, `ValidationError`, `AuthenticationError`/`AuthError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `ExternalServiceError`, `DatabaseError` ve `PaymentError` sınıflarını; ayrıca kategori, önem, retry, bağlam ve `unknown` daraltma yardımcılarını içerir.

`server/_core/errorHandler.ts`, bu merkezi sözleşmeyi kullanan yapılandırılmış logger ve Express error middleware olarak yeniden düzenlendi. Gevşek request/error erişimleri güvenli type guard ve `Reflect.get` ile sınırlandı. `server/_core/trpc.ts`, domain hatalarını uygun tRPC kodlarına dönüştüren ortak middleware ile güncellendi; böylece router'lar typed hata sınıflarını doğrudan kullanabilir.

Wallet, Payment Gateway, AI, Notification, Notification V2 ve Event servisleri raw `Error` üretimi ile gevşek hata yakalama yerine merkezi domain sınıflarına geçirildi. Tüm servis catch blokları `unknown` kullanıyor; ödeme ve bildirim dış bağımlılık hataları cause, retry politikası ve operasyon bağlamını koruyor. Owner login/2FA hataları `AuthError` kullanıyor. Health kontrolündeki `catch (error: any)` ve Express `any` parametreleri kaldırıldı.

## Doğrulama

| Kapı | Sonuç | Kanıt |
|---|---:|---|
| TypeScript strict kontrol | Başarılı | `.manus-logs/audit/critical-2/check.log` |
| Merkezi hata testleri | Başarılı, 9/9 | `.manus-logs/audit/critical-2/targeted-test.log` |
| Servis domain hata testleri | Başarılı, 5/5 | `.manus-logs/audit/critical-2/targeted-test.log` |
| Sunucu build | Başarılı | `.manus-logs/audit/critical-2/build.log` |
| `catch (...: any)` taraması | 0 eşleşme | `.manus-logs/audit/critical-2/final-error-surface-scan.log` |
| Servislerde raw `throw new Error` taraması | 0 eşleşme | `.manus-logs/audit/critical-2/final-error-surface-scan.log` |
| Servislerde `any` / `as any` taraması | 0 eşleşme | `.manus-logs/audit/critical-2/final-error-surface-scan.log` |
| Diff biçim kontrolü | Başarılı | `.manus-logs/audit/critical-2/diff-stat.txt` |

Tam test paketi **46 başarılı, 24 başarısız, 5 atlanan** test üretmiştir. Başarısız 24 test başlangıç taban çizgisindeki aynı taslak E2E/sanitizasyon borcudur; yeni başarısız test eklenmemiştir. Başarılı test sayısı, Kritik #1 ve #2 için eklenen toplam 18 test nedeniyle başlangıçtaki 28'den 46'ya yükselmiştir. Lint sonucu başlangıçtaki aynı 3 hata ve 28 uyarıdır.

## Regresyon Değerlendirmesi

Mevcut servis davranışları korunmuş; yalnızca hata sınıflandırması, kullanıcıya dönen transport kodu, retry bilgisi ve runtime daraltması somutlaştırılmıştır. Ödeme yetersiz bakiye, escrow validasyonu, bulunamayan escrow, kullanılamayan AI provider ve eksik bildirim şablonu davranışları doğrudan test edilmiştir. Bu düzeltmeden kaynaklanan yeni TypeScript, test, lint veya build regresyonu tespit edilmemiştir.
