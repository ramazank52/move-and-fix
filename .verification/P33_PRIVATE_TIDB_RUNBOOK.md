# P33 Private TiDB Migration and Runtime Runbook

> **Status: NOT EXECUTED.** This runbook is for a project-owner-approved, isolated, synthetic-data-only TiDB staging environment. It must never be pointed at a production host, production database, production credentials, or real user data.

## Preconditions

| Check | Required state |
|---|---|
| Engine | TiDB/MySQL-compatible staging engine, not SQLite or PostgreSQL. |
| Isolation | Host and database name clearly denote private staging; production marker check passes. |
| Data | Synthetic records only, tagged by one unique `test_run_id`. |
| User grants | Least privilege: schema introspection, migration DDL, and scoped DML only. |
| Side effects | `MARKETPLACE_OUTBOX_WORKER_ENABLED` remains false until schema ledger/preflight and test plan are approved. |
| External services | No real payment, push, SMS, email, scanner or network delivery credentials. |

## Read-only Preflight

Run only after owner supplies the configured private-staging environment through the project secret mechanism. Do not print `DATABASE_URL`.

1. Verify hostname/database are non-production and database naming contains `staging` or an approved isolated marker.
2. Read `SELECT VERSION(), DATABASE()` and sanitized `_drizzle_migrations` ledger entries.
3. Inspect `information_schema` for 0090 capacity column, 0091 outbox table, 0092 lease/dead-letter fields, 0093 timezone, 0094/0095 moderation, 0096 measurement, and 0097 rating aggregate/run tables.
4. Stop without DDL if ledger/schema drift, a production marker, or an incomplete dependency order is detected.

## Permitted Migration Sequence Only After Explicit Owner Approval

1. Apply in journal order, never `db:push`: `0090`, `0091`, `0092`, `0093`, `0094`, `0095`, `0096`, `0097`.
2. Take an engine-native backup/snapshot and record migration hashes before each batch.
3. Do not apply `0092` without `0091`, or `0095` without `0094`.
4. Verify schema and ledger after each migration before creating scoped synthetic fixtures.

## Scoped Runtime Verification

Create synthetic customer/provider/request/review records marked with `test_run_id`; use a `try/finally` cleanup that deletes only rows bearing that run ID. Validate capacity winner races, review/moderation rollback, rating dry-run/apply checkpoint resume, measurement owner/BOLA lifecycle, outbox claim/lease/revoke/dead-letter and server recheck on open. Keep the worker off unless the explicit private-staging variables are both enabled and the test plan is approved.

## Cleanup and Evidence

Record pre/post counts, run ID, migration ledger, schema facts, test assertions, cleanup count and orphan count. Expected orphan count is zero. Do not use `TRUNCATE`, broad `DELETE`, production data or any external delivery.
