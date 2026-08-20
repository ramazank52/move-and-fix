export type EnvironmentRecord = Record<string, string | undefined>;

export type EnvironmentContractIssue = {
  code: "DEPRECATED_ALIAS" | "CONFLICTING_NAMES" | "PARTIAL_PROVIDER_CONFIGURATION";
  canonicalName: string;
  message: string;
};

type EnvironmentDefinition = {
  canonicalName: string;
  aliases?: readonly string[];
};

const DEFINITIONS = {
  encryptionKey: { canonicalName: "ENCRYPTION_KEY" },
  encryptionKeyVersion: { canonicalName: "ENCRYPTION_KEY_VERSION" },
  encryptionPreviousKey: { canonicalName: "ENCRYPTION_KEY_PREVIOUS" },
  encryptionPreviousKeyVersion: { canonicalName: "ENCRYPTION_KEY_PREVIOUS_VERSION" },
  encryptionLegacyKey: { canonicalName: "ENCRYPTION_LEGACY_KEY" },
  mediaScannerCallbackSecret: {
    canonicalName: "MEDIA_SCANNER_CALLBACK_SECRET",
    aliases: ["MEDIA_SCANNER_WEBHOOK_SECRET"],
  },
  mediaScannerCallbackPreviousSecret: { canonicalName: "MEDIA_SCANNER_CALLBACK_PREVIOUS_SECRET" },
  mediaScannerSubmissionApiKey: { canonicalName: "MEDIA_SCANNER_SUBMISSION_API_KEY" },
  mediaScannerCronSecret: { canonicalName: "MEDIA_SCANNER_CRON_SECRET" },
  documentRetentionCronSecret: { canonicalName: "DOCUMENT_RETENTION_CRON_SECRET" },
  apmEndpoint: { canonicalName: "APM_ENDPOINT" },
  apmApiKey: { canonicalName: "APM_API_KEY" },
  netgsmUsername: { canonicalName: "NETGSM_USERNAME" },
  netgsmPassword: { canonicalName: "NETGSM_PASSWORD" },
  netgsmMsgHeader: {
    canonicalName: "NETGSM_MSG_HEADER",
    aliases: ["NETGSM_MSGHEADER"],
  },
  proxyCommProviderBaseUrl: {
    canonicalName: "PROXY_COMM_PROVIDER_BASE_URL",
    aliases: ["PROXY_TELEPHONY_BASE_URL"],
  },
  proxyCommProviderApiKey: {
    canonicalName: "PROXY_COMM_PROVIDER_API_KEY",
    aliases: ["PROXY_TELEPHONY_API_KEY"],
  },
  paymentCallbackBaseUrl: {
    canonicalName: "PAYMENT_CALLBACK_BASE_URL",
    aliases: ["API_BASE_URL"],
  },
  escrowReleaseCronSecret: {
    canonicalName: "ESCROW_RELEASE_CRON_SECRET",
    aliases: ["COMPLETION_AUTO_RELEASE_SECRET"],
  },
  iyzicoWebhookSecret: { canonicalName: "IYZICO_WEBHOOK_SECRET" },
  stripeWebhookSecret: { canonicalName: "STRIPE_WEBHOOK_SECRET" },
} as const satisfies Record<string, EnvironmentDefinition>;

export type CanonicalEnvironmentValues = {
  [Key in keyof typeof DEFINITIONS]: string;
};

export type EnvironmentContractValidation = {
  values: CanonicalEnvironmentValues;
  issues: EnvironmentContractIssue[];
  hasFatalConfigurationError: boolean;
};

function normalizedValue(env: EnvironmentRecord, name: string): string {
  return env[name]?.trim() ?? "";
}

function resolveCanonicalValue(
  env: EnvironmentRecord,
  definition: EnvironmentDefinition,
  issues: EnvironmentContractIssue[],
): string {
  const canonicalValue = normalizedValue(env, definition.canonicalName);
  const aliasEntries = (definition.aliases ?? [])
    .map((alias) => ({ alias, value: normalizedValue(env, alias) }))
    .filter((entry) => entry.value.length > 0);

  if (canonicalValue && aliasEntries.some((entry) => entry.value !== canonicalValue)) {
    issues.push({
      code: "CONFLICTING_NAMES",
      canonicalName: definition.canonicalName,
      message: `${definition.canonicalName} conflicts with a deprecated alias`,
    });
    return "";
  }

  if (canonicalValue) return canonicalValue;
  if (aliasEntries.length === 0) return "";

  issues.push({
    code: "DEPRECATED_ALIAS",
    canonicalName: definition.canonicalName,
    message: `${definition.canonicalName} is supplied through a deprecated alias`,
  });
  return aliasEntries[0].value;
}

function recordPartialConfiguration(
  issues: EnvironmentContractIssue[],
  label: string,
  values: readonly string[],
): void {
  if (values.some(Boolean) && !values.every(Boolean)) {
    issues.push({
      code: "PARTIAL_PROVIDER_CONFIGURATION",
      canonicalName: label,
      message: `${label} is only partially configured`,
    });
  }
}

/**
 * Resolves all supported aliases without exposing a secret value. Callers must
 * use canonical keys for new configuration; aliases exist for one release only.
 */
export function validateEnvironmentContract(env: EnvironmentRecord = process.env): EnvironmentContractValidation {
  const issues: EnvironmentContractIssue[] = [];
  const values = Object.fromEntries(
    Object.entries(DEFINITIONS).map(([key, definition]) => [
      key,
      resolveCanonicalValue(env, definition, issues),
    ]),
  ) as CanonicalEnvironmentValues;

  recordPartialConfiguration(issues, "IYZICO", [
    normalizedValue(env, "IYZICO_API_KEY"),
    normalizedValue(env, "IYZICO_SECRET_KEY"),
    values.iyzicoWebhookSecret,
  ]);
  recordPartialConfiguration(issues, "STRIPE", [
    normalizedValue(env, "STRIPE_SECRET_KEY"),
    values.stripeWebhookSecret,
  ]);
  recordPartialConfiguration(issues, "NETGSM", [
    values.netgsmUsername,
    values.netgsmPassword,
    values.netgsmMsgHeader,
  ]);
  recordPartialConfiguration(issues, "PROXY_COMM", [
    values.proxyCommProviderBaseUrl,
    values.proxyCommProviderApiKey,
  ]);
  recordPartialConfiguration(issues, "APM", [values.apmEndpoint, values.apmApiKey]);
  recordPartialConfiguration(issues, "ENCRYPTION_ROTATION", [
    values.encryptionPreviousKey,
    values.encryptionPreviousKeyVersion,
  ]);

  return {
    values,
    issues,
    hasFatalConfigurationError: issues.some((issue) => issue.code !== "DEPRECATED_ALIAS"),
  };
}

export function assertProductionEnvironmentContract(validation: EnvironmentContractValidation): void {
  if (validation.hasFatalConfigurationError) {
    throw new Error("ENVIRONMENT_CONTRACT_INVALID");
  }
}
