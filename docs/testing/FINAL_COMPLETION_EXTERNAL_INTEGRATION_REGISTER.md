# Final Completion — External Integration Register

**Baseline:** `5082c89d`  
**Rule:** This register does not inspect or request any secret value. It records only code-path and evidence status.

| Integration | Internal code contract | Runtime status | Required external evidence |
|---|---|---|---|
| iyzico / Stripe payment and webhook | Payment/settlement policy, idempotency and reconciliation contracts are tested; unconfigured paths fail closed. | `EXTERNAL_CONFIGURATION_REQUIRED` | Sandbox credential, signing secret, webhook endpoint and reconciled sandbox transaction. |
| NetGSM / SMS OTP | Provider contract exists; no synthetic delivery result is accepted. | `EXTERNAL_CONFIGURATION_REQUIRED` | Provider account, credentials, approved sender/header and device receipt evidence. |
| Email / SMTP or SendGrid | Account/verification flow is code-tested but delivery is not claimed. | `EXTERNAL_CONFIGURATION_REQUIRED` | Configured provider, sender/domain verification and controlled inbox receipt. |
| Expo/FCM/APNs push | Notification adapter and retry contracts are tested. | `EXTERNAL_CONFIGURATION_REQUIRED` | Platform credentials, physical device token and delivery receipt. |
| Malware scanner callback | Pending-scan media access is denied; callback verification/replay/rotation contracts are tested. | `EXTERNAL_CONFIGURATION_REQUIRED` | Scanner service, callback secret, signed callback and clean/blocked operational evidence. |
| Storage / document media | Access/quarantine policy is tested; no external storage delivery or document authenticity claim is made. | `EXTERNAL_CONFIGURATION_REQUIRED` | Production storage policy, scanner workflow and controlled document-access verification. |
| OAuth / production domain | Session/OAuth code paths exist; local developer status is not a production domain assertion. | `EXTERNAL_CONFIGURATION_REQUIRED` | Production domain, HTTPS, redirect URI registration and real provider callback. |
| Retention scheduler / observability | Fail-closed scheduler/secret boundaries and redaction contracts are tested. | `EXTERNAL_CONFIGURATION_REQUIRED` | Cron secret, durable execution environment, APM credentials and monitored run evidence. |

No credential was requested, added, read or embedded. None of these rows may be converted into provider-delivery PASS, country/capability activation or publish authority without the listed controlled external evidence.
