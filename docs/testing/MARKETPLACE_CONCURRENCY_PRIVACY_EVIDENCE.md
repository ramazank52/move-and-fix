# Marketplace Concurrency, Ownership and Privacy Evidence

**Baseline:** `821fc685`

| Check | Result | Evidence boundary |
|---|---|---|
| Central eligibility call sites | PASS — 3 files / 7 tests | Source-contract test verifies exposure, offer create, offer accept and job-start paths reference the server-owned evaluator. |
| Outbox payload minimisation | PASS — policy/unit | Intent contains request/provider IDs, reason and protected internal deep-link only; no SMS/email sender is present. |
| Provider/capability denial logic | PASS — policy/unit | Unknown/suspended/unavailable/expired conditions deny through the central evaluator. |
| Concurrent offer/assignment transaction | BLOCKED_TIDB_RUNTIME | Requires applied 0090/0091 migrations and an isolated same-engine TiDB database; no remote or production DB was used. |
| Outbox request-create atomicity | PENDING | Outbox schema/helper is ready but request transaction wiring must be integration-tested against local TiDB before activation. |
| Cancel/suspend revoke | PENDING | Revoked intent format exists; lifecycle hooks require transaction/outbox integration validation. |
| IDOR/BOLA and provider detail privacy | PARTIAL | Existing authorization suite remains applicable; new matching rows need isolated DB integration evidence after migration application. |

No runtime route is promoted to PASS by these tests. There was no external notification delivery, database migration application, provider fan-out or country/capability activation.
