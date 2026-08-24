# US-CA-LOS_ANGELES Production Allowlist

**CHECKPOINT A kararı:** `CHECKPOINT_A_REVIEW_REQUIRED`  
**Production allowlist:** **Boş**  
**Capability allowlist:** **Boş**

| Kapsam | State | Zorunlu bloklayıcılar |
|---|---|---|
| 62/62 canonical coverage | `BLOCKED_PENDING_GATES` / `BLOCKED` | Source, local legal, connector, assurance, release ve country gate |
| 28 source | `SOURCE_UNVERIFIED` | İmzalı counsel review ve official source verification yok |
| 28 connector | `NOT_CONFIGURED` | İzin/sözleşme/API/authorization evidence yok; scraping yasak |
| 12 legal locale | `DRAFT_MACHINE`, runtime `0` | Legal + independent linguist approval yok |
| 26 credential shell | `UNCLASSIFIED`, extraction `0` | Issuer/registry status evidence yok |
| Active provider transition | 0 satır | Owner ledger, notice evidence ve eligible coverage yok |
| US country deployment | `SCAFFOLD_ONLY`, feature gate `0` | Country activation preflight tamamlanmadı |

AI/OCR yalnız belge alanı çıkarabilir. Hiçbir AI/OCR sonucu `AUTHORITY_VERIFIED`, registry match, revocation check veya connector authorization sayılmaz. Public web sayfası erişimi otomatik connector değildir.
