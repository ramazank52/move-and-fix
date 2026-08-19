import type { MediaScannerJobStatus } from "./MediaScannerJobQueue";

export const MEDIA_SCANNER_DEFAULT_MAX_RETRIES = 3;
export const MEDIA_SCANNER_BASE_RETRY_DELAY_MS = 5_000;
export const MEDIA_SCANNER_MAX_RETRY_DELAY_MS = 60 * 60 * 1_000;

export type MediaScannerDispatchFailure = {
  nextStatus: Extract<MediaScannerJobStatus, "retry_scheduled" | "scan_failed">;
  nextAttemptAt: Date | null;
  reason: "MEDIA_SCANNER_RETRY_SCHEDULED" | "MEDIA_SCANNER_OPERATIONAL_REVIEW_REQUIRED";
  retryCount: number;
  operationalReviewRequired: boolean;
};

/**
 * Applies bounded exponential backoff to an already claimed outbox job. A
 * terminal failure is deliberately manual-review only: it never releases
 * quarantined media and can be reconciled by an operations-controlled retry.
 */
export function decideMediaScannerDispatchFailure(
  deliveryAttempts: number,
  maxRetries = MEDIA_SCANNER_DEFAULT_MAX_RETRIES,
  now = new Date(),
): MediaScannerDispatchFailure {
  if (!Number.isInteger(deliveryAttempts) || deliveryAttempts < 1) {
    throw new Error("MEDIA_SCANNER_DISPATCH_ATTEMPTS_INVALID");
  }
  if (!Number.isInteger(maxRetries) || maxRetries < 1 || maxRetries > 10) {
    throw new Error("MEDIA_SCANNER_MAX_RETRIES_INVALID");
  }
  // `deliveryAttempts` includes the initial dispatch; retryCount does not.
  const retryCount = Math.max(0, deliveryAttempts - 1);
  if (retryCount >= maxRetries) {
    return {
      nextStatus: "scan_failed",
      nextAttemptAt: null,
      reason: "MEDIA_SCANNER_OPERATIONAL_REVIEW_REQUIRED",
      retryCount,
      operationalReviewRequired: true,
    };
  }
  const delay = Math.min(
    MEDIA_SCANNER_BASE_RETRY_DELAY_MS * 2 ** (deliveryAttempts - 1),
    MEDIA_SCANNER_MAX_RETRY_DELAY_MS,
  );
  return {
    nextStatus: "retry_scheduled",
    nextAttemptAt: new Date(now.getTime() + delay),
    reason: "MEDIA_SCANNER_RETRY_SCHEDULED",
    retryCount,
    operationalReviewRequired: false,
  };
}
