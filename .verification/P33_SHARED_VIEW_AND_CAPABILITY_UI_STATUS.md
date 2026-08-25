# P33 Shared View and Runtime Capability UI Status

| Area | Actual integration | Evidence | Status |
|---|---|---|---|
| Home shared view | `app/(tabs)/index.tsx` is the production controller for `HomeScreenView`; it passes live auth/query values and preserves router callbacks for MoveAI, explore, job and provider navigation. | Component/controller contract | `COMPLETED_AND_VERIFIED` |
| Home loading/empty/error | The real `provider.nearby` query maps `isLoading`, data-empty and `isError` states to the one shared view. Error text comes from the existing central translation key. | Component/controller contract | `COMPLETED_AND_VERIFIED` |
| Home offline/role/mutation route E2E | Query error is a user-visible unavailable state. A separate isolated TiDB fixture with legitimate role sessions is still required for authenticated role/lifecycle/mutation route E2E; no fixture result is treated as route E2E. | Private TiDB/runtime | `EXTERNAL_BLOCKER` |
| Server-owned endpoint | `runtimeCapabilities.get` is a protected, read-only tRPC query returning configuration/support facts only, without secret values or delivery claims. | Source/unit contract | `COMPLETED_AND_VERIFIED` |
| Actual runtime UI | `app/settings/general.tsx` uses the protected endpoint through `RuntimeCapabilityStatusCard`, including loading, endpoint error and all standardized state labels. | Source/unit contract | `COMPLETED_AND_VERIFIED` |
| Payment/push/SMS/email/MoveAI/doc/media | `AVAILABLE` denotes configuration presence only and explicitly says no delivery/scan proof. Default unknown credentials report `NOT_CONFIGURED`. | Pure resolver unit | `COMPLETED_AND_VERIFIED` |
| Maps/camera AR | Maps are `NOT_CONFIGURED`; camera/AR is `NOT_SUPPORTED` because no verified native adapter exists. Permission/physical AR accuracy remain outside this endpoint and are not passed. | Source/research boundary | `CODE_READY_NOT_PHYSICALLY_VERIFIED` |
| Native / external delivery | No native device validation, scanner invocation, payment, push, SMS or email delivery occurred. | External | `EXTERNAL_BLOCKER` |

## Recorded Tests

| Command | Result |
|---|---|
| `pnpm vitest run tests/home-screen-view-pilot.test.tsx tests/home-screen-view-states.test.tsx` | PASS — 1 file / 2 tests (the requested second file does not exist and was not silently skipped). |
| `pnpm vitest run tests/p33-runtime-capability-status.test.ts tests/home-screen-view-pilot.test.tsx` | PASS — 2 files / 5 tests. |
| `NODE_OPTIONS=--max-old-space-size=1792 pnpm exec tsc --noEmit --skipLibCheck` | PASS. |

The React test-renderer emitted its deprecation/`act` environment warnings while all assertions passed. These warnings are retained as test-environment information; no test was removed, skipped or weakened.
