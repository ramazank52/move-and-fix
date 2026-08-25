# P35 Automated Code and Security Scan Report

## Scope

The scan started from canonical `deef923` and used tracked-source static checks, dependency/SCA gating, secret heuristics, security-contract tests and full regression. No production connection, migration, worker, external provider delivery, credential, country/capability activation or publish action was used.

## Confirmed Findings and Corrections

| ID | Severity | Location | Confirmed defect | Correction | Regression proof |
|---|---|---|---|---|---|
| P35-01 | Medium | `server/services/NotificationService.ts:37-42, 319` | Valid Turkish national phone input such as `0555 555 55 55` was rejected, and the Twilio branch reused the raw profile string after validation. | Accept the optional national `0` prefix and submit the canonical validated recipient as E.164 `+90...`. | `tests/p35-notification-sms-contract.test.ts` |
| P35-02 | High | `server/_core/trpc.ts:36-49` | `AppError` details, including database/provider causes, could cross the tRPC error boundary because tRPC v11 returns failed `next()` results rather than throwing them to the middleware catch. | Map failed result causes to safe TRPC errors. Database/external/payment/unknown and 5xx messages now return one generic client-safe message; safe validation 4xx feedback remains available. | `tests/p35-trpc-error-redaction.test.ts` |

## Static and Dependency Results

| Control | Result | Notes |
|---|---|---|
| Executable TODO/stub scan | No executable stub found. | One `NOT_IMPLEMENTED_OR_NOT_AUTHORIZED` occurrence is a compliance lifecycle enum, not code execution. |
| Dynamic execution scan | No `eval`, `new Function`, shell execution or process-spawn pattern found in audited app/server/lib/component sources. | PASS within source scope. |
| Unsafe HTML scan | No `dangerouslySetInnerHTML` or direct `innerHTML` assignment found in audited source. | PASS within source scope. |
| Client web persistence scan | No session/user/PII write to `localStorage` found. | Remaining references remove historical data; web identity snapshots remain disabled. |
| Secret heuristic scan | No tracked API key/private key pattern match. | Heuristic, not a substitute for a production secret-vault review. |
| SCA gate | PASS — 4 advisories, 0 release-blocking, 2 approved exceptions. | Existing approved-exception policy remains unchanged. |

## Quality Evidence

| Gate | Result |
|---|---|
| Focused SMS/provider contracts | PASS — 3 files / 6 tests. |
| Focused tRPC redaction/payment/health contracts | PASS — 3 files / 15 tests. |
| Full `pnpm test` | PASS — 159 files / 836 tests. |
| `tsc --noEmit --skipLibCheck` | PASS. |
| `pnpm lint` | PASS. |
| `pnpm build` | PASS. |
| `pnpm drizzle-kit check` | PASS. |
| `git diff --check` | PASS. |

## Residual Boundaries

The scan does not turn source tests into database, device, delivery or legal proof. Private-staging TiDB migration/race evidence, physical iOS/Android AR and role E2E, sandbox provider delivery, legal source approval and product release approval remain open external gates. Production classification remains **C — NOT PRODUCTION READY / NO-GO**.
