export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type TrustStatus = "active" | "restricted" | "blocked";

export function trustRestrictionForReviewedRisk(input: {
  decision: "resolved" | "dismissed";
  severity: RiskSeverity;
  currentScore: number;
  currentStatus: TrustStatus;
}): { score: number; status: TrustStatus; changed: boolean } {
  // A flag is only a signal until a human confirms it. Dismissal never mutates
  // a profile, and a confirmed low/medium issue remains visible in the audit log
  // without automatically restricting marketplace participation.
  if (input.decision !== "resolved" || !["high", "critical"].includes(input.severity)) {
    return { score: input.currentScore, status: input.currentStatus, changed: false };
  }

  return {
    score: Math.min(Math.max(input.currentScore, 0), 40),
    status: "restricted",
    changed: input.currentStatus !== "restricted" || input.currentScore > 40,
  };
}
