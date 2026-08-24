# Release-Readiness Queue While Isolated TiDB Is Pending

| Priority | Work item | Status now | Evidence required to close |
|---:|---|---|---|
| P0 | `image-size` resolution | `OPEN_UPSTREAM_RISK` | Fixed Expo/upstream version or reviewed override; `pnpm audit --audit-level=high` with zero high advisories; exports and full regression. |
| P1 | Opportunity outbox atomic enqueue/revoke | `PARTIAL` | Additive code review/test now; transaction/revoke proof after isolated TiDB is ready. |
| P1 | Multi-capability partial deactivation | `PARTIAL` | API/UI contract tests now; lifecycle integration proof after isolated TiDB is ready. |
| P1 | Payment dispute/webhook negatives | `PARTIAL` | Internal idempotency/signature/currency tests now; sandbox gateway proof remains credential-blocked. |
| P1 | Account security / admin MFA | `PARTIAL` | Internal audit and negative tests now; physical/MFA delivery evidence remains external. |
| P2 | Loading/empty/error and component accessibility | `PARTIAL` | Render tests now; route E2E/contrast screenshots after TiDB plus owner physical device evidence. |
| P2 | Document workflow / MoveOS data contracts | `PARTIAL` | Authorization/audit tests now; scanner and real admin workflow evidence later. |
| P3 | Privacy text, retention, country seed, i18n | `BLOCKED_LEGAL_APPROVAL` / `PARTIAL` | Approved legal copy/sources; no country activation before approvals. |
| Store | Export/permissions/deep-link evidence | `PARTIAL` | Current export toolchain evidence exists; signed builds and physical E2E remain external. |

## TiDB Handoff Checklist

Supply only a private **isolated staging** declaration: `DATABASE_URL` target details through the secure environment mechanism, host class (`127.0.0.1` or private network), port, a database name containing `test`/`staging`, and written confirmation of zero production data. The migration candidate will be regenerated from the current schema; deleted historical 0090/0091 files will not be applied. No production connection, token, or real user data is acceptable.
