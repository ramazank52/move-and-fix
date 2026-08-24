# Master Directive — P1.4 Marketplace Negative Security Evidence

**Status:** `PASS` for source/unit negative contracts; isolated runtime evidence remains separately blocked.  
**Checkpoint baseline:** `b266dc7b`

| Negative case | Evidence | Result |
|---|---|---|
| Stale capability | Central evaluator rejects `capabilityAllowed=false` before offer acceptance. | PASS |
| Expired/invalid credential | Central evaluator throws before acceptance when `credentialAllowed=false`. | PASS |
| Enforcement block | Provider enforcement state denies even if client-visible fields appear eligible. | PASS |
| Customer IDOR/BOLA acceptance | `acceptOffer` filters the service request by authenticated `userId` and rejects mismatch. | PASS by source contract plus existing offer-router tests |
| Concurrent accept guard | Conditional update includes request ID, customer ownership and pending status; conflict returns `OFFER_ACCEPT_CONFLICT`. | PASS by source contract; same-engine race test remains `BLOCKED_STAGING_RUNTIME` |
| Duplicate provider offer scope | Create path scopes duplicate check to `(requestId, providerId)`. | PASS by source contract |

**Test evidence:** targeted 4 files / 13 tests PASS; full regression 141 files / 773 tests PASS; TypeScript (1792 MB), lint, backend build, Drizzle check and `git diff --check` PASS.

This is not a TiDB transaction race PASS, route E2E, external delivery or production release assertion.
