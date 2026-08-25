# P33 Area Measurement Implementation Status

| Requirement | Evidence class | Status |
|---|---|---|
| Manual rectangle/polygon geometry, m/cm support and bounded validation | Unit tests | `COMPLETED_AND_VERIFIED` |
| Versioned image-free payload with owner-scoped idempotency key | Source + unit | `COMPLETED_AND_VERIFIED` |
| Atomic request/detail/measurement writer and migration-required rollback path | Source contract | `CODE_READY_NOT_CONFIGURED` |
| Owner-only get/replace/delete with pending-only editability | Router contract | `COMPLETED_AND_VERIFIED` |
| Request-create retry and duplicate-key recovery | Source contract | `CODE_READY_NOT_CONFIGURED` |
| Real `/create-service` controller: manual rectangle/polygon, m/cm, estimate notice, correct/remove/re-measure | Typecheck + source controller contract | `COMPLETED_AND_VERIFIED` |
| Real `/job/[id]` owner/pending controller: persisted summary, replace and delete mutation callbacks | Typecheck + source controller contract | `COMPLETED_AND_VERIFIED` |
| Native AR/depth | Server rejects client AR results until a verified server-owned adapter exists; manual fallback remains usable | Unit + source | `CODE_READY_NOT_CONFIGURED` |
| 0096 schema application, actual transaction rollback/race | No isolated private TiDB declared; 0096 is generated but not applied | `EXTERNAL_BLOCKER` |
| iOS/Android AR permission, tracking and accuracy | No adapter/device/reference-surface evidence | `EXTERNAL_BLOCKER` |

## Recorded Commands

| Command | Result |
|---|---|
| `pnpm drizzle-kit generate` | Generated additive, unapplied `0096_typical_robin_chapel.sql`. |
| `pnpm drizzle-kit check` | PASS — `Everything's fine`. |
| `NODE_OPTIONS=--max-old-space-size=1792 pnpm exec tsc --noEmit --skipLibCheck` | PASS after Metro stop. |
| `pnpm vitest run tests/area-measurement.test.ts tests/area-measurement-capability.test.ts tests/p33-area-measurement-request-contract.test.ts` | PASS — 3 files / 15 tests. |
| `pnpm lint` | PASS. |

No migration, TiDB DDL/DML, external delivery, credential, capability/country activation or publish operation occurred. Source/fixture/typecheck evidence is not claimed as TiDB runtime, physical native AR, or production delivery evidence.
