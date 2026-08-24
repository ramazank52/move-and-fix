# Marketplace Eligibility & Matching Gap Audit

**Baseline:** `1422ff63`  
**Scope:** Read-only review of current server surfaces. No route, database, country or capability state changed.

| Surface | Existing server control | Gap against new acceptance criteria |
|---|---|---|
| Opportunity listing | `getNewJobsForProvider` verifies legacy provider category, availability/verification, approved source mapping, country transition, capability state, credential eligibility and radius. | Category-first candidate query; no reusable eligibility decision, no explicit provider enforcement/suspension, structured service-area, scope-constraint, capacity or Job Safety evaluation. |
| Offer creation | Country transition, capability, credential and P11 policy eligibility are checked. | Request open/unassigned state, provider availability/enforcement, service area/radius, scope constraints, safety and transaction-level duplicate protection are not centrally guaranteed. |
| Customer offer acceptance | Transactional pending-request guard, country/capability/credential/P11 checks and conditional assignment exist. | No central re-evaluation of availability, scope, capacity, service area or Job Safety under one decision object. |
| Opportunity detail / update / job start | Some protected procedures and lifecycle policies exist. | New requirement demands the same shared eligibility service at every listed transition; current controls are distributed and cannot be proven equivalent. |
| Notifications | Existing notification services/outbox abstractions exist. | No demonstrated capability-filtered, idempotent opportunity distribution/revocation chain attached to request lifecycle. |

## Required Additive Direction

Introduce a single server-owned eligibility evaluator that consumes only database/policy state and returns an explainable allow/deny result. It must be invoked before list exposure, offer create/update, selection, accept and start. Any unknown policy, expired/pending credential, capability suspension, unavailable/enforced provider, mismatched jurisdiction/scope/service area or safety failure must deny. Mutation paths must use conditional transaction writes/idempotency keys rather than preflight-only checks.

Country transition remains the first fail-closed gate. The evaluator must never convert existing `READINESS_BLOCKED`, `SOURCE_UNVERIFIED` or approval-gated scope into an active marketplace decision.
