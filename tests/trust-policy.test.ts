import { describe, expect, it } from "vitest";
import { trustRestrictionForReviewedRisk } from "../server/trust/policy";

describe("trustRestrictionForReviewedRisk", () => {
  it("does not alter a profile for dismissed or non-material signals", () => {
    expect(trustRestrictionForReviewedRisk({
      decision: "dismissed",
      severity: "critical",
      currentScore: 92,
      currentStatus: "active",
    })).toEqual({ score: 92, status: "active", changed: false });

    expect(trustRestrictionForReviewedRisk({
      decision: "resolved",
      severity: "medium",
      currentScore: 72,
      currentStatus: "active",
    })).toEqual({ score: 72, status: "active", changed: false });
  });

  it("restricts only a human-confirmed high-risk profile and never raises its score", () => {
    expect(trustRestrictionForReviewedRisk({
      decision: "resolved",
      severity: "high",
      currentScore: 88,
      currentStatus: "active",
    })).toEqual({ score: 40, status: "restricted", changed: true });

    expect(trustRestrictionForReviewedRisk({
      decision: "resolved",
      severity: "critical",
      currentScore: 23,
      currentStatus: "restricted",
    })).toEqual({ score: 23, status: "restricted", changed: false });
  });
});
