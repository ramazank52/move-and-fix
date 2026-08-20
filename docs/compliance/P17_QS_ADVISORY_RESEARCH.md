# P17 `qs` Runtime Advisory Research

**Advisory:** [GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26)  
**Research date:** 2026-08-20

| Field | Verified disposition |
|---|---|
| Affected range | `>=6.11.1 <=6.15.1` |
| Patched range | `>=6.15.2` |
| P17 affected runtime paths | `express@4.22.1 → qs@6.14.2`; `iyzipay@2.0.69 → postman-request → qs@6.14.2` |
| Compatibility review | Parent semver ranges were inspected before remediation; the P17 lockfile is constrained to the patched `qs@6.15.2` resolution and must be validated with HTTP parsing, auth, webhook, payment-adapter, callback, refund and reconciliation regression coverage. |
| Evidence source | GitHub Security Advisory: <https://github.com/advisories/GHSA-q8mj-m7cp-5q26> |

## P17 remediation evidence

The P17 lockfile and installed production dependency tree were remediated without treating this runtime defect as an Expo/Metro exception. The real `pnpm why qs` evidence on 2026-08-20 is:

| Consumer path | Resolved `qs` | Disposition |
|---|---:|---|
| `express@4.22.1 → qs` | `6.15.2` | Patched |
| `express@4.22.1 → body-parser@1.20.6 → qs` | `6.15.3` | Patched |
| `iyzipay@2.0.69 → postman-request@2.88.1-postman.48 → qs` | `6.15.2` | Patched |

`pnpm-lock.yaml` and the installed package store contain no `qs@6.14.2` entry. The deterministic production SCA gate reports no blocking runtime advisory after this resolution. This is an internal runtime remediation item and must never be classified as an Expo-only external toolchain exception.
