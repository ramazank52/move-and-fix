import { createHash } from "node:crypto";

export type ApprovedRatingRecord = {
  providerId: number;
  rating: number;
};

export type ProviderRatingAggregate = {
  providerId: number;
  approvedReviewCount: number;
  averageRating: number;
};

export type RatingReconciliationPlan = {
  schemaFingerprint: string;
  planHash: string;
  aggregateCount: number;
  aggregates: ProviderRatingAggregate[];
};

export function reconcileApprovedRatings(records: ApprovedRatingRecord[]): ProviderRatingAggregate[] {
  const buckets = new Map<number, { sum: number; count: number }>();
  for (const record of records) {
    if (!Number.isInteger(record.providerId) || record.providerId <= 0 || !Number.isInteger(record.rating) || record.rating < 1 || record.rating > 5) {
      throw new Error("RATING_RECONCILIATION_INVALID_RECORD");
    }
    const bucket = buckets.get(record.providerId) ?? { sum: 0, count: 0 };
    bucket.sum += record.rating;
    bucket.count += 1;
    buckets.set(record.providerId, bucket);
  }

  return [...buckets.entries()]
    .map(([providerId, bucket]) => ({
      providerId,
      approvedReviewCount: bucket.count,
      averageRating: Number((bucket.sum / bucket.count).toFixed(2)),
    }))
    .sort((left, right) => left.providerId - right.providerId);
}

/**
 * Creates a deterministic, PII-minimal reconciliation plan. Review comment,
 * reviewer, request and contact data are never accepted by this pure core.
 */
export function buildRatingReconciliationPlan(input: {
  approvedRatings: ApprovedRatingRecord[];
  schemaFingerprint: string;
}): RatingReconciliationPlan {
  if (!/^[a-f0-9]{64}$/i.test(input.schemaFingerprint)) {
    throw new Error("RATING_RECONCILIATION_SCHEMA_FINGERPRINT_INVALID");
  }
  const aggregates = reconcileApprovedRatings(input.approvedRatings);
  const canonicalPayload = JSON.stringify({
    schemaFingerprint: input.schemaFingerprint.toLowerCase(),
    aggregates: aggregates.map((aggregate) => [aggregate.providerId, aggregate.approvedReviewCount, aggregate.averageRating]),
  });
  return {
    schemaFingerprint: input.schemaFingerprint.toLowerCase(),
    planHash: createHash("sha256").update(canonicalPayload).digest("hex"),
    aggregateCount: aggregates.length,
    aggregates,
  };
}
