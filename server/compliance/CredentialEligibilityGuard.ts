export type CredentialAssurance = "A" | "B" | "C" | "D" | "E" | "F";

export type CredentialEligibilityInput = {
  requiredCredentialType: string | null;
  minimumAssurance: CredentialAssurance | null;
  requiresHumanReview: boolean | null;
  compliancePackageVersion: string | null;
  jurisdictionId: number | null;
  providerCredentials: Array<{
    jurisdictionId: number;
    credentialType: string;
    assuranceLevel: CredentialAssurance;
    status: "submitted" | "verified" | "rejected" | "expired" | "suspended" | "revoked";
    expiresAt: Date | null;
    verifiedAt: Date | null;
    reviewedByUserId: number | null;
    revocationStatus: "unknown" | "clear" | "revoked" | "check_failed";
    ruleVersion: string | null;
  }>;
  now?: Date;
};

export type CredentialEligibilityDecision =
  | { allowed: true; code: "CREDENTIAL_NOT_REQUIRED" | "CREDENTIAL_ELIGIBLE" }
  | {
      allowed: false;
      code:
        | "CREDENTIAL_CONTEXT_UNKNOWN"
        | "CREDENTIAL_NOT_VERIFIED"
        | "CREDENTIAL_EXPIRED"
        | "CREDENTIAL_REVOKED_OR_UNCHECKED"
        | "CREDENTIAL_ASSURANCE_INSUFFICIENT"
        | "CREDENTIAL_HUMAN_REVIEW_REQUIRED"
        | "CREDENTIAL_POLICY_VERSION_MISMATCH";
    };

const assuranceRank: Record<CredentialAssurance, number> = {
  A: 6,
  B: 5,
  C: 4,
  D: 3,
  E: 2,
  F: 1,
};

/**
 * Credentials are only eligible when a server-derived request context names a
 * concrete requirement and at least one record matches the exact jurisdiction,
 * active rule version and assurance threshold. Any unknown state blocks.
 */
export function evaluateCredentialEligibility(input: CredentialEligibilityInput): CredentialEligibilityDecision {
  if (input.requiredCredentialType === null) return { allowed: true, code: "CREDENTIAL_NOT_REQUIRED" };
  if (input.jurisdictionId === null || input.compliancePackageVersion === null || input.minimumAssurance === null) {
    return { allowed: false, code: "CREDENTIAL_CONTEXT_UNKNOWN" };
  }

  const now = input.now ?? new Date();
  const matching = input.providerCredentials.filter(
    (credential) =>
      credential.jurisdictionId === input.jurisdictionId &&
      credential.credentialType === input.requiredCredentialType,
  );
  if (matching.length === 0) return { allowed: false, code: "CREDENTIAL_NOT_VERIFIED" };

  const active = matching.filter((credential) => credential.status === "verified" && credential.verifiedAt !== null);
  if (active.length === 0) return { allowed: false, code: "CREDENTIAL_NOT_VERIFIED" };
  if (active.every((credential) => credential.expiresAt !== null && credential.expiresAt <= now)) {
    return { allowed: false, code: "CREDENTIAL_EXPIRED" };
  }
  const nonExpired = active.filter((credential) => credential.expiresAt === null || credential.expiresAt > now);
  if (nonExpired.every((credential) => credential.revocationStatus !== "clear")) {
    return { allowed: false, code: "CREDENTIAL_REVOKED_OR_UNCHECKED" };
  }
  const trusted = nonExpired.filter((credential) => credential.revocationStatus === "clear");
  if (trusted.every((credential) => assuranceRank[credential.assuranceLevel] < assuranceRank[input.minimumAssurance!])) {
    return { allowed: false, code: "CREDENTIAL_ASSURANCE_INSUFFICIENT" };
  }
  const assured = trusted.filter(
    (credential) => assuranceRank[credential.assuranceLevel] >= assuranceRank[input.minimumAssurance!],
  );
  if (input.requiresHumanReview === true && assured.every((credential) => credential.reviewedByUserId === null)) {
    return { allowed: false, code: "CREDENTIAL_HUMAN_REVIEW_REQUIRED" };
  }
  const humanReviewed = input.requiresHumanReview === true
    ? assured.filter((credential) => credential.reviewedByUserId !== null)
    : assured;
  if (humanReviewed.every((credential) => credential.ruleVersion !== input.compliancePackageVersion)) {
    return { allowed: false, code: "CREDENTIAL_POLICY_VERSION_MISMATCH" };
  }

  return { allowed: true, code: "CREDENTIAL_ELIGIBLE" };
}

export function assertCredentialEligibility(input: CredentialEligibilityInput): void {
  const decision = evaluateCredentialEligibility(input);
  if (!decision.allowed) throw new Error(`PROVIDER_${decision.code}`);
}
