# P15 Faz 3 — Legal & Privacy Infrastructure Closure

**Baseline:** P15 Faz 2 çalışma alanı  
**Tarih:** 20 Ağustos 2026  
**Durum:** **B — INTERNAL CONTROLS VERIFIED; LEGAL APPROVAL EXTERNAL GATE**

## Güvenli tasarım kararı

Bu fazda şirket unvanı, veri sorumlusu kimliği, iletişim bilgileri, yürürlük tarihi veya İngilizce hukuk metni **uydurulmadı**. Bunun yerine `LegalDocumentCatalog` her belgeyi version, locale, effective date ve SHA-256 `contentHash` alanlarıyla kaydeder; eksik hukuk verisini aşağıdaki makine-okunur placeholder’larla açıkça release blocker yapar:

```text
LEGAL_ENTITY_NAME_REQUIRED
DATA_CONTROLLER_IDENTITY_REQUIRED
LEGAL_CONTACT_REQUIRED
LEGAL_APPROVAL_REQUIRED
```

`auth.legalDocumentManifest` public endpoint’i manifest ve `LEGAL_APPROVAL_REQUIRED` release gate sonucunu sunar. Bu endpoint eksik metni yayımlanmış/onaylı gibi göstermemektedir.

## Belge ve consent yaşam döngüsü

| Konu | Uygulama | Güvenlik durumu |
|---|---|---|
| Zorunlu yüzeyler | TR/EN için Kullanım Koşulları, Gizlilik, KVKK/Data Processing Notice, Çerez, Hesap & Veri Silme, Destek, Topluluk/Provider Kuralları, Yasaklı Hizmetler, Ödeme/İptal/İade/Uyuşmazlık manifestte kayıtlıdır. | EN veya şirket kimliği eksik belge `LEGAL_APPROVAL_REQUIRED`; onay uydurulmaz. |
| Versiyonlama | Her entry locale, version, effective date, content hash, publication ve approval durumu taşır. | Hash yalnız mevcut içerik için üretilir; olmayan metne hash/etkin tarih verilmez. |
| Legal re-consent | Mevcut immutable `consent_events` ledger’ı latest event+document version üzerinden zorunlu legal re-consent’i saptar; `confirmCurrentLegalConsents` yalnız eksik güncel anahtar setini kabul eder. | Kısmi, eski veya fazla anahtarlı kabul reddedilir. |
| Marketing/IYS ayrımı | `marketing_platform` ayrı consent key/purpose ile `auth.marketingConsent` ve `auth.setMarketingConsent` üzerinden yazılır. | Varsayılan **kapalı**; legal/transactional kabulden türetilmez; withdrawal yeni immutable event yaratır. |
| Hesap/veri silme | Privacy Center’daki mevcut owner-only export/deletion ve re-auth akışı korunmuştur; konuyla ilgili legal manifest yüzeyi eklenmiştir. | Legal approval olmadan production legal ilanı yapılamaz. |

## Yeni/korunan API sözleşmeleri

| Endpoint | Yetki | Davranış |
|---|---|---|
| `auth.legalDocumentManifest` | Public | Versioned manifest + fail-closed legal release gate |
| `auth.pendingLegalConsents` | Authenticated owner | Geçerli sürümü kabul edilmemiş zorunlu consent’ler |
| `auth.confirmCurrentLegalConsents` | Authenticated owner | Tam olarak current outstanding seti immutable olarak kaydeder |
| `auth.marketingConsent` | Authenticated owner | Son marketing tercih; hiç event yoksa `enabled: false` |
| `auth.setMarketingConsent` | Authenticated owner | Açık opt-in veya withdrawal; source `privacy_center_marketing_preference` |

## Test ve kalite kanıtı

| Komut | Gerçek sonuç |
|---|---|
| `pnpm vitest run tests/legal-document-catalog.test.ts tests/legal-consent-preferences-router.test.ts tests/auth-local-security.test.ts` | PASS — 3 dosya / 21 test |
| `pnpm lint && pnpm build && pnpm test` | PASS — **105 test dosyası / 639 test**, lint PASS, backend bundle PASS (`dist/index.js`, 891.6 kB) |

Testler; TR/EN zorunlu surface envanterini, hash metadata’yı, unresolved legal release gate’i, EN metnin onaylı gösterilmemesini, marketing default-off davranışını, owner-only mutation’ı ve anonymous rejection’ı kapsar.

## Kalan gerçek release gate’leri

| Gate | Neden |
|---|---|
| Onaylı TR/EN metinleri | Gerçek legal entity, data controller, iletişim ve yetkili hukuk onayı repository’de yoktur. |
| Jurisdictional yayın/onay | Nihai effective date ve yayın onayı hukuk sahibi tarafından verilmelidir. |
| IYS/marketing sağlayıcı operasyonu | İletişim/marketing delivery credential’ları yoktur; preference ledger provider delivery yerine geçmez. |

Bu faz, eksik hukuki bilgiyi gizlemek veya otomatik onaylamak yerine fail-closed release gate olarak korur.
