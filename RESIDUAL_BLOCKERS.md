# Residual Blockers

| Blocker | Why it remains open | Required independent evidence |
|---|---|---|
| Isolated TiDB migration/runtime | No approved same-engine private staging connection exists in this session. | Sanitized preflight, ledger/schema checks, scoped synthetic run, cleanup evidence. |
| 0090–0097 migrations | Candidates are source-reviewed only and have not been applied. | Explicit owner approval after private TiDB preflight. |
| Transaction/race proof | Source contracts cannot prove TiDB lock/isolation behavior. | Same-engine concurrency test with synthetic run ID. |
| Outbox worker and delivery | Worker remains default-off; no external delivery path exists. | Explicit private-staging enablement and in-app-only lifecycle evidence. |
| Physical camera/AR | No verified native adapter and no iOS/Android physical accuracy proof. | Supported devices, permissions/tracking tests, measured accuracy protocol. |
| Authenticated role route E2E | No isolated role fixtures/TiDB environment is available. | Legitimate synthetic customer/provider/admin sessions and route screenshots/logs. |
| Payment/SMS/email/push | Credentials and provider-side test approval are intentionally absent. | Sandbox credentials and provider acceptance/delivery evidence. |
| Legal/release/country gates | No legal source approval or product release approval was provided. | Independent lawful approvals; no AI/self-approval. |

The current classification remains **C — NOT PRODUCTION READY / NO-GO**.
