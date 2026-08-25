# P33 Review and Rating Reconciliation Status

| Requirement | Implemented source behavior | Evidence class | Status |
|---|---|---|---|
| Review + pending moderation | Review, request-owner/completed/assigned-provider checks, pending moderation record and content hash execute in one transaction. | Source contract | `CODE_READY_NOT_CONFIGURED` |
| Review duplicate race | Unique request duplicate recovery rereads canonical review only for the same owner/provider and requires its moderation row; any missing row/schema remains fail-closed. | Source contract | `CODE_READY_NOT_CONFIGURED` |
| Approved-only aggregate | Pure aggregate accepts only `{providerId,rating}` records, validates 1–5 integer ratings and creates deterministic aggregates. | Unit | `COMPLETED_AND_VERIFIED` |
| Deterministic dry run | PII-minimal plan emits aggregate count, plan hash and schema fingerprint; plan hash changes on aggregate/schema drift. | Unit | `COMPLETED_AND_VERIFIED` |
| Persisted aggregate | Additive 0097 creates `provider_rating_aggregates`, synchronizes legacy tenths rating only during guarded apply, and records source plan hash. | Source + unapplied migration | `CODE_READY_NOT_CONFIGURED` |
| Apply safeguard | `ratingReconciliation.applyRun` requires Super Admin role plus session-bound MFA, explicit expected plan/schema hashes and run key. DB apply additionally requires `RATING_RECONCILIATION_RUNTIME=private_staging`; default is fail-closed. | Router contract | `COMPLETED_AND_VERIFIED` |
| Resume/idempotency/audit | Run ledger has unique run key, batch size cap, monotonic checkpoint, terminal idempotency return and PII-minimal operational event metadata. | Source contract | `CODE_READY_NOT_CONFIGURED` |
| Real DB race/apply | 0094/0095/0097 are not applied; no private TiDB exists for transaction, stale-plan, duplicate-key or resume runtime proof. | External infrastructure | `EXTERNAL_BLOCKER` |

## Recorded Tests

| Command | Result |
|---|---|
| `pnpm vitest run tests/p29-review-moderation-atomic-contract.test.ts tests/rating-reconciliation.test.ts tests/p33-rating-reconciliation-admin-contract.test.ts` | PASS — 3 files / 12 tests. |
| `NODE_OPTIONS=--max-old-space-size=1792 pnpm exec tsc --noEmit --skipLibCheck` | PASS. |
| `pnpm drizzle-kit check` | PASS — `Everything's fine`. |

No migration, private TiDB DDL/DML, production data, reconciliation apply run, worker start, credential, country/capability activation, external notification or publish operation occurred.
