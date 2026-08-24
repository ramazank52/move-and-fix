# Isolated TiDB & Final Release Directive Reconciliation

**Current baseline:** `a39011cc`  
**Directive references:** `b266dc7b`  
**Environment provided in this task:** None. No remote host, database name, user or connection string has been supplied.

## Critical Reconciliation

| Directive instruction | Current project reality | Safe status |
|---|---|---|
| Apply `0090_marketplace_provider_capacity` | That planned migration was removed after it caused provider queries to reference a column absent from the current remote schema. | `DO_NOT_APPLY` |
| Apply `0091_bumpy_ozymandias` | The outbox migration history was cleaned because the schema/migration snapshots were stale and generated migrations were not safe to apply. | `DO_NOT_APPLY` |
| Use isolated same-engine TiDB | Required for migration, race and full DB-backed route evidence. A named empty staging database and private host are required. | `BLOCKED_STAGING_RUNTIME` until user supplies verified isolated connection details. |
| Run `pnpm drizzle-kit migrate` | Must run only after an updated, reviewed, additive migration set exists and preflight confirms local/isolated non-production host/database. | `BLOCKED_MIGRATION_REVIEW_REQUIRED` |
| Publish/store submission | Explicitly prohibited by current instruction and existing release NO-GO. | `NOT_AUTHORIZED` |

## Required Environment Declaration

The owner must provide a connection declaration stating: **environment=isolated test/staging**, host class (localhost/private network), port, database name containing `test` or `staging`, and a confirmation of zero production data. Do **not** provide a production credential. When supplied, the existing harness preflight will reject production markers and verify the declared host before any write.

## Safe Work Sequence

1. Rebuild a reviewed additive migration candidate from the then-current schema; never resurrect deleted 0090/0091 files just because an older directive names them.
2. Capture native backup/checksum of the isolated database, run Drizzle integrity check, and only then apply the reviewed migration candidate.
3. Run same-engine provider.nearby, offer/assignment race, outbox idempotency/revocation, capacity and route-level RBAC regressions.
4. Record exact before/after/orphan counts and rollback SQL. Destroy the isolated environment after evidence collection.

## Final Release Directive Classification

P0 migration/race evidence is blocked by the absent isolated environment. P1.4 negative unit/source coverage is PASS at `a39011cc`; other P1 lifecycle, concurrency, finance and admin-MFA items remain partial or blocked pending implementation/review. P2 native physical evidence and P3 legal/source/activation remain blocked. The directive cannot reduce current NO-GO status to credentials alone because legal, migration, dependency-risk and physical-runtime evidence also remain open.
