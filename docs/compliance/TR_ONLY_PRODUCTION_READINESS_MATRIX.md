# Türkiye-Only Production Readiness Matrix

**Durum:** `READINESS_BLOCKED` — Bu belge bir yayın veya ürün release onayı değildir.  
**Source of truth:** 0089 `country_market_controls`, legacy country launch gate ve server-derived policy evaluator.

| Gate | Server-derived kanıt | Durum | Effective-state etkisi |
|---|---|---|---|
| TR-only runtime allowlist | TR control `inAppProductionAllowlisted=1`; diğer tüm countries `0` | PASS (allowlist) | Tek başına açmaz |
| Non-TR closure assertion | CN/DE/JP/US `INFRA_ONLY`; RU `INFRA_ONLY_NO_GO` | PASS | Tek başına açmaz |
| TR country shell | `countryShellEnabled=0` | BLOCKED | Runtime gate kapalı |
| TR jurisdiction enablement | `jurisdictionEnabled=0` | BLOCKED | Runtime gate kapalı |
| Consumer discovery | `consumerDiscoveryEnabled=0` | BLOCKED | Discovery kapalı |
| Provider onboarding | `providerOnboardingEnabled=0` | BLOCKED | Onboarding/activation kapalı |
| Booking/offers | `bookingEnabled=0` | BLOCKED | Yeni booking/offer kapalı |
| Payments/payouts | `paymentsEnabled=0` | BLOCKED | Payment/payout kapalı |
| Production reachability | `productionStateReachable=0` | BLOCKED | Deployment gate kapalı |
| Türkiye legal source | Blok 1 source state UNVERIFIED | BLOCKED | Capability allowlist yok |
| Local legal approval | `LEGAL_SOURCE_APPROVAL` yok | BLOCKED | Effective ACTIVE yok |
| Official connector/manual authority | Yetkili connector kanıtı yok | BLOCKED | Effective ACTIVE yok |
| TR legal locale | Approved production locale/ledger yok | BLOCKED | Legal surface kapalı |
| Capability allowlist | Three Block 1 capability NO-GO | BLOCKED | ACTIVE capability 0 |
| Payment/external credentials | Final integration gate | EXTERNAL BLOCKER | Effective ACTIVE yok |
| Scanner | External production acceptance/gate | EXTERNAL BLOCKER | Effective ACTIVE yok |
| Security/regression | Internal regression PASS; release evidence external tamamlanmamış | PARTIAL | Effective ACTIVE yok |
| Physical device E2E/signing | Cihaz/store signing kanıtı yok | EXTERNAL BLOCKER | Effective ACTIVE yok |
| Monitoring/backup/rollback | Release change-record/runbook kabulü yok | BLOCKED | Effective ACTIVE yok |
| Owner release ledger | Bu görevde oluşturulmadı | BLOCKED | `READY_PENDING_OWNER_APPROVAL`/ACTIVE yok |
| Store distribution | `TR_ONLY_PLANNED`; mağaza yayın işlemi yapılmadı | NOT EXECUTED | Store release yok |

## Effective State Kuralı

`desiredState=ACTIVE` yalnız owner intent alanıdır. Server, tüm satırlar ve ayrı owner release ledger geçerli olmadıkça `effectiveState=ACTIVE` üretmez. Bu checkpoint’te TR satırı **`desired=ACTIVE`, `effective=READINESS_BLOCKED`, `requiresRevalidation=1`** olarak doğrulanmıştır. Owner panelinde ACTIVE/publish eylemi sunulmaz; yalnız reason + MFA ile `PAUSED` ve `EMERGENCY_DISABLED` talebi yapılabilir.

## Production Allowlist

**Boş.** Effective ACTIVE country yoktur. Türkiye runtime allowlist adayının `1` olması yayın demek değildir; yukarıdaki çoklu server-side blocker zinciri tüm marketplace transition’larını reddeder.
