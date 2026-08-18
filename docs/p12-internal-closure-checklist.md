# P12 FINAL INTERNAL CLOSURE — Çalışma Kontrol Listesi

> Kaynak talimat: `/home/ubuntu/upload/Pasted_content_01.txt` (kullanıcı tarafından sağlanan, baseline: `6a520e79ccecfbffe50a94e9480e143e450fea94`). Bu belge, uygulama sırasında dış talimattaki kabul ölçütlerinin izlenebilir özetidir; hukuki kural kaynağı değildir.

## Değişmez İlkeler

- Doğru çalışan Customer, Professional, MoveAI, Admin, payment, ledger, messaging, tracking, support, claims, compliance, security, database, MoveOS, localization ve build yüzeyleri sebepsiz yeniden yazılmayacaktır.
- Yeni migration'lar additive, güvenli ve sürümlü olacaktır. Client, kritik kararlar için otorite değildir.
- Finansal, hukuki, kimlik, credential, safety ve admin kararları sunucuda enforce edilir. Hukuki/yetki belirsizliği `BLOCK` veya `LEGAL_REVIEW_REQUIRED` olarak kalır.
- Gerçek secret veya credential uydurulmaz. Harici credential eksikliği, uygulanabilir internal işleri durdurmaz.
- Her PASS iddiası gerçek kod ve gerçek test kanıtına dayanır. Eski testler silinmez ve yeni testler eklenir.

## P0-1 — Compliance Fail-Open Kapatma

- Her yeni service request için sunucu; ülke, jurisdiction, kategori/subcategory, service key, capability, compliance package/rule/safety versiyonları ve ödeme jurisdiction'ını otoriter biçimde çözer.
- Jurisdiction/package/mapping/rule/safety unresolved, resmi kaynak doğrulanmamış veya capability yok-geçersiz-iptalse yeni marketplace işlemi fail-closed engellenir.
- `requiredCapabilityId` yalnız açık, sürümlü `NOT_REQUIRED` kuralında null olabilir; mapping bulunamamasından null türetilemez.
- `LEGACY_ROLLOUT_DISABLED` yalnız eski kayıt okuma/raporlama içindir; yeni request/offer/accept/job transition için bypass değildir.
- Enforcement request creation, opportunity visibility, offer creation/acceptance ve iş durum geçişlerinde tekrar uygulanır. Limited scope, yalnız machine-readable `scopeConstraintsJson` ile yetkilidir.
- Kabul regresyonları: jurisdiction/package/mapping/rule yoksa block; açık `NOT_REQUIRED` ve verified/in-range limited scope pass; expired/revoked race, API bypass ve legacy bypass block.

## P0-2 — Türkiye Gold Master

- Hukuki kural yalnız onaylı `TR_Gold_Master_Country_Pack_v1`, `TR_Gold_Master_Country_Pack_v1.json`, `TR_Official_Source_Registry_v1.json`, `TR-GOLD-2026-08-13-v1.0` girdi paketi varsa içe alınacaktır.
- Onaylı girdi erişilemezse `MISSING_APPROVED_TR_GOLD_MASTER_INPUT` raporlanır; kural uydurulmaz.
- Tüm aktif TR hizmet/subservice için sürümlü, kaynaklı rule state (`REQUIRED`, `CONDITIONAL`, `OPTIONAL/RECOMMENDED`, `NOT_REQUIRED`, `PROHIBITED` veya `UNKNOWN`) bulunur; `UNKNOWN` block eder.
- Capability’ler gerçek kategori/subcategory kimlikleriyle bağlı olur; orphan capability oluşturulmaz. Legal approval olmadan country launch otomatik enable edilmez.

## P0-3/4 — Professional Onboarding ve Dinamik Credential Modeli

- Onboarding: operating country/region/jurisdiction, approved catalog hizmetleri, servis alanı/müsaitlik, operating model, yasal credential/document, sigorta/işletme/araç-sürücü koşulları, review/verification ve marketplace activation zincirini kapsar.
- Profile completion olmadan offer/opportunity fail-closed kalır; istemci arbitrary capabilityId ile yetkilenemez.
- Server-authoritative document UI korunur; credential modeli kimlik, sürücü, mesleki yeterlilik, lisans, taşıma/işletme/araç/sürücü, sigorta, izin, ekipman ve jurisdiction custom requirement’larını extensible katalog üzerinden destekler.

## P0-5 — Güvenli Provider Belge İnceleme Erişimi

- Kapalı `/manus-storage/*` yolu yeniden açılmaz.
- `providerDocumentAccess(documentId)` yalnız belge sahibi veya yetkili compliance/admin reviewer’a kısa ömürlü signed URL döndürür; customer, ilgisiz provider ve yetkisiz admin reddedilir.
- Erişim sırası: authenticated user → metadata → RBAC/ownership → retention/purge → scan/security → short-lived signed URL → audit event.
- Raw storage key client’a dönmez, `Cache-Control: no-store` kullanılır, erişim loglanır ve IDOR regresyonları kapsanır.

## P0-6 — Malware Scanner ve Quarantine Pipeline

