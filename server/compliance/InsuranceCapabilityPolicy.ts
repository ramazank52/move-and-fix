export type InsuranceVerificationStatus = "unverified" | "pending" | "verified" | "rejected" | "expired" | "manual_approved";

export type InsurancePolicyRecord = {
  jurisdictionCode: string;
  verificationStatus: InsuranceVerificationStatus;
  expiryDate: Date;
};

/** Server-owned review state is the only source of insurance eligibility. */
export function evaluateInsuranceCapability(input: {
  jurisdictionCode: string;
  policies: InsurancePolicyRecord[];
  now?: Date;
}): { allowed: boolean; reason: string } {
  const now = input.now ?? new Date();
  const isEligible = input.policies.some(
    (policy) =>
      policy.jurisdictionCode === input.jurisdictionCode &&
      (policy.verificationStatus === "verified" || policy.verificationStatus === "manual_approved") &&
      policy.expiryDate.getTime() > now.getTime(),
  );
  return isEligible
    ? { allowed: true, reason: "INSURANCE_VERIFIED" }
    : { allowed: false, reason: "INSURANCE_VERIFICATION_REQUIRED" };
}
