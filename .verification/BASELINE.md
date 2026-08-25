# P27 Final Closure — Baseline

**Observed commit:** `1a21c4c1f799bc9b75365e1c28c604192e8c3c08`  
**Observed working-tree state:** `todo.md` modified before P27 implementation; no user data, migration, credential, external delivery, activation or publication operation was performed.  
**Package manager:** `pnpm@9.12.0`  
**Node.js:** `v22.13.0`  
**Database dialect:** Drizzle MySQL (`mysql2`), intended for managed MySQL/TiDB compatibility. SQLite is not an accepted integration substitute.

## Baseline command inventory

| Purpose | Repository command | P27 handling |
|---|---|---|
| Unit/integration regression | `pnpm test` | Must run in final quality phase. |
| TypeScript | `NODE_OPTIONS=--max-old-space-size=1792 pnpm exec tsc --noEmit --skipLibCheck` | Use after stopping only Expo/Metro if memory pressure requires it. |
| Lint | `pnpm lint` | Must run in final quality phase. |
| Backend build | `pnpm build` | Must run in final quality phase. |
| Drizzle metadata | `pnpm drizzle-kit check` | Static metadata only; not migration-runtime proof. |
| License/SBOM/SCA | `pnpm supply:verify` | Must run in final quality phase. |
| Migration apply shortcut | `pnpm db:push` | **Forbidden** until owner declares verified isolated private-staging TiDB and separately authorizes the exact plan. |

## Migration journal state

The tracked journal contains candidates `0090_marketplace_provider_capacity`, `0091_bumpy_ozymandias`, `0092_zippy_stone_men`, `0093_same_scrambler`, `0094_tiny_zombie`, and `0095_regular_black_crow`. Their journal presence or `drizzle-kit check` result does not show that any migration has been applied to private staging or production.

| Candidate | Scope | Runtime classification |
|---|---|---|
| 0090 | Historical provider capacity candidate | Do not auto-apply; source must remain schema-compatible until reviewed staging plan. |
| 0091–0092 | Opportunity notification outbox | Reviewed/unapplied; private TiDB integration evidence required. |
| 0093 | User timezone candidate | Reviewed/unapplied; private TiDB migration preflight required. |
| 0094–0095 | Moderation records/decisions and optimistic concurrency | Reviewed/unapplied; source uses migration-first fail-closed behavior. |

## Immutable operational boundaries

Türkiye remains `READINESS_BLOCKED` / NO-GO for the existing unverified capability/legal-release gates. Other countries remain scaffold/default-off. P27 must not publish, activate countries/capabilities, use live user data, add or disclose secrets, deliver external push/SMS/email, or treat source/unit/fixture evidence as TiDB integration, physical device, real delivery, or production readiness proof.

## Early static-audit remediation

An unused `SAMPLE_NOTIFICATIONS` array containing hard-coded names, amounts, campaigns and timestamps was removed from `lib/notifications.ts`; the live token registration helper remains. The legacy `NotificationServiceV2` in-app persistence no-op was changed to explicit `NOT_CONFIGURED` failure so it cannot report a false in-app delivery success. Targeted contracts: `tests/notification-delivery-contract.test.ts` and `tests/master-p18-admin-mfa-security.test.ts`, **2 files / 6 tests PASS**. Expected `NOT_CONFIGURED` push/SMS/email error logs in the negative notification contract were observed and are not delivery PASS evidence.

Web authentication no longer persists or reads user, role, email or phone snapshots in `localStorage`; the cookie-backed API remains the sole web identity source. Legacy web cache is removed on `setUserInfo`, while native token-bound storage remains in `expo-secure-store`. Targeted storage regression: `tests/auth.storage.test.ts` and `tests/auth.web-storage.test.ts`, **2 files / 3 tests PASS**.
