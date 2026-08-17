export type OperatingModel = "employee" | "self_employed" | "sole_trader" | "company_owner" | "company_worker" | "unresolved";
export type OperatingModelReviewStatus = "pending" | "verified" | "needs_legal_review" | "rejected";

/** Classification cannot be granted from provider self-declaration alone. */
export function evaluateWorkerClassification(input: {
  jurisdictionCode: string;
  model: { jurisdictionCode: string; operatingModel: OperatingModel; reviewStatus: OperatingModelReviewStatus } | null;
}): { allowed: boolean; reason: string } {
  const model = input.model;
  if (!model || model.jurisdictionCode !== input.jurisdictionCode) return { allowed: false, reason: "OPERATING_MODEL_REQUIRED" };
  if (model.reviewStatus !== "verified" || model.operatingModel === "unresolved") {
    return { allowed: false, reason: "OPERATING_MODEL_REVIEW_REQUIRED" };
  }
  return { allowed: true, reason: "OPERATING_MODEL_VERIFIED" };
}
