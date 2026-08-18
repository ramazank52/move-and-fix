# P13 Uygulama ve Denetim Planı

Bu plan, `Pasted_content_02.txt` içindeki bağlayıcı P13 kabul kriterleri ile onaylı `TR-GOLD-2026-08-13-v1.0` paketinin birlikte okunmasına dayanır.

| Öncelik | Kabul kriteri | Uygulama sınırı |
|---|---|---|
| P0 | Compliance resolver'da null/fail-open semantiğini kaldır | Yeni talep, teklif, kabul ve iş durumu değişiminde yalnız explicit `NOT_REQUIRED` veya doğrulanmış gereksinim geçebilir; `UNKNOWN`, jurisdiction/package/capability çözümleme hataları, legal-review ve prohibited block olur. |
| P0 | Gold Master katalog kapsaması | Her aktif kategori/alt kategori için sürümlü rule state ve source link gerekir. Kaynakta aktif katalogda olmayan ya da eşleşmeyen kayıt otomatik onaylanmaz. |
| P0 | Profesyonel onboarding | Hizmet/capability çözümlemesi yalnız server-authoritative katalogdan yapılır; tamamlanmamış profil opportunity, offer ve assignment alamaz. |
| P0 | Dinamik credential modeli | Dört sabit belge türü yerine credential definition + requirement kaynaklı, capability/jurisdiction bağlı model kullanılır. |
| P0 | Güvenli belge erişimi | Sahiplik, review scope, quarantine, retention ve audit kontrolü olmadan belge erişimi verilmez; raw key veya kalıcı genel URL dönülmez. |
| P0/P1 | Scanner orkestrasyonu | Upload sonrası pending-scan, dayanıklı iş, provider adapter, imzalı callback, bounded retry/dead-letter ve fail-closed `NOT_CONFIGURED` sözleşmesi gerekir. |

> Bu plan bir hukuki kural veya lansman onayı değildir. Kaynak paketinin `legal_review` statüsü korunur; country launch gate yalnız ayrı, MFA-korumalı ve doğrulanmış operasyon kararıyla değişebilir.
