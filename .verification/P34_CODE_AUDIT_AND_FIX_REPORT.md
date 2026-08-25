# P34 Code Audit and Error-Only Fix Report

## Scope and Guardrails

The audit started from canonical checkpoint `deef9236`. No schema, route, public API signature, migration, worker, external provider, credential, country/capability state, deployment, or publish operation was changed. The one source correction is limited to the existing Twilio SMS recipient formatter.

## Static Audit Results

| Check | Result | Disposition |
|---|---|---|
| TODO/FIXME/XXX/stub scan in tracked `server/`, `lib/`, `app/`, `components/` source | One `NOT_IMPLEMENTED_OR_NOT_AUTHORIZED` value in `server/compliance/CountryDeploymentPolicy.ts:149`. | This is a typed lifecycle state, not executable stub code; unchanged. |
| `throw new Error("not implemented")` scan | No executable match. | No change required. |
| Empty catch / empty arrow scan | No executable match in tracked source under the audited paths. | No change required. |
| External error paths | Existing notification, payment and scanner catch blocks normalize/log or return explicit fail-closed results. | Covered by targeted contracts; no broad rewrite. |

## Corrected Defect

| File | Problem | Correction | Regression proof |
|---|---|---|---|
| `server/services/NotificationService.ts:37-43, 317` | A valid Turkish national-format number such as `0555 555 55 55` was rejected by the existing normalizer. When a number was accepted, the Twilio path reused raw profile input rather than sending the already validated recipient in E.164. | Strip the optional national `0` prefix after country normalization and submit `+90${recipient}` to Twilio. NetGSM behavior remains unchanged. | Added `tests/p34-notification-sms-contract.test.ts`; it proves raw profile formatting is not sent and Twilio receives E.164. |

## Contract Review

| Area | Result | Evidence |
|---|---|---|
| Native AR/manual measurement | The UI, manual rectangle/polygon draft, server validation and `MANUAL_ONLY` fallback are functional. No verified native adapter exists, so `AR_READY` is never claimed by the real UI. | 2 capability + 5 geometry + 8 request contract tests in targeted suite. |
| Outbox/capacity | Migration-first default-one capacity, private-staging queue gate, revoke and delivery recheck contracts agree with the router/DB source. | 5 worker + 4 lifecycle + 2 capacity tests. |
| Review/rating | Atomic pending-moderation/retry and approved-only reconciliation/MFA gates agree with current contracts. | 3 moderation + 5 reconciliation + 5 admin contract tests. |
| Provider document security | Existing ownership/review policy contract passes. | 3 tests. |
| Payment, notification, media scanner | Fail-closed provider/route/webhook/scanner contracts pass with no external delivery. | 10 files / 51 tests, including P34 SMS test. |

## Test Renderer Decision

`tests/home-screen-view-pilot.test.tsx` still uses `react-test-renderer`. `@testing-library/react-native` is not installed, and P34 explicitly forbids dependency upgrades. Adding the recommended package would violate that constraint; therefore no test-library migration was made. This remains a non-blocking test-maintenance item, not a production-code defect.

## Quality Gates

| Command | Result |
|---|---|
| Targeted marketplace/review/measurement/document contracts | PASS — 10 files / 42 tests. |
| Targeted provider error contracts | PASS — 10 files / 51 tests. |
| `pnpm test` after server restart | PASS — 158 files / 834 tests. |
| `tsc --noEmit --skipLibCheck` | PASS. |
| `pnpm lint` | PASS. |
| `pnpm build` | PASS. |
| `pnpm drizzle-kit check` | PASS. |
| `git diff --check` | PASS. |

The first full-test attempt occurred while the intentionally stopped local API process was unavailable and produced `ECONNREFUSED 127.0.0.1:3000` in HTTP tests. It was not classified as a source failure. After a controlled restart, the full suite passed as shown above.

## Still Outside Code-Only Scope

Private-staging TiDB migration/race evidence, physical iOS/Android camera/AR evidence, authenticated role route E2E, real payment/SMS/email/push delivery, legal approval, product release approval and country/capability activation remain external blockers. The current classification stays **C — NOT PRODUCTION READY / NO-GO**.
