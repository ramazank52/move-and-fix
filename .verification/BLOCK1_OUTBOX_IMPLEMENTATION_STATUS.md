# Block 1 — Opportunity Outbox Implementation Status

**Baseline:** `1a5683e8`  
**Migration:** `0092_zippy_stone_men.sql` — reviewed additive candidate, **NOT APPLIED**.

## Implemented Source Contracts

| Control | Status | Detail |
|---|---|---|
| Idempotent intent key | IMPLEMENTED | Existing `opportunity:{type}:{requestId}:{providerId}` unique key retained. |
| Claim / lease | IMPLEMENTED | Queued due rows are conditionally changed to `processing` under a UUID claim token and 60-second lease. |
| In-app only delivery | IMPLEMENTED | Explicit worker writes generic provider inbox notification; no push, SMS, email or external call. |
| Retry / backoff | IMPLEMENTED | Exponential retry with capped delay; after five attempts status becomes `dead_letter`. |
| Revoke | IMPLEMENTED | Queued/processing rows may be marked `revoked` by request/provider with a reason code. |
| PII minimisation | IMPLEMENTED | Generic Turkish title/body plus `{ requestId, deepLink }`; no customer contact or address field. |
| Automatic worker | NOT ENABLED | No cron/process/scheduler is registered before reviewed migration and private staging runtime evidence. |
| Transactional request-create enqueue | PENDING | Requires same-engine migration/runtime to integrate safely into request transaction. |
| Cancel/suspend lifecycle wiring | PENDING | Requires DB-backed lifecycle integration and isolated tests. |

## Source Evidence

Targeted policy/wiring/worker tests: **3 files / 7 tests PASS**. TypeScript (1792 MB), Drizzle check and `git diff --check` PASS. These are not DB transaction race, actual in-app inbox, route E2E, physical device or external-delivery PASS results.

## Apply Gate

Do not apply 0092 until owner supplies a verified private staging TiDB declaration. On that environment only: backup/checksum → migration integrity → apply 0092 → rerun lease/retry/revoke/IDOR integration tests → record rollback. Production, country/capability state, external delivery and publish remain out of scope.
