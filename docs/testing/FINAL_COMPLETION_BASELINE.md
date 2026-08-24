# Final Completion — FAZ 0 Baseline

**Baseline checkpoint:** `69e9fc6d`  
**Previous implementation checkpoint:** `0e6bffe9`  
**Date:** 2026-08-24  
**Scope:** Read-only inventory plus final-command tracking. No production data, country/capability state, credential, integration, migration, publish, deployment, or activation action occurred.

## Repository and Runtime Boundary

| Item | Baseline result | Evidence / boundary |
|---|---|---|
| Git baseline | `69e9fc6d` | Created after recording the final-command phase checklist only |
| Database engine | TiDB/MySQL | No local same-engine runtime is available; production-marker harness remains fail-closed |
| Country/capability control | Preserved | TR remains readiness-blocked; non-TR shells remain default-off / infra-only as previously evidenced |
| Credentials | Not configured for live verification | No secret, production credential, real payment, email, SMS, push, or external action is authorized |
| Development-only fixture | Build-time isolated | `HOME_FIXTURE_ROUTER_ROOT=1` switches only the explicit development command to `tests/home-fixture/app`; no app route was added |

## Authoritative Route Inventory

The static audit contains **74 route/component records**: **61 user-facing** and **13 structural/NO_UI** records.

| Role context | Records |
|---|---:|
| Customer | 33 |
| Shared | 19 |
| Public | 13 |
| Provider | 6 |
| Owner/admin | 2 |
| System | 1 |

The external evidence CSV and static source CSV each contain 75 lines including their header. The current matrix remains a proof-status register, not a global runtime-clean declaration.

## Existing Theme and Fixture Evidence

| Scope | Current evidence class | Status |
|---|---|---|
| `/login` public route | Owner physical iPhone Safari | PASS for Dark/Light, signup navigation and manual VoiceOver focus |
| `/register` and `/forgot-password` | Limited physical/public observation | PARTIAL |
| 01 Home common-view fixture | Owner physical iPhone Safari + component tests | PARTIAL: Dark/Light normal, loading and empty are physically evidenced; disabled/pressed/focused visual proof remains open |
| 02–14 fixture details | No safe shared view extraction approved/implemented | `BLOCKED_COMPONENT_NOT_ISOLATABLE` |
| Authenticated, DB-backed roles | Local same-engine runtime unavailable | `BLOCKED_TIDB_RUNTIME` |
| Automated visual capture | No approved local visual backend | `BLOCKED_VISUAL_BACKEND` |

## Phase-0 Exit Conditions

FAZ 0 is complete only when this baseline remains reproducible through current source inventory and the next phase is limited to evidence/correction that does not weaken any fail-closed boundary. Physical-device, staging, legal, credential, payment, email, SMS, push and production release claims remain separately gated.