- Mevcut `pending_scan`, `clean`, `blocked`, `expired` güvenlik durumları korunur.
- `MediaSecurityScanner.scan(mediaId, storageKey)` sonucu `clean`, `blocked`, `scanner_unavailable` veya `error` olur.
- Production scanner provider/credential yokken `pending_scan`/`NOT_CONFIGURED` fail-closed kalır; otomatik `clean` üretilmez. Fake-clean yalnız explicit test adapter ile ve production dışında kullanılabilir.
- Akış: upload → metadata → MIME/magic → quarantine → malware scan → clean → authorized serve. `blocked` veya scanner unavailable içerik sunulmaz.
- Retry/backoff, admin görünürlüğü ve operasyon alarmı sağlanır. Provider document, job/expense/dispute/claim evidence dahil ilgili upload sınıfları kapsanır; archive bomb ve active-content riski değerlendirilir.
- Regresyonlar pending/blocked/unavailable non-serve, clean authorized serve, unrelated denial, admin review ve idempotent retry kapsar.

## P0-7 — Chat PII Minimizasyonu

- `getMessageConversations`, `getMessageParticipant` ve user-to-user messaging DTO’ları karşı tarafın e-posta, telefon ve private identity alanlarını istemciye vermez.
- Public participant DTO yalnız display name, avatar, uygunsa verified badge, participant ID abstraction ve job context taşır. Admin/compliance e-posta ihtiyacı ayrı RBAC endpoint’ten karşılanır.
- Customer/provider’ın karşı taraf e-posta/telefonunu ve public/profile uçlarının aynı bilgileri sızdırmadığını regresyonlar kanıtlar.

## P1-8 — Masraf Dosyası UX

- `ExpenseRecord` ve `ReimbursementClaim` ayrımı korunur; expense otomatik müşteri borcu değildir.
- Masraf arayüzü category, amount, currency, description, purchasedAt, vendor/store ve brand bilgilerini kapsar.

## P1-8 — Masraf Dosyası UX

- `ExpenseRecord` ile `ReimbursementClaim` ayrımı ve masrafın otomatik borç olmaması korunur.
- Kayıt; kategori, tutar/para birimi, açıklama, satın alma tarihi, satıcı/marka/model/adet, makbuz/fatura, ayrı ürün görselleri, opsiyonel video, konum bağlantısı ve paylaşım görünürlüğünü destekler.
- İlgili iş sohbetinde **Masraf Dosyasını Gör** ve aktif iş dosyasında **İş Masrafları** girişi bulunur; cross-job erişim engellenir ve müşteri yalnız aynı işin paylaşılan kayıtlarını görür.

## P1-9/10/11 — Dil, i18n ve Sohbet Çevirisi

- İlk kullanıcı paketi yalnız `tr`, `en`, `de`, `fr`, `ar`, `ru`, `zh`, `hi`, `es`, `pt`, `bn`, `id`, `ja` dilleridir; Arapça RTL ve cihaz yerel ayarı korunur.
- Production kullanıcı arayüzündeki metinler, erişilebilir etiketler ve hata/boş durumlar i18n anahtarlarına taşınır; 13 dilde anahtar bütünlüğü ve raw-key göstermeyen fallback test edilir.
- Çeviri önbelleği kaynak/hedef dil, sağlayıcı-model-sürüm, zaman, özgün ileti hash’i ve versiyonu taşır; özgün mesaj kanıttır ve çeviri hatası teslimatı engellemez.

## P1-12/13/14/15 — AI, Ülke/Ödeme ve Uyuşmazlık

- MoveAI herhangi bir sahte güven, fiyat, profesyonel eşleşmesi veya işlem sonucu fallback’i üretmez; belirsiz durumda güvenli açıklama ve yönlendirme döner.
- Country/jurisdiction ve ödeme resolver’ları eksik veya belirsiz yapılandırmada fail-closed çalışır; para/sağlayıcı kararları istemciden alınmaz.
- Kısmi dispute/refund/payout çözümü idempotent, dengeli ledger ve müşteri lehine güvenli sonuç ilkesiyle doğrulanır.

## P1-16/17/18/19 — Gizlilik ve Profil Ürün Yüzeyleri

- Privacy/account deletion UI gerçek yeniden doğrulama, progress ve sunucu durumuna bağlı çalışır.
- Profil düzenleme gerçek tRPC mutasyonlarına bağlıdır; e-posta doğrulaması gerçek tokenlı süreç dışındaysa fail-closed kalır; sahte doğrulama/demo rotaları temizlenir.
- Üretim rotalarında demo/sample/placeholder içerik, sahte harita ve yanıltıcı başarı görünümü bırakılmaz.

## P1-20/21 — Provider Policy ve Legacy Wallet

- Sigorta, çalışma modeli ve iş güvenliği kuralları server-authoritative görünür; belirsiz safety kuralı yeni iş veya geçişi açmaz.
- Legacy wallet/simulated-success bağımlılıkları etkin işlem grafiğinden kaldırılır; gerçek ledger/escrow sözleşmesi korunur.

## P12 Release Evidence

- Migration’lar additive ve uygulanmış olur; P12 test matrisi ile TypeScript, lint, backend build, iOS/Android/web export, secret/audit/SBOM/license, placeholder taraması ve `git diff --check` gerçek sonuçlarla kaydedilir.
- Dış sağlayıcı credential’ları, domain/hukuk onayı ve fiziksel cihaz doğrulaması yalnız gerçek external gate olarak raporlanır.
