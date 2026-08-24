# MANUS Master Fix Directive — Atomic Execution Plan

## P0.1 — image-size advisory

**Status:** `BLOCKED_UPSTREAM_PATCH`  
**Finding:** Current advisory sources identify the affected range through `image-size@2.0.2`; the reported patched `2.0.3` version is not available in the upstream advisory chain. An override to a non-existent or unverified version would not be a safe mitigation. Expo SDK upgrades remain a separate compatibility project and must not be used as an untested security workaround.

**Safe next evidence:** track Expo/Metro release notes and the upstream advisory; when a fixed version exists, perform a bounded dependency change with `pnpm audit --audit-level=high`, Expo Doctor, TypeScript, lint, build, web/iOS/Android export and full regression. Until then, retain the high-risk release blocker and document dev-server exposure limits.

**Weekly watch scheduling:** `BLOCKED_NOT_DEPLOYED`. The managed scheduler requires a deployed project, but the current user instruction prohibits publish/deploy. No schedule was created and no publish action was attempted. A weekly watch can be created only after an explicit deployment decision that does not contradict the release NO-GO posture, or the upstream status can be checked manually in future sessions.

## P0.2 — same-engine migration

**Status:** `BLOCKED_STAGING_RUNTIME`  
**Minimum owner-provided resource:** an isolated TiDB/MySQL host, unique non-production database, native backup/checksum mechanism and a visual test backend. No production host, credential or data may be reused.

## P1 execution order

| Order | Item | Safe current action | Completion evidence |
|---:|---|---|---|
| 1 | P1.4 marketplace negatives | Add source/unit negative tests for ownership, stale capability and deny paths. | Targeted tests plus full regression. |
| 2 | P1.7 account audit | Audit MFA/session/re-auth and add deterministic suspicious-login policy tests if absent. | Targeted tests plus security report. |
| 3 | P1.8 admin MFA | Audit existing admin auth boundary; implement only if a local fail-closed factor challenge can be preserved without credential fabrication. | Negative bypass/re-auth tests. |
| 4 | P1.1 outbox lifecycle | Implement atomic/revoke logic only with a transaction-safe schema plan; label runtime proof blocked until isolated TiDB. | Unit/source contract tests, then isolated DB integration. |
| 5 | P1.2 capability lifecycle | Add capability-independent policy/lifecycle tests; UI changes only after server contract is clear. | Per-capability allow/deny tests. |
| 6 | P1.3/P1.5/P1.6 | Prepare tests and run only against isolated same-engine runtime and verified gateway sandbox. | Concurrency, webhook, dispute and ledger evidence. |

All P2/P3 work remains deferred until the P0/P1 execution evidence is either PASS or explicitly blocked by the stated resource. No status label permits country/capability activation, production migration, credential reading or release.
