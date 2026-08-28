# P36 iOS and Android E2E Test Matrix

## Evidence Rules

This matrix distinguishes bundle/configuration evidence, deterministic source-contract evidence, and physical-device E2E evidence. A static Expo export proves that Metro generated a platform bundle; it does **not** prove installation, permission behavior, native module execution, real database transactions, or external delivery.

| Evidence tag | Meaning | Current use |
|---|---|---|
| `CONFIG_BUNDLE_VERIFIED` | Resolved Expo configuration and generated platform bundle. | iOS and Android platform exports. |
| `SOURCE_CONTRACT_PASS` | Deterministic unit/router/policy behavior with mocks. | Routes, media limits, tracking, notifications and manual measurement. |
| `PHYSICAL_DEVICE_E2E_PASS` | Installed, manually executed on a named real device with sanitized evidence. | Not available in this sandbox. |
| `BLOCKED_NO_DEVICE_TOOLCHAIN` | No Xcode/iOS simulator or Android SDK/emulator/ADB in this sandbox. | Native installation and interaction tests. |
| `BLOCKED_PRIVATE_TIDB_RUNTIME` | Requires verified isolated TiDB with synthetic data. | Authenticated request/offers/lifecycle/race flows. |
| `BLOCKED_EXTERNAL_CONFIGURATION` | Requires approved sandbox/provider configuration without real delivery. | Payment, OTP, SMS, email and push acceptance. |

## Platform Result Summary

| Platform | Config / bundle | Device execution | Result |
|---|---|---|---|
| iOS | Expo SDK 55 config resolved; `expo export --platform ios` generated 1 Hermes bundle and 26 files. | Xcode, `xcrun`, `xcodebuild` and `simctl` are unavailable. | `CONFIG_BUNDLE_VERIFIED`; device E2E blocked. |
| Android | Expo SDK 55 config resolved; `expo export --platform android` generated 1 Hermes bundle and 34 files. | Android SDK, emulator, ADB and AVD manager are unavailable. | `CONFIG_BUNDLE_VERIFIED`; device E2E blocked. |

## Cross-Platform Functional Matrix

