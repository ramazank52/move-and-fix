# Germany/Berlin — Legal Locale Evidence

**Country / locale:** `DE` / `DE-BE-BERLIN` / `de-DE`  
**Runtime rule:** `DRAFT_MACHINE` is not a legal-language fallback and is never runtime-selectable.

| Legal document key | Planned UI / document surface | Existing Germany runtime surface | Missing legal surface content | Version | Content hash | Localization state | Runtime selectable | Human translator | Independent linguist | Local counsel | Product release approval | Runtime fallback test |
|---|---|---|---|---|---|---|---:|---|---|---|---|---|
| `DE-BE-CONSUMER-TERMS` | Consumer terms | No Germany country runtime route | Full de-DE approved content | `0.0.0-draft-machine` | `NULL` | `DRAFT_MACHINE` | 0 | Unassigned | Unassigned | Unassigned | Absent | `LEGAL_LOCALE_BLOCKED:DRAFT_MACHINE` |
| `DE-BE-PROVIDER-AGREEMENT` | Provider agreement | No Germany country runtime route | Full de-DE approved content | `0.0.0-draft-machine` | `NULL` | `DRAFT_MACHINE` | 0 | Unassigned | Unassigned | Unassigned | Absent | `LEGAL_LOCALE_BLOCKED:DRAFT_MACHINE` |
| `DE-BE-PRIVACY-NOTICE` | Privacy notice | No Germany country runtime route | Full de-DE approved content | `0.0.0-draft-machine` | `NULL` | `DRAFT_MACHINE` | 0 | Unassigned | Unassigned | Unassigned | Absent | `LEGAL_LOCALE_BLOCKED:DRAFT_MACHINE` |
| `DE-BE-COOKIE-NOTICE` | Cookie notice | No Germany country runtime route | Full de-DE approved content | `0.0.0-draft-machine` | `NULL` | `DRAFT_MACHINE` | 0 | Unassigned | Unassigned | Unassigned | Absent | `LEGAL_LOCALE_BLOCKED:DRAFT_MACHINE` |
| `DE-BE-APPEAL-NOTICE` | Appeal notice | No Germany country runtime route | Full de-DE approved content | `0.0.0-draft-machine` | `NULL` | `DRAFT_MACHINE` | 0 | Unassigned | Unassigned | Unassigned | Absent | `LEGAL_LOCALE_BLOCKED:DRAFT_MACHINE` |
| `DE-BE-INCIDENT-NOTICE` | Incident notice | No Germany country runtime route | Full de-DE approved content | `0.0.0-draft-machine` | `NULL` | `DRAFT_MACHINE` | 0 | Unassigned | Unassigned | Unassigned | Absent | `LEGAL_LOCALE_BLOCKED:DRAFT_MACHINE` |

## Runtime Test Evidence

`tests/global-country-scaffold-contract.test.ts` now calls `legalLocaleRuntimeBlockReason`. It proves the following fail-closed outcomes:

| Input | Expected result |
|---|---|
| `DRAFT_MACHINE`, `runtimeSelectable=0` | `LEGAL_LOCALE_BLOCKED:DRAFT_MACHINE` |
| `LEGAL_REVIEWED`, `runtimeSelectable=1` | `LEGAL_LOCALE_BLOCKED:STATE_LEGAL_REVIEWED` |
| `APPROVED_PRODUCTION`, `runtimeSelectable=0` | `LEGAL_LOCALE_BLOCKED:RUNTIME_SELECTION_DISABLED` |

The preflight contract separately returns `LEGAL_LOCALE_NOT_APPROVED` when legal locale readiness is absent. No source or legal text is invented in this evidence package; the `NULL` content hashes mean no immutable legal content artifact was received or certified.
