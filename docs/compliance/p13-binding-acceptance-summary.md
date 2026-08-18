# P13 Binding Acceptance Summary

**Source:** User-supplied `Pasted_content_02.txt`, lines 1–500, reviewed on 2026-08-18.

## Non-negotiable controls

The P12 baseline must not be rewritten, security boundaries must not be loosened, and any remaining internal P0/P1 finding requires a final **C — NOT PRODUCTION READY** decision. No credential, legal rule, payment, scan, GPS, price, provider, or external result may be fabricated.

## P0 compliance requirement state

The service-request compliance context must use a machine-readable explicit requirement state: `REQUIRED`, `CONDITIONAL`, `NOT_REQUIRED`, `PROHIBITED`, `UNKNOWN`, `JURISDICTION_UNRESOLVED`, `PACKAGE_UNAVAILABLE`, `CAPABILITY_UNMAPPED`, and `LEGAL_REVIEW_REQUIRED`. Only reviewed and versioned `NOT_REQUIRED` permits a transaction without a provider credential. All unresolved, unmapped, unknown, prohibited, unavailable, and legal-review states block new marketplace transactions. Legacy rollout status may be read-only history only.

## P0 Turkish Gold Master coverage

`TR-GOLD-2026-08-13-v1.0` is the sole approved Turkish compliance source. Every active category/subcategory needs an explicit versioned rule state. Source absence is `UNKNOWN → BLOCK`; no legal rule may be inferred. Capability records must be tied to the real service catalog, source links and rule versioning must remain traceable, and source seeding must never automatically enable the country launch gate.

## P0 onboarding and credentials

Professional onboarding must move through server-resolved operating geography, operating model, service/subservice/capability, service area, availability, credential/business/vehicle/insurance/safety prerequisites, review, and activation. Client-supplied category, capability, and verification status are not authoritative. A generic credential-definition/requirement catalog replaces a fixed four-document model and must drive the server and UI.

## P0 secure documents and scanner orchestration

Raw storage routes stay closed. Provider document access must be authenticated, authorized, quarantine/retention checked, audited, short-lived, no-store, and must never expose raw storage keys to an unauthorized customer, provider, or admin role. A scanner callback alone is insufficient: uploads must create durable scan work through a `MediaScannerAdapter`, remain pending until an authenticated clean result, and fail closed when external scanner configuration is absent.
