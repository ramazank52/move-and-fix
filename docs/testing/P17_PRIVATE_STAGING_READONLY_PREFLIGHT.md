# P17 — Private-Staging Salt-Okunur Preflight

**Baseline:** `50adea22`  
**Assessment date:** 2026-08-24  
**Decision:** **BLOCKED — NO_VERIFIED_PRIVATE_STAGING_CONNECTION_AVAILABLE**

> Bu rapor yalnız configuration ve source preflightıdır. `db:push`, `drizzle migrate`, DDL/DML, outbox worker, test fixture veya gerçek integration testi çalıştırılmamıştır.

## 1. Sanitized connection-configuration result

| Read-only control | Result | Evidence boundary |
|---|---|---|
| Task config search: `tidb` | No match | No TiDB connector/config entry was present in the current task snapshot. |
| Task config search: `DATABASE_URL` | No match | No project-config entry with that variable name was present. Secret values were not read or printed. |
| Database connectors | No eligible enabled TiDB/MySQL staging connector observed | Disabled generic database connectors do not establish a private-staging connection. |
| Runtime connection classification | NOT EXECUTED | Without a verified, owner-declared isolated target, opening a connection could touch an unknown environment and is therefore fail-closed. |

This result does not assert that an unseen platform-managed secret never exists. It asserts that no **verified, declared private-staging TiDB target** is available to authorize a read-only database preflight. No production or unknown connection was attempted.

## 2. Required environment variables

| Variable | Required now | Expected use | Preflight constraint |
|---|---:|---|---|
| `DATABASE_URL` | Yes | MySQL/TiDB connection string consumed by `server/_core/env.ts`. | Must resolve to the owner-declared isolated `staging`/`test` database only; value is never logged. |
| `MARKETPLACE_OUTBOX_WORKER_ENABLED` | No | Enables the outbox timer only when exactly `true`. | Must stay unset or non-`true` during preflight. |
| `MARKETPLACE_OUTBOX_RUNTIME` | No | Allows worker start only when exactly `private_staging`. | Must stay unset/non-matching during preflight. |
| `MARKETPLACE_OUTBOX_WORKER_INTERVAL_MS` | No | Optional bounded worker interval. | Not used in preflight because the worker must not start. |

## 3. Required private-staging platform contract

The database must be an **isolated TiDB staging cluster**, not a local mock, SQLite database, production host, production database, shared customer-data environment, or an undeclared endpoint. It must run a maintained TiDB release with MySQL 8-compatible SQL semantics required by the repository’s Drizzle MySQL dialect, including transactional DML, `information_schema`, `SHOW CREATE TABLE`, `ALTER TABLE`, indexes, JSON and timestamp support. The exact runtime value from `SELECT VERSION()` is mandatory preflight evidence; no version has been observed or accepted yet.

| Account | Minimum privilege set | Use |
|---|---|---|
| Preflight-only account | `USAGE`, `SELECT` on the isolated schema and readable `information_schema`; any narrowly required `SHOW` privilege permitted by the provider. | `SELECT VERSION()`, `SELECT DATABASE()`, ledger read, `information_schema` and table/index inspection only. |
| Migration executor (later, separate) | The least schema privileges needed for the approved plan: `CREATE`, `ALTER`, `INDEX`, plus ledger write only where Drizzle requires it. | Never used in this preflight; never granted `SUPER`, global administration, production-schema access, or broad data privileges. |
| Synthetic integration account (later, separate or tightly scoped) | Transactional `SELECT`/`INSERT`/`UPDATE`/`DELETE` only on isolated staging tables needed by test-run-ID-scoped data. | Never used before owner approval; no broad delete, truncate, or production access. |

All connections must use encrypted transport with certificate/hostname verification, a private network/allowlisted endpoint, a unique non-production database name containing `staging` or `test`, and credentials supplied only through the managed secret mechanism. TiDB documents TLS client/server configuration and SQL privilege management separately; these official references are the authoritative operational baseline.[1] [2]

## 4. Short owner-side creation checklist

1. Provision a private TiDB staging target with **zero production data** and a database name such as `movefix_staging_20260824`.
2. Apply only the tracked schema/migration history under an approved staging change process; do not copy production customer data.
3. Create the distinct least-privilege preflight account described above and restrict network access to the authorized sandbox/private network path.
4. Configure TLS and verify the server certificate chain and hostname before authorizing application connectivity.[1]
5. Place only the staging `DATABASE_URL` into the managed secret interface. Do not send its value in chat, source files, logs, reports, or command lines.
6. Provide an owner declaration stating host class, port, staging database name, zero production data, and approval for the **read-only preflight only**.

## 5. Next allowed operation after owner declaration

The first database action remains read-only: environment classification, `SELECT VERSION()`, `SELECT DATABASE()`, `_drizzle_migrations` ledger read, `information_schema` table/column/index inspection, and a non-executed conditional migration plan. The operation must stop immediately when the host/database is production-like, database name lacks `staging`/`test`, 0090 appears as a pending candidate, the 0091/0092 ledger/schema relationship drifts, or any identity/ownership check is inconclusive.

No migration, worker start, fixture write, outbox delivery, country/capability activation, production integration, or Block 2 work is authorized by this report.

## References

[1]: https://docs.pingcap.com/tidb/stable/enable-tls-between-clients-and-servers/ "TiDB Docs — Enable TLS Between TiDB Clients and Servers"
[2]: https://docs.pingcap.com/tidb/stable/privilege-management/ "TiDB Docs — Privilege Management"
