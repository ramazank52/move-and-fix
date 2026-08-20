export type SafetyActivityStatus =
  | "allowed"
  | "restricted"
  | "high_risk"
  | "prohibited"
  | "emergency_only"
  | "not_required"
  | "unknown";

export type JobSafetyRuleRecord = {
  id: number;
  activityStatus: SafetyActivityStatus;
  prerequisitesJson: Record<string, unknown>;
};

const KNOWN_PREREQUISITES = new Set([
  "requiresVerifiedInsurance",
  "requiresVerifiedOperatingModel",
]);

function validatePrerequisites(prerequisites: Record<string, unknown>): { valid: true } | { valid: false; reason: string } {
  if (!prerequisites || Array.isArray(prerequisites) || typeof prerequisites !== "object") {
    return { valid: false, reason: "JOB_SAFETY_PREREQUISITES_MALFORMED" };
  }

  for (const [key, value] of Object.entries(prerequisites)) {
    if (!KNOWN_PREREQUISITES.has(key) || typeof value !== "boolean") {
      return { valid: false, reason: "JOB_SAFETY_PREREQUISITES_UNKNOWN" };
    }
  }

  return { valid: true };
}

/**
 * A matching active, server-owned rule is mandatory for a safety-relevant
 * provider transition. Absence is an unresolved safety state, never an allow.
 */
export function evaluateJobSafety(input: {
  rules: JobSafetyRuleRecord[];
  isEmergency: boolean;
  insuranceEligible: boolean;
  classificationEligible: boolean;
}): { allowed: boolean; reason: string; matchedRuleId: number | null } {
  const rule = input.rules[0] ?? null;
  if (!rule) return { allowed: false, reason: "JOB_SAFETY_RULE_UNKNOWN", matchedRuleId: null };

  const prerequisiteCheck = validatePrerequisites(rule.prerequisitesJson);
  if (!prerequisiteCheck.valid) {
    return { allowed: false, reason: prerequisiteCheck.reason, matchedRuleId: rule.id };
  }

  if (rule.activityStatus === "unknown") {
    return { allowed: false, reason: "JOB_SAFETY_UNKNOWN", matchedRuleId: rule.id };
  }
  if (rule.activityStatus === "prohibited") return { allowed: false, reason: "JOB_SAFETY_PROHIBITED", matchedRuleId: rule.id };
  if (rule.activityStatus === "emergency_only" && !input.isEmergency) return { allowed: false, reason: "JOB_SAFETY_EMERGENCY_ONLY", matchedRuleId: rule.id };
  const required = rule.prerequisitesJson;
  if (required.requiresVerifiedInsurance === true && !input.insuranceEligible) return { allowed: false, reason: "JOB_SAFETY_INSURANCE_REQUIRED", matchedRuleId: rule.id };
  if (required.requiresVerifiedOperatingModel === true && !input.classificationEligible) return { allowed: false, reason: "JOB_SAFETY_CLASSIFICATION_REQUIRED", matchedRuleId: rule.id };
  if (rule.activityStatus === "not_required") {
    return { allowed: true, reason: "JOB_SAFETY_NOT_REQUIRED", matchedRuleId: rule.id };
  }
  if (rule.activityStatus === "restricted") return { allowed: false, reason: "JOB_SAFETY_RESTRICTED_REVIEW_REQUIRED", matchedRuleId: rule.id };
  if (rule.activityStatus === "high_risk") return { allowed: true, reason: "JOB_SAFETY_HIGH_RISK_PREREQUISITES_SATISFIED", matchedRuleId: rule.id };
  if (rule.activityStatus !== "allowed" && rule.activityStatus !== "emergency_only") {
    return { allowed: false, reason: "JOB_SAFETY_STATUS_UNKNOWN", matchedRuleId: rule.id };
  }
  return { allowed: true, reason: "JOB_SAFETY_ALLOWED", matchedRuleId: rule.id };
}
