# Germany/Berlin — Authorization Boundary and Türkiye Isolation Evidence

**Scope:** CHECKPOINT A only. **Status:** No provider, owner or admin country activation endpoint was added in this checkpoint.

> TiDB/MySQL has no PostgreSQL Row-Level Security feature in this deployment. Therefore there is **no RLS policy to claim or test**. Authorization is enforced in the existing server/tRPC layer, and all new country-scaffold records are server-policy data with no new provider-facing write procedure. This is a technology boundary, not a substitute claim for RLS.

## State-write Boundary

| State family | Provider write path | Country scaffold write path introduced in CHECKPOINT A | Evidence / outcome |
|---|---|---|---|
| Provider declaration/profile fields | Existing owner-bound `provider.setCapabilityProfile` input only | None | Owner identity is passed server-side; anonymous caller is rejected |
| Source verification | No provider input | None | Provider cannot send a verified source state; Berlin rows are `SOURCE_UNVERIFIED` |
| Legal / product approval | No provider input | None | Immutable ledger validity is evaluated server-side; no Berlin approval is present |
| Connector status / assurance | No provider input | None | All four Berlin connector rows are `PENDING` / `NONE` |
| Release / enforcement | No provider input | None | Provider cannot bypass enforcement/stale-write lock; Berlin policy remains `BLOCKED` |
| Country deployment / activation | No provider input | None | `CountryDeploymentPolicy` is server-side; no activation RPC exists in the scaffold |

## Executed Negative Tests

The following targeted command was executed after the export-directory discovery correction:

```bash
pnpm vitest run \
  tests/country-deployment-policy.test.ts \
  tests/global-country-scaffold-contract.test.ts \
  tests/country-launch-gate-contract.test.ts \
  tests/faz8a-capability-profile.test.ts
```

**Result:** `4 files / 20 tests PASS`.

| Test coverage | Negative assertion |
|---|---|
| `faz8a-capability-profile.test.ts` | Anonymous caller is `UNAUTHORIZED`; provider input cannot request `active` or `legal_approved`; text approval references do not activate; enforcement/stale-write locks reject the provider path. |
| `country-deployment-policy.test.ts` | The Russia infra-only state and incomplete data-plane/default-off conditions block country transition/preflight. |
| `global-country-scaffold-contract.test.ts` | Berlin `SOURCE_UNVERIFIED`, missing legal/connector/locale/release evidence, incomplete coverage and non-production state block activation; `DRAFT_MACHINE` locale cannot be selected. |
| `country-launch-gate-contract.test.ts` | Existing Turkey launch requirements remain fail-closed. |

## Cross-country / IDOR Scope Result

No country-scoped provider/admin CRUD RPC exists in the CHECKPOINT A scaffold. Consequently there is no new country record identifier exposed to a provider client and no cross-country record-fetch/write route to exercise. The existing provider route test proves owner identity binding for the capability-profile path; the new country records remain inaccessible through provider RPC surface. A future owner-only country administration API must add explicit actor role, country scope, record ownership, audit event, and cross-country/IDOR integration tests before it can write these tables.

## Türkiye Regression Boundary

The CHECKPOINT A migrations do not update Turkey provider profiles, Turkish rule-pack records, approval ledger events, enforcement events or existing capabilities. The managed test/staging aggregate check recorded `0` Turkey Blok 1 source-state mutations. This is not a production-database claim; environment separation remains `ENVIRONMENT_SEPARATION_UNVERIFIED`.
