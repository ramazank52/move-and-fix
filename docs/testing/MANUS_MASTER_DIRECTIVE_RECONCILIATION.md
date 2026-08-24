# MANUS Master Fix Directive — Fail-Closed Reconciliation

**Baseline:** `abf555f3`  
**Interpretation:** The directive is treated as a binding engineering backlog, but no item is promoted to PASS without its named evidence. Existing country/capability NO-GO, legal approval, credential, migration and physical-device limits remain authoritative.

| Directive item | Current classification | Reason and next safe action |
|---|---|---|
| P0.1 `image-size` high advisories | `PARTIAL` | Two high transitive advisories remain. Audit current Expo/upstream availability first; only then consider a bounded override with license/build regression. |
| P0.2 isolated migration | `BLOCKED_STAGING_RUNTIME` | No local TiDB/MySQL/container/TiUP and remote DB has production marker. Same-engine isolated host is required. |
| P1.1 outbox atomic/revoke | `PARTIAL` | Eligibility/outbox policy exists; atomic request-create and revoke lifecycle are not proved. Requires additive code plus isolated DB integration proof. |
| P1.2 multi-capability lifecycle | `PARTIAL` | Per-capability policy exists but partial deactivation lifecycle/UI proof is open. |
| P1.3 concurrency/capacity/fairness | `BLOCKED_STAGING_RUNTIME` | Requires transaction-level same-engine race tests; runtime capacity field was deliberately removed pending safe migration. |
| P1.4 negative marketplace security | `PARTIAL` | Source/unit contracts exist; must add IDOR/BOLA, stale capability and ownership negatives. |
| P1.5 dispute/settlement | `EXTERNAL_CONFIGURATION_REQUIRED` | Ledger contracts exist; verified gateway transaction/webhook lifecycle cannot be simulated as real payment evidence. |
| P1.6 webhook concurrency | `PARTIAL` | Signature/idempotency contracts exist; concurrent DB-backed webhook regression needs isolated runtime. |
| P1.7 account security audit | `PARTIAL` | MFA/session/re-auth contracts exist; suspicious-login concrete rules remain to be audited/implemented. |
| P1.8 mandatory admin MFA | `PARTIAL` | Rate/authorization controls exist; mandatory one-time second factor plus critical-operation re-auth requires a focused implementation audit. |
| P2 external providers | `EXTERNAL_CONFIGURATION_REQUIRED` | Existing fail-closed register/runbook is present; no secret will be requested or read. |
| P2 native/theme evidence | `BLOCKED_PHYSICAL_DEVICE` / `BLOCKED_STAGING_RUNTIME` | No isolated TiDB visual runtime; native device proof is owner/external evidence. |
| P2 UX/document workflow | `PARTIAL` | Existing error/document/security contracts must be audited before narrow code work; no hand-drawn test UI will be accepted. |
| P3 legal/country seed | `BLOCKED_LEGAL_APPROVAL` | No approved legal text/source approval or activation authority. |
| P3 i18n/MoveOS | `PARTIAL` | Requires a bounded static-string and admin real-data audit after P0/P1 are concluded. |

> No country, capability, credential, production record, migration or release action was taken during reconciliation.
