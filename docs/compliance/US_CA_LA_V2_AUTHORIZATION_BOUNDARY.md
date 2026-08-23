# US-CA-LOS_ANGELES v2 Yetkilendirme Sınırı

**Durum:** CHECKPOINT A — default-off / read-only scaffold  
**Kapsam:** US coverage, requirement, source, connector, issuer, evidence ve policy kayıtları.

US v2 tabloları için provider, customer veya public client’a tRPC write procedure eklenmemiştir. Bu durum yalnız bir tasarım beyanı değildir: `tests/us-ca-la-v2-authorization.test.ts`, uygulama router’ında country coverage, requirement, source, connector veya issuer state’ini yazabilecek prosedür bulunmadığını regresyon olarak kontrol eder.

| Alan grubu | Client/provider yazma yüzeyi | Başlangıç durumu | Sonuç |
|---|---|---|---|
| US service coverage | Yok | `MAPPED_BLOCKED` / `BLOCKED_PENDING_GATES` | Provider değiştiremez |
| Requirement bundle/source binding | Yok | `AI_RESEARCHED_UNVERIFIED` | Provider source state üretemez |
| Connector/issuer shell | Yok | `NOT_CONFIGURED` / `UNVERIFIED` | Connector yetkisi uydurulamaz |
| Localized legal version | Yok | `DRAFT_MACHINE`, runtime selectable `0` | Makine metni kullanıcıya çıkmaz |
| Coverage policy decision | Yok | `BLOCKED` / `SELF_ASSERTED` | Verified/active statü yok |
| Active-provider transition | Yok | Satır `0` | Owner ledger + notice kanıtı olmadan pencere açılmaz |

Mevcut provider capability profile API’si ayrı Türkiye Blok 1 korumaları altında kalır; bu yeni US v2 kayıtlarına dolaylı veya doğrudan yazım yapmaz. Server-side `assertCountryCoverageTransition` yalnız okur ve `COUNTRY_COVERAGE_BLOCKED:*` hatasıyla fail-closed davranır; mevcut country launch gate’i ayrıca `US` country shell `SCAFFOLD_ONLY` olduğu için marketplace transition’ını reddeder.

> TiDB trigger kullanmadığından, append-only/role ayrımı uygulama katmanı, dar router yüzeyi, immutable event tabloları ve negatif regresyonlarla uygulanır. Bu checkpoint hiçbir sistem role grant’i, external connector credential’ı veya production release mekanizması eklemez.
