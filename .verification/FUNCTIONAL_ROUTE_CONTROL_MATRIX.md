# Functional Route and Control Matrix — P27 Working Inventory

**Status:** `IN_PROGRESS`  
**Source of truth:** Expo Router files under `app/`, programmatic navigation calls, and visible interactive controls in `app/` and `components/`.  
**Observed control count:** 284 `Pressable`/`TouchableOpacity`/`Button`/`Switch`/`Link` occurrences. This count is an inventory metric, not evidence that the controls are route-E2E tested.

| Coverage slice | Authoritative source | P27 state | Evidence requirement before PASS |
|---|---|---|---|
| Route files | `app/**/*.{ts,tsx}` | INVENTORIED | Route-specific role, parameter, loading/error/offline and back-navigation checks. |
| Programmatic navigation | `router.push`, `router.replace`, `router.back`, Expo `Link` | INVENTORIED | Valid target, parameter validation, auth/RBAC/lifecycle guard and test ID. |
| Visible controls | `Pressable`, `TouchableOpacity`, `Button`, `Switch`, `Link` in `app/` and `components/` | INVENTORIED | Real action/route, explicitly disabled/busy state, or truthful `NOT_CONFIGURED` / `NOT_AVAILABLE`. |
| Sensitive deep links | chat, tracking, review, wallet, verification, settings and legal routes | PENDING_REVIEW | Server ownership and current lifecycle revalidation; HTTP 200 is insufficient. |
| Public routes | login, register, forgot password, onboarding, privacy/legal and public profile | PARTIAL | Existing physical Safari evidence only applies to documented login/register/forgot-password scope; no global native/E2E claim. |

## Explicit evidence-class boundary

Component fixture, source contract, HTTP, TypeScript, build and route inventory evidence are recorded separately from route E2E, private TiDB integration, physical device, external delivery and production-readiness evidence. A route remains `BLOCKED` or `PENDING_REVIEW` unless the appropriate evidence is added.
