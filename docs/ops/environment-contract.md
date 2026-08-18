# P13 Canonical Environment Contract

Production configuration uses one canonical server-side name per integration. Secret values are never logged, copied to the mobile bundle, or committed to source control.

| Integration | Canonical server variables | One-release compatibility alias |
|---|---|---|
| Media scanner callback and dispatch | `MEDIA_SCANNER_CALLBACK_SECRET`, `MEDIA_SCANNER_SUBMISSION_URL`, `MEDIA_SCANNER_SUBMISSION_API_KEY` | `MEDIA_SCANNER_WEBHOOK_SECRET` for callback secret only |
| NetGSM | `NETGSM_USERNAME`, `NETGSM_PASSWORD`, `NETGSM_MSG_HEADER` | `NETGSM_MSGHEADER` |
| Proxy communication | `PROXY_COMM_PROVIDER_BASE_URL`, `PROXY_COMM_PROVIDER_API_KEY` | `PROXY_TELEPHONY_BASE_URL`, `PROXY_TELEPHONY_API_KEY` |
| iyzico | `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_WEBHOOK_SECRET`, `IYZICO_BASE_URL` | None |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | None |
| Payment return URL | `PAYMENT_CALLBACK_BASE_URL`, `PAYMENT_MOBILE_RETURN_URL`, `PAYMENT_GATEWAY_TIMEOUT_MS` | `API_BASE_URL` for callback base URL only |
| Scheduled operations | `ESCROW_RELEASE_CRON_SECRET`, `FINANCIAL_RECONCILIATION_CRON_SECRET`, `COMPLIANCE_REVERIFICATION_CRON_SECRET`, `DOCUMENT_RETENTION_CRON_SECRET` | `COMPLETION_AUTO_RELEASE_SECRET` for escrow release only |

> An unset provider remains **NOT_CONFIGURED**. A partially configured provider or contradictory canonical/alias pair makes production startup fail with `ENVIRONMENT_CONTRACT_INVALID`; it never silently chooses a secret or treats an integration as operational.

Compatibility aliases are observable through redacted issue codes only and must be removed after the transition release. The canonical contract is covered by `tests/environment-contract.test.ts`.
