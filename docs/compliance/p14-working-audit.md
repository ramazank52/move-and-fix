# P14 Working Audit

**Authoritative instruction:** `/home/ubuntu/upload/MOVEFIX_P14_VERIFIED_RESIDUAL_CLOSURE_v2(1).md`  
**Declared baseline:** `7c8a618f23642693e63b40bed1471bb133b37758`  
**Scope:** Only 18 independently confirmed residual findings. Preserve P13 baseline behavior; no fabricated credentials, scanner clean result, legal approval, payment result, GPS result or registry result.

## Mandatory execution controls

- Verify HEAD exactly equals the declared baseline before changes; otherwise stop.
- For each finding, run targeted tests. If a finding fails, do not build subsequent changes upon it; mark it `BLOCKED_INTERNAL` and record root cause.
- Log a one-line live status for every finding in the final P14 report, especially P0 items.
- Never edit prior migrations. Use additive migration `0065+` only where required.

## Mandatory dependency order

1. P14-02 canonical service catalog
2. P14-01 Gold Master capability to category/subcategory mapping
3. P14-04 dynamic credential catalog
4. P14-06 country launch gate runtime enforcement
5. P14-03 provider onboarding E2E
6. P14-05 admin/reviewer document view
7. P14-13 job safety fail-closed
8. P14-12 completion dispute partial resolution
9. P14-16 MoveAI canonical resolver
10. P14-07 country/jurisdiction UX
11. P14-08 expense file UI/chat entry
12. P14-09 approved 13-language set
13. P14-10 full i18n closure
14. P14-11 chat translation metadata
15. P14-14 privacy center
16. P14-15 email/phone staged verification
17. P14-17 package/sample hygiene
18. P14-18 dependency audit gate

## Extracted P0 acceptance boundaries

### P14-02 — Canonical service catalog

The database service catalog is the only canonical source. Preserve existing IDs; implement explicit legacy/external aliases. Ambiguous aliases must resolve to `AMBIGUOUS_SERVICE_MAPPING` and fail closed. Stable identity must flow across request, matching, provider, compliance, credentials, safety, MoveAI, expense/job capsule and admin. Static categories must not act as a production fallback.

### P14-01 — Gold Master mapping

Gold Master service scopes must use explicit stable mappings to real canonical category/subcategory IDs. No display-name inference. Unmatched mappings must stay `MISSING_SERVICE_CATALOG_MAPPING` / BLOCK / LEGAL_REVIEW_REQUIRED, never create orphan active capabilities. Seed remains idempotent and preserves approved-source provenance/version.

### P14-04 — Dynamic credential catalog

Complete the source-provenanced credential definition and requirement model. Preserve dynamic behavior rather than reverting to four hard-coded document types. Requirements must be keyed by jurisdiction/service/subservice/capability/provider type and have explicit state/provenance/rule version. Unknown stays fail-closed.

### P14-03 — Provider onboarding

Provider lifecycle must remain server-authoritative: profile → jurisdiction → canonical service → capability → dynamic credentials → review → activation. A provider without category, valid launch gate, requirements or verified credentials must not activate; a provider can only edit its own onboarding data and retains customer capabilities.

### P14-05 — Reviewer document access

Owner-only document access must remain owner-only. Add a distinct reviewer/admin protected access decision with explicit reviewer permission, applicable MFA/re-auth, clean quarantine state, non-destructive deletion, retention/legal-hold allowance, short-lived signed URL, no raw storage key, no-store approach and an audit event. Customer access is always denied; pending/quarantined/infected files never receive normal signed content URLs.

### P14-06 — Country launch runtime gate

Use a single server-side country launch eligibility assertion on request creation, provider activation, opportunity exposure, offer submit, offer acceptance and payment initiation. Disabled, pending, legal-review or unknown gate state blocks new transitions; historical records remain readable. Country compliance seed does not enable marketplace launch by itself.

### P14-07 — Server-driven country UX

Replace a hard-coded TR-only runtime selector with a public-safe backend launch registry DTO (`countryCode`, localized name/key, UI-safe state). Device locale/IP is only a suggestion. User chooses delivery country explicitly; disabled/unsupported selections show a clear localized blocking state and cannot bypass server controls.

### P14-08 — Expense file and chat entry

Extend the existing expense form rather than rewriting its backend: category, amount/currency, description, date/time, vendor, brand, model, quantity, receipt/invoice media, separate product image, optional video and location linkage. Keep media roles distinct; expense creation does not create payment debt or charge. Chat shows an expense-file entry only in a related request/job context; customers see shared ledger read-only under policy.

### P14-09 — Exact initial language set

Initial languages must be exactly `TR, EN, DE, FR, AR, RU, ZH, HI, ES, PT, BN, ID, JA`. Remove `IT, NL, FA, UK` from runtime initial selection (resources may remain future-optional); add `HI, BN, ID, JA`. Frontend, backend, preference and message translation use one shared set; Arabic RTL remains intact and unsupported stored preferences fall back safely.

### P14-10 — Full user-facing i18n closure

Move production user-facing hard-coded Turkish/English strings in app/components to shared translation keys. Preserve backend/legal truth, localize plural/date/currency/number formatting, do not fabricate legal translations, avoid raw-key production fallback, test Arabic RTL, and add a narrowly allowlisted CI guard for newly hard-coded user-facing strings.

### P14-11 — Chat translation metadata and preference

Original message remains authoritative and never gets replaced by translation. Complete source-language provenance, provider/model/version metadata and persistent auto-translate preference in translation service/router/cache, user preference schema, chat/settings UI and tests. Preserve existing show-original/original-hash behavior.

## P13 behavior explicitly preserved

Chat participant PII cleanup; closed raw manuscript-storage access; canonical OTP redirect; scanner durable outbox/callback security; canonical environment contract; MoveAI fallback removal; quarantine; owner document access; ledger/idempotency/payment fail-closed behavior; P13 migrations and passing regressions.
