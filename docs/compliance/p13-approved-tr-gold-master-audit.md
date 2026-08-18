# P13 Approved TR Gold Master Source Audit

## Authoritative source boundary

P13 için tek Türkiye hukuki kaynak paketi, kullanıcı tarafından sağlanan
`MoveFix_TR_Gold_Master_Approved_Source_Pack.zip` içindeki
`TR-GOLD-2026-08-13-v1.0` paketidir. Paket birlikte doğrulanacak üç kaynaktan
oluşur:

| Kaynak | Rol | Kullanım sınırı |
|---|---|---|
| `TR_Gold_Master_Country_Pack_v1.json` | Makine-okunur katalog, kural ve durum verisi | Uygulama eşlemesi ve seed girdisi |
| `TR_Official_Source_Registry_v1.json` | Resmî kaynak kaydı | Kaynak bağlantısı ve sürüm izi |
| `TR_Gold_Master_Country_Pack_v1.md` | İnsan-okunur kapsam ve karar açıklaması | JSON ile çapraz doğrulama |

## Doğrulanmış paket sınırları

- `country_code`: `TR`
- Paket sürümü: `TR-GOLD-2026-08-13-v1.0`
- JSON hizmet girdileri: `cleaning`, `plumbing`, `electrical`, `painting`,
  `air_conditioning`, `heating`, `moving`, `locksmith`, `towing`,
  `roadside_assistance`, `courier`, `furniture`, `automotive`.
- Pakette bulunmayan bir hizmet eşlemesi veya hukuki/belge zorunluluğu
  türetilmeyecek; durum `UNKNOWN` veya `LEGAL_REVIEW_REQUIRED` olarak
  fail-closed kalacaktır.
- Paketin bulunması veya seed edilmesi, country launch gate'i otomatik olarak
  etkinleştirmez. Ayrı legal approval, runtime credential ve operasyonel
  launch ön koşulları korunur.

## P13 uygulama ilkesi

Her aktif katalog girdisi için uygulama, yalnız bu pakete bağlı,
sürümlü ve kaynak kimliği taşınan açık bir requirement state üretmelidir.
`NOT_REQUIRED` yalnız paketin açık ve gözden geçirilmiş bir kararıyla
geçerlidir; null, eksik eşleme veya kayıp jurisdiction `NOT_REQUIRED`
anlamına gelmez.
