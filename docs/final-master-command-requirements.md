# Move&Fix — FINAL MASTER COMMAND Gereksinim Envanteri

Kaynak: Kullanıcının sağladığı `MoveFix_FINAL_MASTER_COMMAND_vFinal(1).pdf`.

## Uygulama İlkeleri

- Mevcut çalışan mimariyi additive değişikliklerle koru; gerçek credential üretme veya kaynak koda yazma.
- Kimlik, ödeme, sağlayıcı teslimatı, ülke/uyum veya güvenlik kararı bilinmiyorsa **fail-closed** davran.
- Her yeni yüzey için unit, integration, authorization, hata ve edge-case regresyonları ekle.
- Harici sağlayıcı veya fiziksel cihaz doğrulaması gereken çıktıları başarı gibi göstermeden external gate olarak raporla.

## P0 Güvenlik ve Uyum

1. Capability ve jurisdiction kararları, talep oluşturma, fırsat görünümü, teklif, kabul ve iş başlangıcı geçişlerinde sunucu tarafında uygulanmalı; unknown durum block olmalıdır.
2. Medya yanıtları kalıcı/public storage URL döndürmemeli; opaque kimlik, purpose bağlamı, sahiplik ve geçici signed erişim zorunlu olmalıdır.
3. Credential gereksinimleri kategori/ülke/policy sürümüne göre hesaplanmalı; onaysız profesyonel yüksek riskli işlere girememelidir.
4. Chat, profil, fırsat ve cüzdan DTO’ları PII minimizasyonu uygulamalı; legacy cüzdan grafiği üretim akışından kaldırılmalıdır.
5. MoveAI yalnız doğrulanabilir taslak/öneri üretmeli; capability, pricing, payment veya regülasyon konusunda doğrulanamaz iddia sunmamalıdır.
6. Preview/debug/admin geliştirme yüzeyleri üretimde allowlist ve yetki sınırı dışında erişilemez olmalıdır.

## İş Dosyası ve Finansal Yaşam Döngüsü

- Immutable Job File: agreement snapshot, teklif/price guarantee, değişiklik emri, expense kanıtı, completion proof, cancellation, dispute, settlement ve audit timeline.
- İptal, kısmi refund, provider payable, escrow ve komisyon hareketleri çift taraflı ledger, idempotency ve gateway callback doğrulamasıyla uzlaştırılabilir olmalıdır.
- Müşteri/profesyonel kararları, deadline, hold ve insan inceleme akışları mutabık durum makinesi ile enforce edilmelidir.

## Gizlilik, İletişim ve Yerelleştirme

- Mesaj görünümünden silme, hesap/export/erasure istekleri, retention, legal hold ve immutable audit kayıtları uygulanmalıdır.
- Maskeli iletişim ve PII redaksiyonu varsayılan olmalıdır.
- 13 dil, cihaz yereli, tarih/para biçimleme, fallback, RTL düzeni ve güvenli on-demand mesaj çevirisi desteklenmelidir.

## AI, Türkiye Gold Master ve Ürün Dikeyleri

- MoveAI metin/görsel/ses girdilerinden onay gerektiren service-request taslağı üretmeli; model çıktısı policy/capability denetiminden sonra uygulanmalıdır.
- Türkiye Gold Master: kategori, hizmet, capability, belge, fiyat/komisyon, vergi ve jurisdiction verileri sürümlü seed/import modeline bağlanmalıdır.
- Live location, safety, support, claims/insurance, tax, kurumsal filo ve profesyonel cockpit yüzeyleri sahiplikli API sınırlarıyla çalışmalıdır.

## Operasyon, Release ve Doğrulama

- MoveOS: MFA/Super Admin, controlled publish/rollback, feature flag, compliance review, case queue, audit trail ve operations control.
- Upload security: MIME/magic-byte, boyut, malware scan state, quarantine, storage purpose/retention.
- SBOM, lisans, SCA, secret scan, structured/redacted logging, APM fail-closed, backup/restore ve store privacy/release gate.
- Son gate: TypeScript, lint, migration, full regression, iOS/Android/web export, authorization/HTTP E2E ve gerçek dış servis/cihaz bağımlılıklarının açık blocker raporu.
