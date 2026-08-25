export type ApprovedRatingRecord = {
  providerId: number;
  rating: number;
};

export type ProviderRatingAggregate = {
  providerId: number;
  approvedReviewCount: number;
  averageRating: number;
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
