# Germany/Berlin CHECKPOINT A — Changeset and Test Evidence

**Baseline:** `70645d3c`  
**Scope:** Common Global Scaffold + Berlin evidence hardening.  
**Release state:** No country or capability activation. No publish. No Japan/Tokyo work.

## Migration Forward / Logical Rollback

| Migration | Forward effect | Additive evidence | Logical rollback |
|---|---|---|---|
| `0085_global_country_scaffold.sql` | Adds country deployment, jurisdiction, capability definition, source/legal/credential/connector/evidence, localization, decision, appeal, incident and activation-run tables | No `DROP`, `DELETE`, `TRUNCATE`, replacement or mutation of legacy Turkey/provider rows | Keep schema; all country feature flags remain `0`, state remains `SCAFFOLD_ONLY` or `SUSPENDED`; policy blocks transitions |
| `0086_global_country_capability_binding_berlin_scaffold.sql` | Adds nullable canonical capability link, 79 default-off definitions/policies, 10 research source rows, 4 PENDING connector rows and 6 legal locale shells | Existing `service_capabilities` stays authoritative; migration contains only `ALTER ... ADD`, `CREATE INDEX`, `INSERT` | Keep schema; Berlin 79 policy rows remain `BLOCKED`; no destructive down migration is authorized |

## Default-Off and Türkiye Isolation

| Control | Observed evidence | Outcome |
|---|---|---|
| Country state | DE/JP/US/CN `SCAFFOLD_ONLY`; RU `INFRA_ONLY_NO_GO` | No country path is activatable |
| Country feature flags | All 0 | Provider onboarding, discovery, booking, payments and AI disabled |
| Berlin policies | 79 total / 79 `BLOCKED` | Exact PASS allowlist empty |
| Berlin sources | 10 / 10 `SOURCE_UNVERIFIED` | No authoritative requirement binding |
| Berlin connectors | 4 / 4 `PENDING`, assurance `NONE` | No authority verification path |
| Berlin locales | 6 / 6 `DRAFT_MACHINE`, runtime selectable 0 | No user-facing legal content |
| Türkiye Blok 1 | Before/after source-state mutation count 0 | Existing NO-GO preserved |

## Authorization and State-Write Boundary

The new country scaffold introduces no provider-facing RPC that writes official source, legal approval, connector, release or enforcement state. Existing Faz 8-A tests remain the authoritative negative test set for provider capability profile writes: provider-owned declaration paths cannot override system enforcement, approval ledger validity is required, and stale writes are rejected. The country deployment policy is server-side and only narrows existing transition gates.

The generic `approval_ledger` table is an append-only data model: it has event rows and no update/delete policy path in the scaffold. No owner/admin mutation procedure was added in this checkpoint. A ledger row alone is intentionally not treated as activation evidence by `countryActivationPreflight`.

## Environment and Working Tree

Managed TiDB migration testing is **not** evidence of production deployment. Physical production/staging/development isolation and a production change record are unavailable; status remains `ENVIRONMENT_SEPARATION_UNVERIFIED`. The package records only test/staging-schema application. Git diff and working-tree evidence are captured in the final package manifest; no private environment value, connection string, credential or user data is included.

## TypeScript Memory Evidence

| Check | Result | Interpretation |
|---|---|---|
| `NODE_OPTIONS=--max-old-space-size=512 pnpm exec tsc --noEmit --skipLibCheck` | Node heap OOM / exit 134 | Not a PASS; a 512 MB-only CI worker is a build blocker |
| `NODE_OPTIONS=--max-old-space-size=1792 pnpm exec tsc --noEmit --skipLibCheck` | PASS | No TypeScript diagnostic; controlled higher-heap verification |
| Standard production bundle `pnpm build` | PASS | Backend bundle completed; does not prove a 512 MB typecheck budget |

The recursive process measurement recorded a **612,416 KiB** peak RSS for the 512 MB run. Node’s own final V8 trace showed 509.5 MB used against a 524.2 MB heap limit immediately before abort. This sandbox has no approved CI memory-budget record; therefore the minimum safe CI budget is **not certified**. The only reproducible successful command evidenced here is:

```bash
NODE_OPTIONS=--max-old-space-size=1792 pnpm exec tsc --noEmit --skipLibCheck
```

The 512 MB command must remain an external CI-capacity gate until a measured, approved build-budget decision exists. The final full regression after the legal-locale contract addition is **127 test files / 741 tests PASS**; targeted Germany/Türkiye policy evidence is **4 files / 20 tests PASS**.
