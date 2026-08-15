export type AssuranceLevel = "A" | "B" | "C" | "D" | "E" | "F";
export type CapabilityDecision =
  | "VERIFIED"
  | "VERIFIED_LIMITED_SCOPE"
  | "MANUAL_REVIEW"
  | "REJECTED"
  | "EXPIRED_OR_SUSPENDED"
  | "LEGAL_REVIEW_REQUIRED";

export interface CapabilityRuleInput {
  packageStatus: "draft" | "legal_review" | "approved" | "enabled" | "blocked" | "retired";
  ruleStatus: "unknown" | "required" | "not_required" | "prohibited";
  minimumAssurance: AssuranceLevel;
  requiresHumanReview: boolean;
  sourceVerified: boolean;
  sourceRevoked?: boolean;
}

export interface CredentialInput {
  status: "submitted" | "verified" | "rejected" | "expired" | "suspended" | "revoked";
  assuranceLevel: AssuranceLevel;
  expiresAt?: Date | null;
  humanReviewed: boolean;
  limitedScope?: boolean;
  scopeNote?: string | null;
}

export interface CapabilityEvaluation {
  decision: CapabilityDecision;
  eligible: boolean;
  reason: string;
}

const assuranceRank: Record<AssuranceLevel, number> = {
  F: 0,
  E: 1,
  D: 2,
  C: 3,
  B: 4,
  A: 5,
};

/**
 * Deterministic and intentionally fail-closed. This function never performs
 * OCR, external calls, or legal interpretation; callers must supply an
 * admin-reviewed official rule and credential state.
 */
export function evaluateCapability(
  rule: CapabilityRuleInput | null | undefined,
  credential: CredentialInput | null | undefined,
  now = new Date(),
): CapabilityEvaluation {
  if (!rule || rule.packageStatus !== "enabled" || rule.ruleStatus === "unknown") {
    return { decision: "LEGAL_REVIEW_REQUIRED", eligible: false, reason: "No enabled legal rule exists for this capability." };
  }
  if (rule.ruleStatus === "prohibited") {
    return { decision: "REJECTED", eligible: false, reason: "The capability is prohibited in this jurisdiction." };
  }
  if (!rule.sourceVerified || rule.sourceRevoked) {
    return { decision: "LEGAL_REVIEW_REQUIRED", eligible: false, reason: "The official compliance source is not verified." };
  }
  if (!credential) {
    return { decision: "MANUAL_REVIEW", eligible: false, reason: "No credential is available for review." };
  }
  if (credential.status === "expired" || credential.status === "suspended" || credential.status === "revoked" || (credential.expiresAt && credential.expiresAt <= now)) {
    return { decision: "EXPIRED_OR_SUSPENDED", eligible: false, reason: "The credential is expired, suspended, or revoked." };
  }
  if (credential.status === "rejected") {
    return { decision: "REJECTED", eligible: false, reason: "The credential was rejected by human review." };
  }
  if (credential.status !== "verified" || (rule.requiresHumanReview && !credential.humanReviewed)) {
    return { decision: "MANUAL_REVIEW", eligible: false, reason: "Human credential review is required." };
  }
  if (credential.assuranceLevel === "F" || assuranceRank[credential.assuranceLevel] < assuranceRank[rule.minimumAssurance]) {
    return { decision: "MANUAL_REVIEW", eligible: false, reason: "Credential assurance is below the rule minimum." };
  }
  if (credential.limitedScope) {
    return { decision: "VERIFIED_LIMITED_SCOPE", eligible: true, reason: credential.scopeNote ?? "The credential is valid for a limited scope." };
  }
  return { decision: "VERIFIED", eligible: true, reason: "Credential and enabled rule requirements are satisfied." };
}

export function canProviderAppeal(providerId: number, capabilityOwnerProviderId: number, decision: CapabilityDecision): boolean {
  return providerId === capabilityOwnerProviderId && ["REJECTED", "EXPIRED_OR_SUSPENDED", "MANUAL_REVIEW"].includes(decision);
}
