# Theme Runtime Harness — Local Isolated Runbook

This harness is **not** part of the production application or production build. It is available only under `scripts/` and starts by refusing an ambiguous or production-marked environment. It must never be pointed at production data, a production hostname, a production database identifier, or a credential-bearing URL.

> The current sandbox does not have a local TiDB/MySQL listener, TiUP/TiDB components, or a container runtime. Therefore, the harness remains blocked here and must not create a fixture in this environment.

## Required Local Environment

Use a local TiDB Playground-compatible machine. Create one database whose name is exactly `theme_audit_<run_id>` and bind it to `127.0.0.1` only. The `DATABASE_URL` must contain no production marker and must target only this isolated database. Copy `scripts/theme-runtime-harness.env.example` outside the repository and set a unique `THEME_HARNESS_RUN_ID` matching `theme-<uuid-suffix>`.

| Control | Required behavior |
|---|---|
| Preflight | Explicit `development`, `test`, or `staging`; acknowledgement `HARNESS_ALLOW_STAGING=1`; non-production localhost/approved host only |
| Fixtures | Synthetic `*.invalid` identities, run-ID-tagged login method and exact private manifest only |
| Cleanup | `try/finally`, exact run-ID constraints, orphan count must be 0; no `TRUNCATE` or broad delete |
| Network | Do not configure real email, SMS, push, payment, or third-party delivery adapters |
| Visual backend | Explicitly configure a local non-production backend; an absent backend is `BLOCKED_VISUAL_BACKEND`, not PASS |

## Commands

Run the preflight first. A nonzero/blocked result is correct and must not be bypassed:

```bash
pnpm tsx scripts/theme-runtime-harness.ts
```

After an approved local preflight and a configured local visual backend, run the scoped fixture smoke flow:

```bash
pnpm tsx scripts/theme-runtime-harness.ts --fixture-smoke
```

The harness writes its private manifest to `/tmp/movefix-theme-runtime-harness/<run_id>.json`, uses it only for exact-ID recovery, and removes it after successful cleanup. A crash recovery invocation must run only against the same local isolated database.
