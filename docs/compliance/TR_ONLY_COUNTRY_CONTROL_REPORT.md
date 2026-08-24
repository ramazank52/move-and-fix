# Türkiye-Only Country Market Control Raporu

**Baseline:** `5803314c`  
**Migration:** `0089_country_market_control_tr_only.sql` (managed test/staging TiDB’ye uygulandı)  
**Bu checkpoint:** Türkiye production release’i veya publish işlemi yapmaz.

## Uygulanan Kontroller

| Katman | Uygulama | Fail-closed sonuç |
|---|---|---|
| State modeli | `country_market_controls` desired/effective ayrımı, optimistic version | Owner niyeti efektif market durumu değildir |
| Audit | Append-only `country_market_control_events`, correlation ID, actor/MFA grant, reason, snapshot hash | State değişikliği izlenir; serbest/sessiz mutasyon yok |
| Release kanıtı | `country_market_release_runs` | BLOCKED run, aktif release gibi sunulmaz |
| Authorization | `superAdminMfaProcedure` + platform owner openId kontrolü | Admin/provider/client state yazamaz |
| Runtime | Country market control, legacy deployment gate’den önce daraltıcı kontrol | Closed/unknown market transition reddedilir |
| UI | MoveOS owner card | Effective state ve gate görünür; publish/ACTIVE butonu yok |
| Emergency | MFA+reason ile PAUSED/EMERGENCY_DISABLED | Yeni işlemler server-side kapatılır; destructive cleanup yok |

## Sınırlar ve Rollback

Yeni state kontrolü additive’dir; Türkiye Blok 1, Berlin ve US kayıtlarını güncellemez. Logical rollback `PAUSED` veya `EMERGENCY_DISABLED` desired state isteğidir; policy effective state’i aynı anda kapatır. Schema tablosu, audit event veya user/provider verisi silinmez. Active market ise existing in-flight jobs için settlement/read path korunmalı, yeni request/offer/booking/payment/payout/campaign/notification işlemleri durmalıdır; bu checkpoint’te active market olmadığından wind-down işlemi tetiklenmemiştir.

## Other-Country Assertion

CN/DE/JP/US controls `INFRA_ONLY`, runtime allowlist `0`; RU `INFRA_ONLY_NO_GO`, runtime allowlist `0`. Berlin 79 policy satırının aktif sayısı `0`; US coverage/policy `BLOCKED`; Türkiye Block 1 onaysız/NO-GO durumunda kalır. Hiçbir non-TR country için owner effective-state transition veya UI action sunulmaz.

## Release Stop Condition

Bu çalışma sonunda tek güvenli sonuç **NOT PRODUCTION READY**’dir. Açık, ayrı bir `TÜRKİYE-ONLY PRODUCTION RELEASE ONAYLANDI` kullanıcı talimatı; valid local legal/source/connector evidence; Türkiye capability allowlist; legal locale; gerçek external credential/operational acceptance; physical device E2E/signing; monitoring/backup/change record tamamlanmadan ACTIVE state veya publish kesinlikle yapılmayacaktır.

## Test ve Kalite Kanıtı

| Kontrol | Gerçek sonuç | Yorum |
|---|---|---|
| Country market policy + authorization hedefli testleri | PASS — 3 dosya / 10 test | Ready-pending, missing-evidence, RU no-go, emergency override, owner/MFA ve server-derived gate sözleşmesi |
| Full regression | PASS — **129 dosya / 743 test** | Önceki 127/736 baseline kapsamı korunup genişledi |
| TypeScript, 512 MB | ENVIRONMENTAL OOM | Node heap sınırı; PASS sayılmaz |
| TypeScript, 1792 MB | PASS | Type error yok |
| Lint | PASS | `expo lint` temiz |
| Backend build | PASS | Server bundle üretildi |
| Drizzle integrity | PASS | 0089 journal/schema bütünlüğü doğrulandı |
| SCA | PASS | 4 advisory, 0 blocking release, 2 mevcut approved exception |
| Whitespace | PASS | `git diff --check` temiz |

> Managed TiDB sonucu yalnız test/staging kanıtıdır. Production ile fiziksel ayrım kanıtı veya production change record sunulmadığı için `ENVIRONMENT_SEPARATION_UNVERIFIED` devam eder; 0089 production-applied sayılmaz.
