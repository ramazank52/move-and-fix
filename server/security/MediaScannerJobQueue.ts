import type { MediaScannerMediaClass, MediaScannerOutcome } from "./MediaQuarantinePolicy";

export const mediaScannerJobStatuses = [
  "queued",
  "dispatched",
  "retry_scheduled",
  "completed",
  "blocked",
  "failed",
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
};

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
  const expectedTerminal = outcome === "clean" ? "completed" : "blocked";
  if (current === expectedTerminal) {
    return {
      allowed: true,
      idempotent: true,
      nextStatus: expectedTerminal,
      reason: "MEDIA_SCANNER_JOB_CALLBACK_IDEMPOTENT",
    };
  }
  if (current === "queued" || current === "dispatched" || current === "retry_scheduled") {
    return {
      allowed: true,
      idempotent: false,
      nextStatus: expectedTerminal,
      reason: outcome === "clean" ? "MEDIA_SCANNER_JOB_COMPLETED" : "MEDIA_SCANNER_JOB_BLOCKED",
    };
  }
  return {
    allowed: false,
    idempotent: false,
    nextStatus: current,
    reason: "MEDIA_SCANNER_JOB_STATE_CONFLICT",
  };
}
