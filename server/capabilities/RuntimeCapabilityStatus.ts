export type RuntimeCapabilityKey =
  | "payment"
  | "maps"
  | "push"
  | "sounds"
  | "sms"
  | "email"
  | "move_ai"
  | "documents"
  | "media"
  | "camera_ar";

export type RuntimeCapabilityState =
  | "AVAILABLE"
  | "NOT_CONFIGURED"
  | "NOT_SUPPORTED"
  | "TEMPORARILY_UNAVAILABLE"
  | "PERMISSION_REQUIRED"
  | "OFFLINE"
  | "UNAUTHORIZED";

export type RuntimeCapabilityStatus = {
  key: RuntimeCapabilityKey;
  state: RuntimeCapabilityState;
  reasonCode: string;
};

type RuntimeEnvironment = Record<string, string | undefined>;

const configured = (environment: RuntimeEnvironment, ...keys: string[]) => keys.every((key) => Boolean(environment[key]?.trim()));

/**
 * Returns non-sensitive, server-owned readiness facts. A configured credential
 * never means a live provider delivery was attempted or succeeded.
 */
export function resolveRuntimeCapabilityStatuses(environment: RuntimeEnvironment = process.env): RuntimeCapabilityStatus[] {
  const paymentConfigured = configured(environment, "IYZICO_API_KEY", "IYZICO_SECRET_KEY")
    || configured(environment, "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET");
  const mediaScannerConfigured = configured(environment, "MEDIA_SCANNER_SUBMISSION_URL");
  return [
    { key: "payment", state: paymentConfigured ? "AVAILABLE" : "NOT_CONFIGURED", reasonCode: paymentConfigured ? "PAYMENT_CONFIG_PRESENT_NO_DELIVERY_PROOF" : "PAYMENT_PROVIDER_CREDENTIALS_MISSING" },
    { key: "maps", state: "NOT_CONFIGURED", reasonCode: "SERVER_OWNED_MAP_PROVIDER_NOT_CONFIGURED" },
    { key: "push", state: "NOT_CONFIGURED", reasonCode: "EXTERNAL_PUSH_DELIVERY_DISABLED" },
    { key: "sounds", state: "AVAILABLE", reasonCode: "LOCAL_CLIENT_AUDIO_SURFACE" },
    { key: "sms", state: "NOT_CONFIGURED", reasonCode: "SMS_PROVIDER_CREDENTIALS_MISSING" },
    { key: "email", state: configured(environment, "SENDGRID_API_KEY") ? "AVAILABLE" : "NOT_CONFIGURED", reasonCode: configured(environment, "SENDGRID_API_KEY") ? "EMAIL_CONFIG_PRESENT_NO_DELIVERY_PROOF" : "EMAIL_PROVIDER_CREDENTIALS_MISSING" },
    { key: "move_ai", state: configured(environment, "OPENAI_API_KEY") ? "AVAILABLE" : "NOT_CONFIGURED", reasonCode: configured(environment, "OPENAI_API_KEY") ? "MOVE_AI_CONFIG_PRESENT" : "MOVE_AI_PROVIDER_NOT_CONFIGURED" },
    { key: "documents", state: mediaScannerConfigured ? "AVAILABLE" : "NOT_CONFIGURED", reasonCode: mediaScannerConfigured ? "DOCUMENT_SCANNER_CONFIG_PRESENT_NO_SCAN_PROOF" : "DOCUMENT_SCANNER_NOT_CONFIGURED" },
    { key: "media", state: mediaScannerConfigured ? "AVAILABLE" : "NOT_CONFIGURED", reasonCode: mediaScannerConfigured ? "MEDIA_SCANNER_CONFIG_PRESENT_NO_SCAN_PROOF" : "MEDIA_SCANNER_NOT_CONFIGURED" },
    { key: "camera_ar", state: "NOT_SUPPORTED", reasonCode: "VERIFIED_NATIVE_AR_ADAPTER_UNAVAILABLE" },
  ];
}
