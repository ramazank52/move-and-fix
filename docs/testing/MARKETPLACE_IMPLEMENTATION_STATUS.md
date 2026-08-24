# Marketplace Matching & Opportunity Delivery Implementation Status

**Implementation baseline:** `12137287`  
**Database application:** Not performed. Migrations `0090_marketplace_provider_capacity` and generated/reviewed `0091_bumpy_ozymandias` remain unapplied by this task.

| Requirement | Implementation status | Evidence / boundary |
|---|---|---|
| Single server eligibility decision | `IMPLEMENTED` | `ProviderEligibilityService` is fail-closed; `assertProviderMarketplaceEligibilityForRequest` derives country, request state, verification, availability, enforcement/suspension, capacity, capability, credential, scope, service-area and safety facts from server records. |
| Opportunity exposure | `IMPLEMENTED` | `getNewJobsForProvider` no longer has a provider-category-only filter and calls the central decision per candidate. |
| Offer create / accept re-check | `IMPLEMENTED` | Existing paths now invoke the same central decision immediately before their prior country/capability/credential controls. |
| Provider capacity | `IMPLEMENTED_PENDING_MIGRATION` | `providers.maxConcurrentActiveJobs` default 1 is additive in schema/0090; active assignments are counted against it. |
| Opportunity outbox model | `IMPLEMENTED_PENDING_MIGRATION` | 0091 defines idempotent, in-app-only, PII-minimised notification intent rows; policy and db enqueue helper exist. |
| Request-create atomic enqueue | `PENDING` | Requires wiring within the request transaction with a transaction-aware eligibility snapshot/outbox write; not claimed complete. |
| Cancel/suspend revoke | `PENDING` | Outbox supports revoked intent, but request/provider lifecycle hooks have not yet been wired. |
| Multi-capability provider UI/API lifecycle | `PENDING` | Existing profiles are preserved; no broad UI rewrite made in this implementation slice. |
| External delivery | `NOT_CONFIGURED` | No push/SMS/email provider call is made or claimed. |

## Verification

`tests/provider-marketplace-eligibility.test.ts` (3) and `tests/opportunity-notification-policy.test.ts` (2) passed. `drizzle-kit check`, TypeScript (1792 MB) and `git diff --check` passed. Tests validate policy logic only; no isolated TiDB integration, DB migration application, actual provider fan-out or external notification delivery has occurred.
