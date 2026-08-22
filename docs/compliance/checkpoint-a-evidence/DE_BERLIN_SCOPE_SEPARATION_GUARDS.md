# Germany/Berlin — Scope Separation Guards

**Scope:** CHECKPOINT A evidence only.  
**Rule:** No discovery source, catalog label, provider declaration or AI/OCR result creates a legal requirement binding, credential requirement or eligibility result.

> Every Berlin policy row remains `BLOCKED`; every credential/scope/issuer/expiry field without external counsel verification remains `UNKNOWN`; every source remains `SOURCE_UNVERIFIED`. This document records negative guards, not legal interpretations.

| Scope separation to preserve | Guard enforced at CHECKPOINT A | Evidence consequence |
|---|---|---|
| Meisterbrief / Handwerksrolle | No blanket Meisterbrief or Handwerksrolle requirement is attached to any capability. Business, technical manager, exemption and activity scope remain `UNKNOWN`. | `DE-HWO` has `NO_REQUIREMENT_BINDING_CREATED`; all related rows blocked. |
| Employee / owner / company representative | Provider operating model and credential subject are not inferred from the catalog. | Matrix fields remain `UNKNOWN`; profile is `PROFILE_INCOMPLETE`. |
| NAV / NDAV / AVBWasserV | No national blanket installer-list rule is generated; network/utility zone and operator are unresolved. | `DE-NAV-13`, `DE-NDAV-13`, `DE-AVBWASSERV-12` remain discovery-only; connector is pending. |
| Moving / freight | Vehicle weight, domestic/international route, cargo, driver and operator are not merged into one credential rule. | Matrix has no freight requirement binding; `DE-BALM-GUETERVERKEHR` is unverified. |
| Courier / postal | Postal-service versus ordinary-cargo scope is not inferred from service labels. | `DE-POSTG-2024` and `DE-BNETZA-POST-DIRECTORY` have no capability binding. |
| Locksmith | Simple opening, security, metal/carpentry and electrical-installation scopes are not equated. | No credential or source mapping is created automatically. |
| Towing / roadside / automotive repair | Towing, roadside assistance and repair scope are separate catalog tasks and no shared legal requirement is asserted. | No Berlin requirement binding; existing Türkiye tow capability remains untouched. |
| Cleaning | Standard, biocidal, asbestos, hazardous, industrial and high-rise cleaning are not collapsed into a single classification. | No automated requirement or credential is generated. |
| Furniture delivery / assembly / carpentry | Delivery, ready assembly and custom carpentry remain distinct catalog capability candidates. | No shared requirement binding is created from a label match. |

## Enforced Negative Assertions

1. `legal_requirements.authoritative=0`; all Berlin requirements are `UNKNOWN` / `SOURCE_UNVERIFIED` / `PENDING`.
2. The 79-row matrix records `required_credential_type=UNKNOWN`, `issuer_authority=UNKNOWN` and `source_id=UNBOUND_SOURCE_UNVERIFIED`; it cannot authorize a provider.
3. `verification_connectors.forbidden_scraping=1`; no connector call, lookup, CAPTCHA/login automation, cache or stale-result acceptance exists.
4. `CountryDeploymentPolicy` rejects `SCAFFOLD_ONLY` before any evidence condition can produce an activation result.

## External Review Needed

Only an appropriately qualified independent Berlin/Germany legal or compliance reviewer may decide whether a particular scoped activity should bind to an official source, credential type, issuer and permitted verification surface. That decision must be recorded in the external review fields and an immutable approval ledger; it is **not** made by this document.
