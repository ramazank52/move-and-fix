import { describe, expect, it } from "vitest";
import { buildRatingReconciliationPlan, reconcileApprovedRatings } from "../server/reviews/RatingReconciliation";

describe("approved-only rating reconciliation", () => {
  it("derives aggregate values only from supplied approved records", () => {
    expect(reconcileApprovedRatings([
      { providerId: 2, rating: 5 },
      { providerId: 2, rating: 4 },
      { providerId: 1, rating: 3 },
    ])).toEqual([
      { providerId: 1, approvedReviewCount: 1, averageRating: 3 },
      { providerId: 2, approvedReviewCount: 2, averageRating: 4.5 },
    ]);
  });

  it("rejects malformed data before any caller can persist a drift correction", () => {
    expect(() => reconcileApprovedRatings([{ providerId: 1, rating: 6 }])).toThrow("RATING_RECONCILIATION_INVALID_RECORD");
  });

  it("produces a deterministic PII-minimal plan hash for the same approved aggregate", () => {
    const schemaFingerprint = "a".repeat(64);
    const first = buildRatingReconciliationPlan({
      schemaFingerprint,
      approvedRatings: [{ providerId: 2, rating: 4 }, { providerId: 1, rating: 5 }, { providerId: 2, rating: 5 }],
    });
    const second = buildRatingReconciliationPlan({
      schemaFingerprint,
      approvedRatings: [{ providerId: 2, rating: 4 }, { providerId: 1, rating: 5 }, { providerId: 2, rating: 5 }],
    });
    expect(first.planHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain("comment");
    expect(JSON.stringify(first)).not.toContain("reviewer");
  });

  it("changes the plan hash when approved aggregate data or schema fingerprint drifts", () => {
    const original = buildRatingReconciliationPlan({
      schemaFingerprint: "a".repeat(64),
      approvedRatings: [{ providerId: 1, rating: 5 }],
    });
    const changedRating = buildRatingReconciliationPlan({
      schemaFingerprint: "a".repeat(64),
      approvedRatings: [{ providerId: 1, rating: 4 }],
    });
    const changedSchema = buildRatingReconciliationPlan({
      schemaFingerprint: "b".repeat(64),
      approvedRatings: [{ providerId: 1, rating: 5 }],
    });
    expect(changedRating.planHash).not.toBe(original.planHash);
    expect(changedSchema.planHash).not.toBe(original.planHash);
  });

  it("rejects malformed schema fingerprints before a plan can be applied", () => {
    expect(() => buildRatingReconciliationPlan({ schemaFingerprint: "schema-v1", approvedRatings: [] }))
      .toThrow("RATING_RECONCILIATION_SCHEMA_FINGERPRINT_INVALID");
  });
});
