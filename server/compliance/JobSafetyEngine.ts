export type SafetyActivityStatus = "allowed" | "restricted" | "high_risk" | "prohibited" | "emergency_only";

export type JobSafetyRuleRecord = {
  id: number;
  activityStatus: SafetyActivityStatus;
  prerequisitesJson: Record<string, unknown>;
};

/** A matching active server rule is mandatory; no matching rule preserves catalog policy. */
export function evaluateJobSafety(input: {
  rules: JobSafetyRuleRecord[];
  isEmergency: boolean;
  insuranceEligible: boolean;
  classificationEligible: boolean;
}): { allowed: boolean; reason: string; matchedRuleId: number | null } {
  const rule = input.rules[0] ?? null;
  if (!rule) return { allowed: true, reason: "NO_ACTIVE_SAFETY_RULE", matchedRuleId: null };
  if (rule.activityStatus === "prohibited") return { allowed: false, reason: "JOB_SAFETY_PROHIBITED", matchedRuleId: rule.id };
  if (rule.activityStatus === "emergency_only" && !input.isEmergency) return { allowed: false, reason: "JOB_SAFETY_EMERGENCY_ONLY", matchedRuleId: rule.id };
  const required = rule.prerequisitesJson;
  if (required.requiresVerifiedInsurance === true && !input.insuranceEligible) return { allowed: false, reason: "JOB_SAFETY_INSURANCE_REQUIRED", matchedRuleId: rule.id };
  if (required.requiresVerifiedOperatingModel === true && !input.classificationEligible) return { allowed: false, reason: "JOB_SAFETY_CLASSIFICATION_REQUIRED", matchedRuleId: rule.id };
  if (rule.activityStatus === "restricted" || rule.activityStatus === "high_risk") return { allowed: false, reason: "JOB_SAFETY_RESTRICTED_REVIEW_REQUIRED", matchedRuleId: rule.id };
  return { allowed: true, reason: "JOB_SAFETY_ALLOWED", matchedRuleId: rule.id };
}

