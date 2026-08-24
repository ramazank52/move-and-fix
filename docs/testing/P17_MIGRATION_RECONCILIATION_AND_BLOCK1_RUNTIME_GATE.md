# P17 — Migration Reconciliation and Block 1 Runtime Gate

**Baseline checkpoint:** `d25a5be4`  
**Assessment date:** 2026-08-24  
**Decision:** **BLOCKED — PRIVATE_STAGING_TIDB_REQUIRED**  
**Scope:** Salt-okunur reconciliation; no `db:push`, no migration apply, no credential, no country/capability state change, no publish/deploy.

> `pnpm drizzle-kit check` validates only the tracked Drizzle metadata. It is not evidence that a migration ran, that a private TiDB ledger contains an entry, or that a remote schema has the expected table.

## 1. Current tracked migration reconciliation

| Migration | SHA-256 | Intent | Dependency and current decision |
|---|---|---|---|
| `0090_marketplace_provider_capacity.sql` | `e0273af852e7849caff202aedd5c2c87185a3e091f9221960dbf55cc1a581326` | Adds `providers.maxConcurrentActiveJobs` with default `1`. | **DO NOT APPLY AUTOMATICALLY.** Marketplace capacity now fails closed from active assignment state and does not rely on this unapplied column; a previous remote compatibility regression makes automatic application unsafe. |
| `0091_bumpy_ozymandias.sql` | `b5db93deb60b83500bd319ec27bfe328950d96335263bf6c8e1d2567536126ad` | Creates `marketplace_opportunity_notifications`, its unique idempotency key, and provider/request indexes. | Required only if the isolated TiDB ledger shows it absent **and** schema introspection proves the table absent. |
| `0092_zippy_stone_men.sql` | `c955002a780df40833330710d4b74fed415b9c9a551b93efc4dd8ca6a2eb647c` | Extends the 0091 table with processing/lease/retry/dead-letter fields and claim index. | Depends on the table created by 0091 or an exactly equivalent, verified existing table. **Not applied.** |

Migration journal entries are present as indexes **90–92** with tags `0090_marketplace_provider_capacity`, `0091_bumpy_ozymandias`, and `0092_zippy_stone_men`. The repository also contains `0091_snapshot.json` and `0092_snapshot.json`; the former defines the table and the latter alters the same table by adding the lease/retry fields. `pnpm drizzle-kit check` completed successfully on this tracked metadata.

## 2. 0091/0092 duplicate-table risk assessment

`0091` executes `CREATE TABLE marketplace_opportunity_notifications`. `0092` contains no `CREATE TABLE`; it changes the existing `status` enum, adds `attemptCount`, `nextAttemptAt`, `claimToken`, `claimedAt`, `claimUntil`, `lastErrorCode`, and `deliveryNotificationId`, then creates the claim index. Therefore, **0092 does not duplicate-create the table in tracked SQL**.

The real risk is environment ledger/schema divergence. Applying `0091` where the table already exists would fail with a duplicate-table error. Applying `0092` where the table does not exist, or where its columns/indexes are not 0091-compatible, would fail or produce an unreviewed state. Neither outcome may be bypassed by hand-writing a migration-ledger record, forcing a migration, or suppressing an error.

## 3. Required isolated TiDB preflight and conditional sequence

No owner-approved private-staging TiDB host, database name, ledger output, backup/checksum, or schema introspection has been supplied. Consequently, the actual `_drizzle_migrations` history and `SHOW CREATE TABLE` output are **NOT OBSERVED**. The following is a conditional runbook, not an approval to execute it.

| Verified private-staging finding | Only permitted next action | Prohibited action |
|---|---|---|
| 0091 and 0092 ledger entries absent; table absent | After backup, apply **0091**, introspect, then apply **0092**, introspect again. | Applying 0090 by default; `db:push`; ledger edits. |
| 0091 ledger entry present; 0092 absent; table exactly matches 0091 snapshot | After backup, apply **0092**, then inspect the resulting table/indexes. | Reapplying 0091. |
| Table exists but 0091 ledger entry is absent | Stop and classify `SCHEMA_LEDGER_DIVERGENCE`; regenerate/review an additive migration only after owner decision. | Applying 0091 over the table or inserting a ledger row. |
| 0092 ledger entry present | Compare `SHOW CREATE TABLE` with 0092 snapshot; make no migration change if compatible. | Reapplying 0091/0092. |
| 0090 absent | Keep capacity source behavior schema-independent unless an explicitly reviewed, isolated-staging capacity plan is approved. | Applying 0090 as part of the outbox sequence. |

