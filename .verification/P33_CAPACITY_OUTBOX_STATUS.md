# P33 Marketplace Capacity and Opportunity Outbox Status

| Requirement | Implemented source behavior | Evidence class | Status |
|---|---|---|---|
| Provider capacity default | Missing/null/invalid `maxConcurrentActiveJobs` resolves to one; no client capacity input can allow a transition. | Unit | `COMPLETED_AND_VERIFIED` |
| Offer winner + capacity | Offer acceptance locks the provider row, counts active jobs, applies capacity before the conditional pending→active request update, then preserves the one-winner offer conflict guard. | Source contract | `CODE_READY_NOT_CONFIGURED` |
| Migration-first capacity | 0090 column is selected `FOR UPDATE` when present. Only unknown-column error falls back to locked default-one behavior; unrelated SQL errors propagate. | Source contract | `CODE_READY_NOT_CONFIGURED` |
| Capacity admin mutation | `providerCapacity.setMaxConcurrentActiveJobs` requires Super Admin plus session-bound MFA; invalid values and unapplied 0090 fail closed. | Router contract | `COMPLETED_AND_VERIFIED` |
| Request-create outbox | Only `MARKETPLACE_OUTBOX_RUNTIME=private_staging` **and** `MARKETPLACE_OUTBOX_ENQUEUE_ENABLED=true` create bounded idempotent in-app intents in the request transaction. Default is off. | Source contract | `CODE_READY_NOT_CONFIGURED` |
| Delivery safety | In-app delivery rechecks current request status/unassigned state and central provider eligibility; changed requests are server-revoked rather than delivered/retried. | Source contract | `COMPLETED_AND_VERIFIED` |
| Cancellation/enforcement revoke | No-payment/refund/partial-refund cancellation and suspend/block enforcement revoke queued/processing intents inside their writer transaction. Delivered records are not remotely revocable; deep-link access must recheck server authorization. | Source contract | `COMPLETED_AND_VERIFIED` |
| Worker lifecycle | Worker remains explicit private-staging opt-in, bounded no-overlap loop, in-app-only. It has no push/SMS/email route. | Existing worker contract | `COMPLETED_AND_VERIFIED` |
| TiDB migration/race/delivery | 0090–0092 and outbox tables/leases have not been verified on isolated same-engine TiDB; worker not enabled; no test intent, in-app record or external delivery exists. | External infrastructure | `EXTERNAL_BLOCKER` |

## Recorded Tests

| Command | Result |
|---|---|
| `pnpm vitest run tests/provider-capacity-policy.test.ts tests/p33-capacity-offer-contract.test.ts tests/p33-rating-reconciliation-admin-contract.test.ts` | PASS — 3 files / 10 tests. |
| `pnpm vitest run tests/opportunity-notification-policy.test.ts tests/opportunity-outbox-worker-contract.test.ts tests/p33-outbox-lifecycle-contract.test.ts` | PASS — 3 files / 11 tests. |
| `NODE_OPTIONS=--max-old-space-size=1792 pnpm exec tsc --noEmit --skipLibCheck` | PASS. |

No migration, private TiDB DDL/DML, worker start, notification send, real push/SMS/email, production data, credential, country/capability activation or publish operation occurred.
