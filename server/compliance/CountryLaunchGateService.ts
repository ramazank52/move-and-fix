export const COUNTRY_LAUNCH_REQUIREMENTS = [
  "service_compliance",
  "credential_rules",
  "official_sources",
  "platform_law",
  "payments",
  "payment_provider_license",
  "operational_payment_provider",
  "tax",
  "privacy",
  "worker_classification",
  "insurance",
  "consumer_rules",
  "ai_rules",
  "safety",
  "support",
  "store_compliance",
  "legal_sign_off",
  "privacy_sign_off",
  "payment_sign_off",
  "security_sign_off",
  "production_tests",
] as const;

export type CountryLaunchRequirement = (typeof COUNTRY_LAUNCH_REQUIREMENTS)[number];
export type CountryLaunchChecklist = Record<CountryLaunchRequirement, boolean>;

export function createEmptyCountryLaunchChecklist(): CountryLaunchChecklist {
  return Object.fromEntries(COUNTRY_LAUNCH_REQUIREMENTS.map((key) => [key, false])) as CountryLaunchChecklist;
}

export function parseCountryLaunchChecklist(value: string | null | undefined): CountryLaunchChecklist {
  const empty = createEmptyCountryLaunchChecklist();
  if (!value) return empty;
  try {
    const candidate = JSON.parse(value) as Record<string, unknown>;
    for (const key of COUNTRY_LAUNCH_REQUIREMENTS) empty[key] = candidate[key] === true;
  } catch {
    // Persisted data that cannot be parsed must never accidentally open a country.
  }
  return empty;
}

export function evaluateCountryLaunch(input: {
  checklist: CountryLaunchChecklist;
  compliancePackageStatus: "draft" | "legal_review" | "approved" | "enabled" | "blocked" | "retired" | null;
  hasVerifiedOfficialSource: boolean;
  countryCode?: string;
  hasOperationalPaymentProvider?: boolean;
}) {
  const missing = COUNTRY_LAUNCH_REQUIREMENTS.filter((key) => !input.checklist[key]);
  if (input.compliancePackageStatus !== "approved" && input.compliancePackageStatus !== "enabled") {
    missing.unshift("approved_compliance_package" as CountryLaunchRequirement);
  }
  if (!input.hasVerifiedOfficialSource) {
    missing.unshift("verified_official_source" as CountryLaunchRequirement);
  }
  // No country can open a paid marketplace solely because it is not Türkiye.
  // A country-specific payment readiness proof is always mandatory.
  if (input.hasOperationalPaymentProvider !== true) {
    missing.unshift("operational_payment_provider");
  }
  return {
    ready: missing.length === 0,
    missing: [...new Set(missing)],
    status: missing.length === 0 ? ("ready" as const) : ("blocked" as const),
  };
}