| ID | Flow / expected result | iOS | Android | Current evidence | Required physical evidence |
|---|---|---|---|---|---|
| M-01 | Install, cold launch, splash and first route resolve without crash. | BLOCKED_NO_DEVICE_TOOLCHAIN | BLOCKED_NO_DEVICE_TOOLCHAIN | Platform bundles generated. | Fresh install + cold launch video/log. |
| M-02 | Light/dark system theme, refresh/relaunch and semantic text visibility. | BLOCKED_NO_DEVICE_TOOLCHAIN | BLOCKED_NO_DEVICE_TOOLCHAIN | Prior Safari web evidence only; not native evidence. | One screenshot per theme/platform. |
| M-03 | Login/register/forgot-password routes navigate and generic anti-enumeration response appears. | BLOCKED_PRIVATE_TIDB_RUNTIME | BLOCKED_PRIVATE_TIDB_RUNTIME | `navigation-entry`, `route-manifest`, phone verification contracts. | Synthetic account journey. |
| M-04 | Invalid/expired session redirects safely without cached identity disclosure. | BLOCKED_PRIVATE_TIDB_RUNTIME | BLOCKED_PRIVATE_TIDB_RUNTIME | Source contracts. | Login/logout/relaunch trace. |
| M-05 | Customer creates a service request with finite/bounded form fields. | BLOCKED_PRIVATE_TIDB_RUNTIME | BLOCKED_PRIVATE_TIDB_RUNTIME | `p33-area-measurement-request-contract`. | Synthetic request ID and cleanup record. |
| M-06 | Manual rectangle/polygon area calculation is labelled estimated/non-authoritative. | SOURCE_CONTRACT_PASS | SOURCE_CONTRACT_PASS | 2 capability + 8 request contracts. | UI interaction and visible disclaimer. |
| M-07 | Native AR/depth is never represented as a result without verified adapter/device evidence; manual fallback remains usable. | BLOCKED_NO_DEVICE_TOOLCHAIN | BLOCKED_NO_DEVICE_TOOLCHAIN | Capability contract verifies `MANUAL_ONLY`. | Real-device adapter/accuracy protocol if ever enabled. |
| M-08 | Photo/document picker/camera permission deny, limited access, grant and cancel states are understandable and fail closed. | BLOCKED_NO_DEVICE_TOOLCHAIN | BLOCKED_NO_DEVICE_TOOLCHAIN | Media upload-limit and scanner contracts. Camera plugin is absent; no camera capture claim. | Permission matrix/screenshots. |
| M-09 | Location permission deny/grant, unavailable GPS and background location states do not expose stale location. | BLOCKED_NO_DEVICE_TOOLCHAIN | BLOCKED_NO_DEVICE_TOOLCHAIN | Location matching/tracking contracts. | Permission and movement test. |
| M-10 | Provider discovery and address/map fallback handle empty/loading/error/offline states. | BLOCKED_PRIVATE_TIDB_RUNTIME | BLOCKED_PRIVATE_TIDB_RUNTIME | Source contracts only. | Synthetic data and airplane-mode evidence. |
| M-11 | Offer create/accept uses ownership and capacity guard; duplicate/late action fails safely. | BLOCKED_PRIVATE_TIDB_RUNTIME | BLOCKED_PRIVATE_TIDB_RUNTIME | Capacity/outbox source contracts. | Two synthetic provider race run. |
| M-12 | Job tracking permits only authorized party location access. | BLOCKED_PRIVATE_TIDB_RUNTIME | BLOCKED_PRIVATE_TIDB_RUNTIME | `tracking-router-security` (8 tests). | Customer/provider/third-party matrix. |
| M-13 | Customer/provider cancellation changes current status and revokes pending in-app opportunity intent. | BLOCKED_PRIVATE_TIDB_RUNTIME | BLOCKED_PRIVATE_TIDB_RUNTIME | Outbox lifecycle contract. | Isolated TiDB trace. |
| M-14 | Messaging restricts participants, masks direct contact and handles attachment failure. | BLOCKED_PRIVATE_TIDB_RUNTIME | BLOCKED_PRIVATE_TIDB_RUNTIME | Existing security contracts. | Two-party synthetic conversation. |
| M-15 | Voice message record/playback handles microphone deny/interruption/retry and stops on navigation. | BLOCKED_NO_DEVICE_TOOLCHAIN | BLOCKED_NO_DEVICE_TOOLCHAIN | Audio config bundle only. | Permission/interruption walkthrough. |
| M-16 | Notification preference UI reflects server-owned state and no provider call occurs when not configured. | SOURCE_CONTRACT_PASS | SOURCE_CONTRACT_PASS | Notification preference/provider contracts. | Settings screenshots for permission states. |
| M-17 | Push token registration and notification open verify current authorization/status. | BLOCKED_EXTERNAL_CONFIGURATION | BLOCKED_EXTERNAL_CONFIGURATION | In-app/outbox contracts only. | EAS/device token + sandbox push. |
| M-18 | SMS/email/OTP recovery fails closed without configured provider and avoids enumeration. | SOURCE_CONTRACT_PASS | SOURCE_CONTRACT_PASS | Provider and phone-verification contracts. | Approved sandbox OTP run. |
| M-19 | Payment sheet/hosted checkout surfaces `NOT_CONFIGURED` safely; no amount/client tampering. | SOURCE_CONTRACT_PASS | SOURCE_CONTRACT_PASS | Payment policy/router tests. | Approved sandbox payment, no real charge. |
| M-20 | Payment return/deep-link is accepted once, owner-scoped and idempotent. | BLOCKED_EXTERNAL_CONFIGURATION | BLOCKED_EXTERNAL_CONFIGURATION | Source contracts. | Signed sandbox callback and app resume. |
| M-21 | Provider document upload and review route enforce ownership and status. | BLOCKED_PRIVATE_TIDB_RUNTIME | BLOCKED_PRIVATE_TIDB_RUNTIME | Provider-document reviewer contracts. | Synthetic provider/reviewer sequence. |
| M-22 | Accessibility: screen-reader labels, focus order, dynamic text and touch targets remain usable. | BLOCKED_NO_DEVICE_TOOLCHAIN | BLOCKED_NO_DEVICE_TOOLCHAIN | Source accessibility labels only. | VoiceOver/TalkBack walkthrough. |
| M-23 | Android back gesture and iOS swipe-back respect unsaved-change/confirmation behavior. | BLOCKED_NO_DEVICE_TOOLCHAIN | BLOCKED_NO_DEVICE_TOOLCHAIN | Route manifest only. | Platform-specific navigation run. |
| M-24 | Network drop/reconnect does not duplicate mutation, payment, request or notification. | BLOCKED_PRIVATE_TIDB_RUNTIME | BLOCKED_PRIVATE_TIDB_RUNTIME | Idempotency source contracts. | Network-toggle synthetic flow. |
| M-25 | App has portrait orientation, notification/location/microphone declarations and safe deep-link scheme. | CONFIG_BUNDLE_VERIFIED | CONFIG_BUNDLE_VERIFIED | Public Expo config. | Installed-binary settings inspection. |

## Device Execution Procedure

Use only a private staging environment with synthetic identities and a per-run ID. Before writing data, verify the host and database are non-production, the country/capability state remains default-off, external delivery is disabled, and the run has a scoped cleanup plan. Do not use real names, phone numbers, addresses, payment instruments, documents or screenshots containing tokens.

| Step | Owner action | Pass criterion | Stop condition |
|---|---|---|---|
| 1 | Install an iOS development build and an Android development build from the same commit. | Build SHA is recorded on both devices. | Unsigned/unverifiable binary. |
| 2 | Create only tagged synthetic customer, provider and reviewer fixtures in verified private staging. | Preflight ledger reports private staging; cleanup tag is present. | Production marker, missing schema or unknown host. |
| 3 | Execute M-01 to M-09 on both platforms. | Sanitized evidence, device/OS/build identifier and outcome are logged. | Crash, unexpected permission behavior, or any PII exposure. |
| 4 | Execute authenticated M-10 to M-16 with the scoped fixtures. | Owner/RBAC, idempotency and offline outcomes match expected states. | BOLA/IDOR, duplicate write or lifecycle violation. |
| 5 | After explicit provider sandbox approval, execute M-17 to M-20. | One sandbox-only acceptance per provider is captured. | Any real delivery/charge or missing fail-closed guard. |
| 6 | Run M-21 to M-25, including VoiceOver and TalkBack. | Accessibility and back-navigation results are recorded separately by platform. | Any critical accessibility or navigation failure. |
| 7 | Run scoped `try/finally` cleanup and count check. | Orphan record count for the run ID is zero. | Cleanup exceeds scoped run ID. |

## Release Interpretation

This matrix is **not a production GO**. A platform may be considered device-E2E-ready only when every applicable row has `PHYSICAL_DEVICE_E2E_PASS` or an approved, documented `NOT_IN_SCOPE` decision. Private-TiDB, sandbox provider, physical device, legal and release approval blockers must be closed independently.
