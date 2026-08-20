# P17 Source Instructions Register

## Authoritative task inputs

| Source file | Local source | Purpose |
|---|---|---|
| P17 primary closure command | `/home/ubuntu/upload/Pasted_content_05.txt` | P17-01–P17-17 source-truth correction scope, test gates, release classification and required evidence. |
| P17 supplementary clauses | `/home/ubuntu/upload/P17_EK_MADDELER.txt` | Additional P17 acceptance clauses; applied without weakening the primary closure command. |

## Binding implementation principles

1. The P16 checkpoint `a314ce97` is the baseline. P17 work is isolated on `p17-verified-closure`.
2. Unknown legal, capability, credential, safety and scanner states remain blocked or fail-closed; no credential, legal text or deployment result is invented.
3. Each completed P17 item requires focused behavioral coverage, full regression and a separate reversible checkpoint.
4. Additive migration discipline applies: manually reviewed SQL and journal records only; automatically generated duplicate Drizzle artefacts are removed.
5. Final evidence must distinguish verified internal closure from external credential, legal, device and deployment gates.

## P17-04 preserved requirement

Legacy three-part encryption payloads must never fall back to the active encryption key. They may decrypt only when `LEGACY_ENCRYPTION_KEY` is explicitly configured; missing, malformed or wrong legacy material must fail closed. Versioned key-ring behavior remains independent and unchanged.