The preflight must verify an isolated private host, a database name containing `staging` or `test`, zero production data, and an owner-provided synthetic run identifier. It must capture a scoped backup/checksum and the ledger result before any migration. No production endpoint, production data, or secret belongs in evidence.

## 4. Block 1 source evidence versus required runtime evidence

The current source provides idempotent intent construction, a unique key, claim/lease, retry/dead-letter, an in-app notification insert, default-off private-staging worker startup, and transaction-local `REQUEST_ASSIGNED` revoke during offer acceptance. Targeted source contracts at the baseline are **3 files / 9 tests PASS**. These do **not** constitute TiDB transaction, race, RBAC/IDOR, delivery, or migration-runtime proof.

| P17 requirement | Current status | Closure evidence still required |
|---|---|---|
| Request-create atomic enqueue and rollback | BLOCKED | Real private TiDB integration tests proving all eligible intents commit/rollback with request creation. |
| `REQUEST_CANCELLED` revoke | NOT_IMPLEMENTED_RUNTIME | Transactional cancel hook plus real TiDB test. |
| `PROVIDER_SUSPENDED` revoke | NOT_IMPLEMENTED_RUNTIME | Transactional enforcement/suspend hook plus real TiDB test. |
| `REQUEST_ASSIGNED` revoke | SOURCE_IMPLEMENTED / RUNTIME_UNPROVEN | Same-engine transaction/race integration proof. |
| Worker revoke race, two-worker claim, crash recovery | SOURCE_PARTIAL / RUNTIME_UNPROVEN | Deterministic TiDB concurrency and recovery tests. |
| DB-level idempotency under concurrent enqueue | SOURCE_PARTIAL / RUNTIME_UNPROVEN | Concurrent TiDB integration test and single-delivery assertion. |
| In-app adapter, target, persistent notification and response ID | SOURCE_PARTIAL / RUNTIME_UNPROVEN | TiDB integration test of persistent in-app row and failure path. |
| RBAC/IDOR on provider notification data | NOT_EVIDENCED | Protected read/mutation surface design and negative integration tests; internal worker helpers must remain non-public. |
| Deep-link and PII allowlist | SOURCE_PARTIAL | Test for opaque-ID-only allowlisted route and exclusion of customer/address/contact/token/location/message fields. |
| Full suite, install, typecheck, lint, build, Drizzle and TiDB tests | NOT_RERUN_FOR_P17 | Clean-environment complete evidence after the isolated TiDB block is runnable. |

Push/SMS/email delivery and physical device push evidence remain **EXTERNAL_BLOCKED_PENDING_CREDENTIALS_AND_DEVICE_E2E**. They must never be represented as internal in-app delivery PASS.

## 5. Block 1 gate and next owner action

**Block 1 is not closed.** `MARKETPLACE-3` and the P17 Block 1 closure items remain unchecked; work must not enter Block 2. Türkiye stays `READINESS_BLOCKED` / `SOURCE_UNVERIFIED` / NO-GO, all other country/capability states remain default-off, and no release approval is inferred.

When ready, the owner must provide only the approved isolated private-staging declaration through the secure environment mechanism. The declaration must state host class, port, database name with `staging`/`test`, zero production data, and approval for scoped synthetic tests. The first execution will be preflight-only: sanitized environment classification, `_drizzle_migrations` query, `SHOW CREATE TABLE`, scoped backup/checksum, and a stop-on-divergence decision. It will not run `db:push`, production SQL, real notification adapters, or country activation.

## 6. Evidence source inventory

| Artifact | Reviewed state |
|---|---|
| `drizzle/0090_marketplace_provider_capacity.sql` | Tracked, unapplied candidate. |
| `drizzle/0091_bumpy_ozymandias.sql` | Tracked, unapplied table creation candidate. |
| `drizzle/0092_zippy_stone_men.sql` | Tracked, unapplied outbox extension candidate. |
| `drizzle/meta/_journal.json` | Entries 90–92 present. |
| `drizzle/meta/0091_snapshot.json` | Base outbox schema after 0091. |
| `drizzle/meta/0092_snapshot.json` | Same table extended with 0092 lease/retry fields. |
| Private-staging `_drizzle_migrations` ledger | **BLOCKED — no isolated environment declaration.** |
| Private-staging `SHOW CREATE TABLE` output | **BLOCKED — no isolated environment declaration.** |
