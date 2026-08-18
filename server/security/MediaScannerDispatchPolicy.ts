import type { MediaScannerJobStatus } from "./MediaScannerJobQueue";

export const MEDIA_SCANNER_MAX_DISPATCH_ATTEMPTS = 5;
export const MEDIA_SCANNER_BASE_RETRY_DELAY_MS = 5_000;
export const MEDIA_SCANNER_MAX_RETRY_DELAY_MS = 60 * 60 * 1_000;

export type MediaScannerDispatchFailure = {
  nextStatus: Extract<MediaScannerJobStatus, "retry_scheduled" | "failed">;
  nextAttemptAt: Date | null;
  reason: "MEDIA_SCANNER_RETRY_SCHEDULED" | "MEDIA_SCANNER_DEAD_LETTER";
};

/**
 * Applies bounded exponential backoff to an already claimed outbox job. A
 * terminal failure is deliberately manual-review only: it never releases
 * quarantined media and can be reconciled by an operations-controlled retry.
 */
export function decideMediaScannerDispatchFailure(
  deliveryAttempts: number,
  now = new Date(),
): MediaScannerDispatchFailure {
  if (!Number.isInteger(deliveryAttempts) || deliveryAttempts < 1) {
    throw new Error("MEDIA_SCANNER_DISPATCH_ATTEMPTS_INVALID");
  }
  if (deliveryAttempts >= MEDIA_SCANNER_MAX_DISPATCH_ATTEMPTS) {
    return {
      nextStatus: "failed",
      nextAttemptAt: null,
      reason: "MEDIA_SCANNER_DEAD_LETTER",
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
  };
}
