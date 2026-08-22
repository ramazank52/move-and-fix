# Germany/Berlin — Verification Connector Gap Report

**Scope:** CHECKPOINT A only. This report records four discovery shells created by migration 0086. It does not test, call, scrape, authenticate to, or certify any external registry.

> All connector rows remain `PENDING`, assurance `NONE`, authorization evidence `NULL`, and `forbidden_scraping=1`. No connector can contribute an `AUTHORITY_VERIFIED` signal.

| Connector ID | Intended official authority / registry | Known official web location | Exact API / registry endpoint | Verification mode | Access permission | Connector state |
|---|---|---|---|---|---|---|
| `DE_HANDWERKSKAMMER_REGISTRY` | Relevant Handwerkskammer / Handwerksrolle | No single Berlin endpoint has been approved in this scaffold | `NOT_DISCLOSED_OR_UNVERIFIED` | `MANUAL_AUTHORITY_REVIEW_CANDIDATE` | `NOT_REQUESTED_OR_VERIFIED` | `PENDING` |
| `DE_UTILITY_INSTALLER_REGISTRY` | Relevant network/utility operator’s installer list | Source anchor `DE-NAV-13`; specific zone/operator remains unresolved | `NOT_DISCLOSED_OR_UNVERIFIED` | `MANUAL_AUTHORITY_REVIEW_CANDIDATE` | `NOT_REQUESTED_OR_VERIFIED` | `PENDING` |
| `DE_BALM_FREIGHT_REGISTRY` | Federal Office for Logistics and Mobility (BALM), freight-related authority surface | `https://www.balm.bund.de/DE/Service/FragenAntwortenFAQ/FragenAntwortenGueterverkehr/fragenantwortengueterverkehr.html` | `NOT_DISCLOSED_OR_UNVERIFIED` | `MANUAL_AUTHORITY_REVIEW_CANDIDATE` | `NOT_REQUESTED_OR_VERIFIED` | `PENDING` |
| `DE_BNETZA_POST_REGISTRY` | Bundesnetzagentur postal-provider directory | `https://www.bundesnetzagentur.de/DE/Fachthemen/Post/Anbieterverzeichnis/artikel.html` | `NOT_DISCLOSED_OR_UNVERIFIED` | `MANUAL_AUTHORITY_REVIEW_CANDIDATE` | `NOT_REQUESTED_OR_VERIFIED` | `PENDING` |

## Per-Connector Acceptance Gap

| Connector ID | Terms / legal basis | Expected returned fields | Person/business/vehicle/scope matching | Expiry/suspension/revocation | Rate limit / cache / recheck | Staging / production | Outage / stale behavior | Why still NO-GO |
|---|---|---|---|---|---|---|---|---|
| `DE_HANDWERKSKAMMER_REGISTRY` | `UNKNOWN_PENDING_AUTHORITY_REVIEW` | `UNKNOWN` | Not implemented | Not implemented | No connector call; no cache; stale result never accepted | No configured environment | Fail closed: `OFFICIAL_CONNECTOR_UNAVAILABLE` | Territorial registry, authorized surface, fields, terms and matching rules unverified |
| `DE_UTILITY_INSTALLER_REGISTRY` | `UNKNOWN_PENDING_AUTHORITY_REVIEW` | `UNKNOWN` | Not implemented; network/utility zone must be resolved first | Not implemented | No connector call; no cache; stale result never accepted | No configured environment | Fail closed: `OFFICIAL_CONNECTOR_UNAVAILABLE` | No blanket Germany rule; operator/zone, registry, authorization and fields unverified |
| `DE_BALM_FREIGHT_REGISTRY` | `UNKNOWN_PENDING_AUTHORITY_REVIEW` | `UNKNOWN` | Not implemented; vehicle weight, route, cargo, driver/operator need legal model | Not implemented | No connector call; no cache; stale result never accepted | No configured environment | Fail closed: `OFFICIAL_CONNECTOR_UNAVAILABLE` | No approved endpoint/contract and no verified matching model |
| `DE_BNETZA_POST_REGISTRY` | `UNKNOWN_PENDING_AUTHORITY_REVIEW` | `UNKNOWN` | Not implemented; postal-provider versus ordinary cargo scope must be reviewed | Not implemented | No connector call; no cache; stale result never accepted | No configured environment | Fail closed: `OFFICIAL_CONNECTOR_UNAVAILABLE` | Directory/API scope and permitted verification workflow unverified |

## Anti-Scraping / Authority-Verification Evidence

1. `verification_connectors.forbiddenScraping` is seeded as `1` for all four rows.
2. The application has **no configured connector adapter, endpoint URL, credential, authorization hash, connector run, cache entry, browser automation or CAPTCHA/login workflow** for these rows.
3. The current policy requires `approvedConnectorAvailable=true` before a country activation preflight can pass. `PENDING` does not satisfy that condition.
4. OCR/AI is not a connector, cannot prove registry status, and cannot change this report’s state.

## Required External Evidence Before Any Status Change

For each connector, an authorized implementation must have a recorded authority/issuer agreement or documented permitted access method; exact endpoint and field contract; identity/business/vehicle/scope matching rules; expiry/suspension/revocation semantics; rate/cache/recheck policy; outage policy; sandbox/production separation; and a cryptographic or audit evidence reference. Until then, this report remains a **gap register**, not a connector specification.
