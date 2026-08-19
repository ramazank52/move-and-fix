import {
  assertProductionEnvironmentContract,
  validateEnvironmentContract,
} from "../security/EnvironmentContract";

function requiredInProduction(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (process.env.NODE_ENV === "production" && !value) {
    throw new Error(`${name} must be configured in production`);
  }
  return value;
}

const environmentContract = validateEnvironmentContract();
if (process.env.NODE_ENV === "production") {
  assertProductionEnvironmentContract(environmentContract);
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  aiPriceIntelligenceNarrativeEnabled:
    process.env.AI_PRICE_INTELLIGENCE_NARRATIVE_ENABLED === "true",
  paymentCallbackBaseUrl: environmentContract.values.paymentCallbackBaseUrl,
  paymentMobileReturnUrl: process.env.PAYMENT_MOBILE_RETURN_URL ?? "",
  paymentGatewayTimeoutMs: Math.max(
    1_000,
    Number.parseInt(process.env.PAYMENT_GATEWAY_TIMEOUT_MS ?? "12000", 10) || 12_000,
  ),
  iyzicoApiKey: process.env.IYZICO_API_KEY ?? "",
  iyzicoSecretKey: process.env.IYZICO_SECRET_KEY ?? "",
  iyzicoBaseUrl: process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com",
  iyzicoWebhookSecret: environmentContract.values.iyzicoWebhookSecret,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? "",
  verificationEmailFrom: process.env.VERIFICATION_EMAIL_FROM ?? "",
  netgsmUsername: environmentContract.values.netgsmUsername,
  netgsmPassword: environmentContract.values.netgsmPassword,
  netgsmMsgHeader: environmentContract.values.netgsmMsgHeader,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  proxyCommProviderBaseUrl: environmentContract.values.proxyCommProviderBaseUrl,
  proxyCommProviderApiKey: environmentContract.values.proxyCommProviderApiKey,
  apmEndpoint: environmentContract.values.apmEndpoint,
  apmApiKey: environmentContract.values.apmApiKey,
  completionAutoReleaseSecret: environmentContract.values.escrowReleaseCronSecret,
  financialReconciliationSecret: process.env.FINANCIAL_RECONCILIATION_CRON_SECRET ?? "",
  complianceReverificationSecret: process.env.COMPLIANCE_REVERIFICATION_CRON_SECRET ?? "",
  documentRetentionSecret: environmentContract.values.documentRetentionCronSecret,
  mediaScannerCallbackSecret: environmentContract.values.mediaScannerCallbackSecret,
  mediaScannerCallbackPreviousSecret: environmentContract.values.mediaScannerCallbackPreviousSecret,
  mediaScannerSubmissionUrl: process.env.MEDIA_SCANNER_SUBMISSION_URL ?? "",
  mediaScannerSubmissionApiKey: environmentContract.values.mediaScannerSubmissionApiKey,
  encryptionKey: requiredInProduction("ENCRYPTION_KEY"),
  encryptionKeyVersion: environmentContract.values.encryptionKeyVersion || "v1",
  encryptionPreviousKey: environmentContract.values.encryptionPreviousKey,
  encryptionPreviousKeyVersion: environmentContract.values.encryptionPreviousKeyVersion,
  unsubscribeSecret: requiredInProduction("UNSUBSCRIBE_SECRET"),
  environmentContractIssues: environmentContract.issues.map(({ code, canonicalName }) => ({ code, canonicalName })),
};
