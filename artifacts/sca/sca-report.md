# P17 Deterministic SCA Report

- **Gate:** PASS
- **Distinct advisory identities:** 4
- **Blocking release advisories:** 0
- **Approved upstream/toolchain exceptions:** 2
- **Historical P16 raw audit evidence:** MISSING_FROM_TRACKED_HISTORY — P17 raw audit is preserved; P16 raw audit must be supplied from immutable audit evidence, not recreated.

| Advisory | Installed package | Severity | Surface | Patched version | Disposition |
|---|---|---|---|---|---|
| GHSA-w5hq-g745-h8pq | uuid@7.0.3 | moderate | toolchain | >=11.1.1 | UNAPPROVED_TOOLCHAIN_REVIEW_REQUIRED |
| GHSA-w5hq-g745-h8pq | uuid@8.3.2 | moderate | toolchain | >=11.1.1 | UNAPPROVED_TOOLCHAIN_REVIEW_REQUIRED |
| GHSA-w3rx-r6r6-pgpr | image-size@1.2.1 | high | toolchain | NO_PATCH_DECLARED | APPROVED_TOOLCHAIN_EXCEPTION |
| GHSA-5p2g-fcmc-qvqq | image-size@1.2.1 | high | toolchain | NO_PATCH_DECLARED | APPROVED_TOOLCHAIN_EXCEPTION |

Each row is derived from the same `pnpm audit --prod --json` input as `sca-report.json`; CI fails when a high/critical **patchable runtime** finding or an **unapproved high/critical toolchain** finding remains. Toolchain exceptions require an exact advisory/package/version/path review record.
