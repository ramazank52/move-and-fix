import { describe, expect, it } from "vitest";
import { reconcileApprovedRatings } from "../server/reviews/RatingReconciliation";

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
});
