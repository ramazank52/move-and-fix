# P24 — Moderation Runtime Compatibility Gate

**Baseline:** `20420bcb` plus uncommitted P24 reviewer-lifecycle source work.  
**Decision:** `CODE_READY_NOT_APPLIED` / `EXTERNAL_BLOCKER`.

The reviewed candidates `0094_tiny_zombie.sql` and `0095_regular_black_crow.sql` define the canonical moderation record, immutable decision evidence, and optimistic-concurrency version column. They remain unapplied because no owner-declared isolated private-staging TiDB exists.

> Joining public review/profile queries to `user_content_moderation_records` before 0094 is applied would turn an unverified remote schema into a runtime outage. The approved-only repository filter is therefore intentionally blocked pending the same-engine preflight, ledger/schema confirmation, migration apply authorization, and post-apply integration proof.

| Item | Source status | Runtime status | Required next evidence |
|---|---|---|---|
| Reviewer queue and decision contract | Implemented with Super Admin MFA, self-review prohibition, reason-code allowlist, idempotency and version guard | Not runnable without 0094/0095 tables | Isolated TiDB migration and negative transaction tests |
| Public approved-only review join | Design fixed; not wired to an absent table | Blocked to prevent schema-compatibility outage | 0094/0095 applied in private staging, then query/count/deep-link integration evidence |
| Rating aggregate reconciliation | Not implemented | Blocked behind approved-only source of truth | Same-engine transaction and reconciliation dry-run evidence |
| Country/capability state | Unchanged | NO-GO/default-off retained | Separate legal/release gates |
