# P16 Expo/Metro Software Composition Decision

**Decision date:** 2026-08-20  
**Scope:** Expo/Metro transitive dependency advisories and controlled remediation only. This is not a claim that payment Strong Customer Authentication is enabled.

## Primary source and method

The [official Expo SDK upgrade walkthrough][1] requires upgrades to proceed **one SDK release at a time**. The official SDK 56 release material reports a React Native 0.85 and React 19.2 platform transition.[2] The P16 work therefore used an isolated checkpoint, upgraded SDK 54 to SDK 55, ran the available regression gates, and did not force an unsupported Metro replacement or an unreviewed direct jump.

| Item | Verified P16 state | Decision |
|---|---|---|
| SDK 54 baseline | P15 used Expo `~54.0.37` | Replaced through a controlled incremental 54 → 55 step. |
| SDK 55 verification | Project dependency graph and Expo configuration were aligned; full regression after the upgrade passed at **116 test files / 690 tests**. | Retained. |
| SDK 56 next step | Requires a material React Native / React platform transition per Expo’s official release notes. | **BLOCKED_TOOLCHAIN_COMPATIBILITY_REVIEW** pending a separately scoped compatibility review of Router, native modules, notifications, location, media, secure store, payment SDKs and generated native projects. |
| Metro/PostCSS/image-size findings | `pnpm audit --audit-level=high` on 2026-08-20 reports `image-size@1.2.1` through `expo@55.0.29 → @expo/metro@55.1.1 → metro@0.83.7`. The audit identifies the vulnerable range as `<=2.0.2` and reports no published patched version (`<0.0.0`). | **BLOCKED_TOOLCHAIN_UPSTREAM**. No arbitrary override or Metro replacement was introduced. |

## Security conclusion

The P16 controlled remediation removes neither the obligation to run `pnpm audit` nor the need to evaluate every remaining advisory’s exact reachability. It records that the next supported framework transition is not a safe incidental application change: it would replace React Native and React while touching the project’s native module surface. P16 therefore leaves the unresolved toolchain advisory path explicitly blocked rather than claiming a patch. The exact `image-size` advisory is an ICNS/JXL/HEIF parser denial-of-service finding; its only resolved path in the audit is the Expo/Metro toolchain, not an application runtime dependency selected by Move&Fix.

Trusted repository-owned assets remain the only intended Metro build inputs. User media stays behind the server-side quarantine/scanner workflow and is not admitted to the repository’s Metro asset pipeline. This reduces exposure but is **not** a remediation claim for an upstream advisory.

## Release effect

An unresolved high-severity Expo/Metro advisory or an unreviewed SDK compatibility transition prevents an A/GO conclusion. Final release status must continue to list this as an external/upstream toolchain gate alongside credential, legal, domain/HTTPS and physical-device gates.

[1]: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
[2]: https://expo.dev/changelog/sdk-56
