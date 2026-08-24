# Theme Runtime Evidence Status

**Status:** `PARTIAL — BLOCKED_LOCAL_SAME_ENGINE; OWNER_PHYSICAL_SCREENSHOTS_PENDING`
**Scope:** This record distinguishes physical/public route evidence from test-only component evidence and never treats either as native iOS/Android evidence.

| Evidence type | Scope | Dark | Light | Screenshot | Status | Reason |
|---|---|---|---|---|---|---|
| `PUBLIC_ROUTE_RUNTIME` | `/login` | PASS | PASS | User-provided physical iPhone Safari evidence | PASS | User verified heading, subtitle, signup row, navigation and VoiceOver manually |
| `PUBLIC_ROUTE_RUNTIME` | `/register` | Not independently captured | User observed route opened | No local artifact | PARTIAL | Only navigation outcome is physically confirmed; both-theme visual evidence is absent |
| `PUBLIC_ROUTE_RUNTIME` | `/forgot-password` | Not independently captured | User observed generic anti-enumeration response | No local artifact | PARTIAL | Email delivery is not proven; no SMTP PASS claim |
| `COMPONENT_FIXTURE` | Login semantic token contracts | PASS | PASS | Test assertion, not image | PASS | Theme token and contrast regression tests pass |
| `COMPONENT_FIXTURE` | Existing 14-screen CDP fixture | Not run | Not run | None | BLOCKED | Existing script writes fixture rows; current DB preflight sees a remote production marker and correctly refuses writes |
| `COMPONENT_FIXTURE` | Development-only 14-screen gallery | WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS | WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS | Owner must supply iPhone Safari screenshots | WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS | Separate `tests/theme-preview/app` router root; static synthetic metadata only; no product screen, DB, auth, network, or external-service import |
| `BLOCKED_TIDB_RUNTIME` | Customer, provider, owner/admin DB-backed routes | Not run | Not run | None | BLOCKED | No local TiDB/MySQL listener, TiUP/TiDB binary, container runtime, or safe same-engine database exists in this sandbox |
| `PUBLIC_ROUTE_RUNTIME` | Other public UI routes | WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS | WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS | Owner must supply iPhone Safari screenshots | WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS | HTTP 200 confirms development-preview access only; it is not visual, contrast, auth, or native evidence |
| `BLOCKED_VISUAL_BACKEND` | Automated browser screenshot evidence | Not run | Not run | None | BLOCKED | Harness requires an explicitly configured non-production visual backend; it remains intentionally `NOT_CONFIGURED` |

## No-Write Confirmation

The local same-engine preflight produced `BLOCKED_TECHNICAL` before fixture creation. No `theme_audit_<run_id>` database, fixture user/provider, screenshot, remote delivery, country/capability state, or production integration was created or changed.

## Minimal Fix Decision

No additional theme color change was made in this partial evidence phase. The prior `ThemeProvider` semantic correction remains covered by test and user-provided login evidence. All other static raw-color findings remain unmodified until they can be reproduced in an approved local visual run.

## Owner Physical Screenshot Handoff

Run `pnpm theme-preview` only in development to start the separate gallery app root. It is intentionally not inside `app/`, and the command conditionally disables Expo typed routes so the gallery cannot overwrite the application route inventory. The gallery reads the existing `ThemeProvider`: an explicit stored preference remains authoritative; otherwise system Dark/Light is used on changes and refreshes. Until the owner supplies physical screenshots, every gallery item remains `WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS`.
