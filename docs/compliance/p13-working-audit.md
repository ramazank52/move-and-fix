# P13 Working Audit — 18 Ağustos 2026

Bu çalışma notu, P13 FINAL VERIFIED INTERNAL CLOSURE kabul maddelerinin uygulama sırasındaki gerçek durumunu korur. Hukuki kaynak hükmü değildir; TR-GOLD-2026-08-13-v1.0 paketi hukuki kural için tek kaynak olmaya devam eder.

| Alan | Durum | Kanıt / Not |
|---|---|---|
| Onaylı TR Gold Master | Uygulanmış, final regresyon bekliyor | `server/compliance/approved-sources/TR-GOLD-2026-08-13-v1.0/`; country gate otomatik etkinleştirilmedi. |
| Capability context | Uygulanmış, final regresyon bekliyor | `complianceRequirementState` migration 0061 ve fail-closed guard. |
| Media scanner durable outbox | Hedefli doğrulandı | Migration 0062; dört medya sınıfında kalıcı iş, signed callback atomik tamamlama, adapter, bounded retry/dead-letter ve yapılandırmasız scheduler için 503. Hedefli 4 dosya / 43 test PASS. |
| Chat PII | Hedefli doğrulandı | Liste ve detay DTO’larında katılımcı e-postasının dönmediğini kilitleyen mesaj router regresyonu. |
| Global jurisdiction runtime | İnceleniyor | `resolveServiceRequestComplianceContext` bilinmeyen ülke ve paket/kural/capability eksikliğinde `blocked` döndürüyor; request route’da `countryCode` henüz explicit input değil, default TR davranışı P13 UNKNOWN=BLOCK ilkesiyle yeniden değerlendiriliyor. |
| Demo route | İnceleniyor | `app/dev/theme-lab.tsx`, production’da `Redirect href="/"` ile kapalı; son route taraması ve test kanıtı bekliyor. |
| Environment contract | İnceleniyor | `server/_core/env.ts` merkezi ama typed parsing ve explicit NOT_CONFIGURED sözleşmesi P13 değerlendirmesinde. |
| i18n / privacy / expenses / payment | İnceleniyor | P12/P11 uygulamalarının P13 tam kabul matrisi ve regresyonu bekliyor. |

## P13 Doğrulama İlkeleri

* Belirsiz ülke, yetki alanı, kaynak doğrulaması, güvenlik sonucu veya ödeme sağlayıcısı **onay** üretmez; güvenli sonuç `BLOCK`, `LEGAL_REVIEW_REQUIRED` ya da `NOT_CONFIGURED` olmalıdır.
* Scanner adapter, geçerli imzalı sonuç olmadan hiçbir nesneyi `clean` yapamaz. Scanner konfigürasyonu yoksa obje karantinada ve iş gönderimi 503 durumunda kalır.
* Her değişiklik additive olmalı; geriye dönük kayıtların sessizce yetkili/temiz kabul edilmesine izin verilmez.

## Kaynaktan Doğrulanan Açık P0 Sınırı

P13 talimatı, dört değerli eski `complianceRequirementState` modelini yeterli kabul etmez. Yeni işleme için en az aşağıdaki ayrımlar machine-readable kalmalıdır: `REQUIRED`, `CONDITIONAL`, `NOT_REQUIRED`, `PROHIBITED`, `UNKNOWN`, `JURISDICTION_UNRESOLVED`, `PACKAGE_UNAVAILABLE`, `CAPABILITY_UNMAPPED` ve `LEGAL_REVIEW_REQUIRED`. Sadece açıkça gözden geçirilmiş, sürümlenmiş `NOT_REQUIRED` credential şartı olmadan ilerleyebilir; diğer belirsiz veya olumsuz haller yeni marketplace işleminde bloktur.

P13 ayrıca `requests.create` girdisinde teslimat konumundan gelen `serviceCountryCode`, bölge ve şehir/locality verilerini ister; sessiz `TR` varsayımı yasaktır. Yeni request immutable snapshot’ında country, jurisdiction, compliance package version ve currency context kalmalıdır. IP veya cihaz dili country yerine geçemez; hazır olmayan country launch gate `COUNTRY_MARKETPLACE_NOT_READY` ile bloklanmalıdır.
