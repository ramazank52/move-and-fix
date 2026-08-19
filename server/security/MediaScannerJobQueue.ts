import type { MediaScannerMediaClass, MediaScannerOutcome } from "./MediaQuarantinePolicy";

export const mediaScannerJobStatuses = [
  "queued",
  "dispatched",
  "retry_scheduled",
  "completed",
  "blocked",
  "scan_failed",
] as const;

export type MediaScannerJobStatus = (typeof mediaScannerJobStatuses)[number];

/**
 * `service_request_media` covers request, expense, completion, dispute and
 * claim evidence because they share the same quarantined media record. The
 * more specialised purpose remains on that record and is never discarded.
 */

export type MediaScannerJobInput = {
  mediaClass: MediaScannerMediaClass;
  mediaId: string;
  sha256: string;
  storageKey: string;
  now?: Date;
  maxRetries?: number;
};

export const DEFAULT_MEDIA_SCANNER_MAX_RETRIES = 3;

/**
 * Produces the durable outbox record that must accompany every quarantined
 * object. This deliberately does not dispatch to an external scanner: absent
 * scanner configuration leaves the object queued and non-servable.
 */
export function buildMediaScannerJob(input: MediaScannerJobInput) {
  const sha256 = input.sha256.trim().toLowerCase();
  const mediaId = input.mediaId.trim();
  const storageKey = input.storageKey.trim();
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("MEDIA_SCANNER_JOB_DIGEST_INVALID");
  if (!mediaId) throw new Error("MEDIA_SCANNER_JOB_MEDIA_ID_INVALID");
  if (!storageKey) throw new Error("MEDIA_SCANNER_JOB_STORAGE_KEY_INVALID");
  const now = input.now ?? new Date();
  const maxRetries = input.maxRetries ?? DEFAULT_MEDIA_SCANNER_MAX_RETRIES;
  if (!Number.isInteger(maxRetries) || maxRetries < 1 || maxRetries > 10) throw new Error("MEDIA_SCANNER_JOB_MAX_RETRIES_INVALID");
  return {
    mediaClass: input.mediaClass,
    mediaId,
    sha256,
    storageKey,
    status: "queued" as const,
    deliveryAttempts: 0,
    lastDispatchAt: null,
    nextAttemptAt: now,
    scannerReference: null,
    outcome: null,
    outcomeReason: null,
    completedAt: null,
    scanStartedAt: null,
    scanCompletedAt: null,
    retryCount: 0,
    scanFailureReason: null,
    maxRetries,
    operationalReviewRequired: 0,
  };
}

/**
 * A scanner result can only finish a job that was durably queued for delivery.
 * The exact same terminal callback is idempotent; every contradictory or
 * failed-job callback remains blocked for manual remediation.
 */
export function decideMediaScannerJobCompletion(
  current: MediaScannerJobStatus,
  outcome: MediaScannerOutcome,
): { allowed: boolean; idempotent: boolean; nextStatus: MediaScannerJobStatus; reason: string } {
  const expectedTerminal = outcome === "clean" ? "completed" : outcome === "blocked" ? "blocked" : "scan_failed";
  if (current === expectedTerminal) {
    return {
      allowed: true,
      idempotent: true,
      nextStatus: expectedTerminal,
      reason: "MEDIA_SCANNER_JOB_CALLBACK_IDEMPOTENT",
    };
  }
  if (current === "dispatched") {
    return {
      allowed: true,
      idempotent: false,
      nextStatus: expectedTerminal,
      reason: outcome === "clean"
        ? "MEDIA_SCANNER_JOB_COMPLETED"
        : outcome === "blocked"
          ? "MEDIA_SCANNER_JOB_BLOCKED"
          : "MEDIA_SCANNER_JOB_SCAN_FAILED",
    };
  }
  return {
    allowed: false,
    idempotent: false,
    nextStatus: current,
    reason: "MEDIA_SCANNER_JOB_STATE_CONFLICT",
  };
}

/** Bounded exponential retry schedule. It never turns a failed scan clean. */
export function decideMediaScannerJobFailure(input: {
  current: MediaScannerJobStatus;
  retryCount: number;
  maxRetries: number;
}): {
  allowed: boolean;
  nextStatus: MediaScannerJobStatus;
  retryable: boolean;
  operationalReviewRequired: boolean;
  reason: string;
} {
  if (input.current !== "dispatched") {
    return {
      allowed: false,
      nextStatus: input.current,
      retryable: false,
      operationalReviewRequired: false,
      reason: "MEDIA_SCANNER_JOB_FAILURE_STATE_CONFLICT",
    };
  }
  if (!Number.isInteger(input.retryCount) || !Number.isInteger(input.maxRetries) || input.retryCount < 0 || input.maxRetries < 1) {
    return {
      allowed: false,
      nextStatus: input.current,
      retryable: false,
      operationalReviewRequired: false,
      reason: "MEDIA_SCANNER_JOB_RETRY_METADATA_INVALID",
    };
  }
  if (input.retryCount < input.maxRetries) {
    return {
      allowed: true,
      nextStatus: "retry_scheduled",
      retryable: true,
      operationalReviewRequired: false,
      reason: "MEDIA_SCANNER_JOB_RETRY_SCHEDULED",
    };
  }
  return {
    allowed: true,
    nextStatus: "scan_failed",
    retryable: false,
    operationalReviewRequired: true,
    reason: "MEDIA_SCANNER_JOB_OPERATIONAL_REVIEW_REQUIRED",
  };
}

export function mediaScannerRetryDelayMs(retryCount: number): number {
  if (!Number.isInteger(retryCount) || retryCount < 1 || retryCount > DEFAULT_MEDIA_SCANNER_MAX_RETRIES) {
    throw new Error("MEDIA_SCANNER_RETRY_COUNT_INVALID");
  }
  return 60_000 * (2 ** (retryCount - 1));
}
