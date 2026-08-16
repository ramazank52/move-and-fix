function requiredInProduction(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (process.env.NODE_ENV === "production" && !value) {
    throw new Error(`${name} must be configured in production`);
  }
  return value;
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
  paymentCallbackBaseUrl:
    process.env.PAYMENT_CALLBACK_BASE_URL ?? process.env.API_BASE_URL ?? "",
  paymentMobileReturnUrl: process.env.PAYMENT_MOBILE_RETURN_URL ?? "",
  paymentGatewayTimeoutMs: Math.max(
    1_000,
    Number.parseInt(process.env.PAYMENT_GATEWAY_TIMEOUT_MS ?? "12000", 10) || 12_000,
  ),
  iyzicoApiKey: process.env.IYZICO_API_KEY ?? "",
  iyzicoSecretKey: process.env.IYZICO_SECRET_KEY ?? "",
  iyzicoBaseUrl: process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com",
  iyzicoWebhookSecret:
    process.env.IYZICO_WEBHOOK_SECRET ?? process.env.IYZICO_SECRET_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? "",
  verificationEmailFrom: process.env.VERIFICATION_EMAIL_FROM ?? "",
  netgsmUsername: process.env.NETGSM_USERNAME ?? "",
  netgsmPassword: process.env.NETGSM_PASSWORD ?? "",
  netgsmMsgHeader: process.env.NETGSM_MSGHEADER ?? "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  proxyTelephonyBaseUrl: process.env.PROXY_TELEPHONY_BASE_URL ?? "",
  proxyTelephonyApiKey: process.env.PROXY_TELEPHONY_API_KEY ?? "",
  completionAutoReleaseSecret:
    process.env.ESCROW_RELEASE_CRON_SECRET ?? process.env.COMPLETION_AUTO_RELEASE_SECRET ?? "",
  financialReconciliationSecret: process.env.FINANCIAL_RECONCILIATION_CRON_SECRET ?? "",
  complianceReverificationSecret: process.env.COMPLIANCE_REVERIFICATION_CRON_SECRET ?? "",
  documentRetentionSecret: process.env.DOCUMENT_RETENTION_CRON_SECRET ?? "",
  encryptionKey: requiredInProduction("ENCRYPTION_KEY"),
  unsubscribeSecret: requiredInProduction("UNSUBSCRIBE_SECRET"),
};
