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
| `COMPONENT_FIXTURE` | 01 Ana Sayfa pilot | Normal PASS; loading PASS; empty PASS | Normal PASS; loading PASS; empty PASS | Owner-provided physical iPhone Safari evidence | PARTIAL | Same production `HomeScreenView`; physical normal/loading/empty evidence is accepted. Disabled, pressed and focused have render/accessibility test evidence but await owner visual evidence. This is not route E2E, auth, DB or native evidence |
| `COMPONENT_FIXTURE` | 02–14 detail gallery | Not rendered | Not rendered | No screenshot claim | BLOCKED_COMPONENT_NOT_ISOLATABLE | Every remaining detail records its intended production source but intentionally imports no screen: no unsafe module substitution or hand-drawn substitute is used |
| `BLOCKED_TIDB_RUNTIME` | Customer, provider, owner/admin DB-backed routes | Not run | Not run | None | BLOCKED | No local TiDB/MySQL listener, TiUP/TiDB binary, container runtime, or safe same-engine database exists in this sandbox |
| `PUBLIC_ROUTE_RUNTIME` | Other public UI routes | WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS | WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS | Owner must supply iPhone Safari screenshots | WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS | HTTP 200 confirms development-preview access only; it is not visual, contrast, auth, or native evidence |
| `BLOCKED_VISUAL_BACKEND` | Automated browser screenshot evidence | Not run | Not run | None | BLOCKED | Harness requires an explicitly configured non-production visual backend; it remains intentionally `NOT_CONFIGURED` |

## No-Write Confirmation

The local same-engine preflight produced `BLOCKED_TECHNICAL` before fixture creation. No `theme_audit_<run_id>` database, fixture user/provider, screenshot, remote delivery, country/capability state, or production integration was created or changed.

## Minimal Fix Decision

No additional theme color change was made in this partial evidence phase. The prior `ThemeProvider` semantic correction remains covered by test and user-provided login evidence. All other static raw-color findings remain unmodified until they can be reproduced in an approved local visual run.

## Owner Physical Screenshot Handoff

Run `pnpm home-fixture` only in development to start the isolated 01 pilot app root outside `app/`. The pilot imports the same `HomeScreenView` used by `app/(tabs)/index.tsx`, but supplies immutable local props and no-op callbacks. The CSS/theme provider observes live system Dark/Light changes and refreshes. Owner physical evidence confirms Dark/Light normal plus loading and empty; disabled/pressed/focused remain visual-evidence pending despite their unit/render assertions. Fixture 01 is `PARTIAL`, not component PASS or route E2E evidence; 02–14 remain `BLOCKED_COMPONENT_NOT_ISOLATABLE` and public routes without physical proof remain `WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS`.

### 01 Ana Sayfa Disabled / Focus Contract

In fixture state `disabled`, the **search input** is non-editable and reports `accessibilityState.disabled`; the **MoveAI banner**, **four quick-access controls**, **active-job card** (when present), **nearby section action**, **provider cards**, **popular-services section action**, and **service cards** are all actual disabled `Pressable` controls with `accessibilityState.disabled`. Their guarded callbacks cannot invoke the fixture no-op handlers even if a test calls the handler directly. Disabled controls use an opaque semantic surface, muted icon/text treatment, and a 1.5 px muted border; semantic foreground and muted text contrast against the fixture surface are test-checked at WCAG AA ≥ 4.5:1. Pressed state changes opacity; actual `onFocus`/`onBlur` state produces a 2 px primary focus outline for keyboard/VoiceOver focus. These are component-fixture assertions, not physical route E2E evidence.
