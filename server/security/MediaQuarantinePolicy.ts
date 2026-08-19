export type MediaQuarantineStatus = "pending_scan" | "scanning" | "clean" | "blocked" | "scan_failed" | "expired";
export type MediaScannerOutcome = "clean" | "blocked" | "scan_failed";
export type MediaScannerTransitionTarget = "scanning" | MediaScannerOutcome;
export type MediaScannerMediaClass =
  | "provider_document"
  | "service_request_media"
  | "voice_message"
  | "move_ai_draft_media";

export type MediaQuarantineDecision = {
  allowed: boolean;
  reason: string;
};

/**
 * Signature and size checks protect intake only. A media object is released
 * exclusively after an external scanner records an explicit clean outcome.
 */
export function decideMediaQuarantineAccess(status: MediaQuarantineStatus | null | undefined): MediaQuarantineDecision {
  if (status === "clean") return { allowed: true, reason: "MEDIA_QUARANTINE_CLEAN" };
  if (status === "pending_scan") return { allowed: false, reason: "MEDIA_QUARANTINE_PENDING_SCAN" };
  if (status === "scanning") return { allowed: false, reason: "MEDIA_QUARANTINE_SCANNING" };
  if (status === "blocked") return { allowed: false, reason: "MEDIA_QUARANTINE_BLOCKED" };
  if (status === "scan_failed") return { allowed: false, reason: "MEDIA_QUARANTINE_SCAN_FAILED" };
  if (status === "expired") return { allowed: false, reason: "MEDIA_QUARANTINE_EXPIRED" };
  return { allowed: false, reason: "MEDIA_QUARANTINE_STATE_MISSING" };
}

/**
 * The scanner callback is the only actor that may complete an active scan.
 * Older callbacks cannot move an object backwards or overwrite a terminal
 * decision. Retry re-queuing is deliberately exposed by a separate internal
 * helper below so external callbacks never acquire that authority.
 */
export function decideMediaScannerTransition(
  current: MediaQuarantineStatus | null | undefined,
  target: MediaScannerTransitionTarget,
): { allowed: boolean; idempotent: boolean; nextStatus: MediaQuarantineStatus; reason: string } {
  if (current === target) {
    return { allowed: true, idempotent: true, nextStatus: target, reason: "MEDIA_SCAN_CALLBACK_IDEMPOTENT" };
  }
  if (current === "pending_scan" && target === "scanning") {
    return {
      allowed: true,
      idempotent: false,
      nextStatus: "scanning",
      reason: "MEDIA_SCAN_STARTED",
    };
  }
  if (current === "scanning" && (target === "clean" || target === "blocked" || target === "scan_failed")) {
    return {
      allowed: true,
      idempotent: false,
      nextStatus: target,
      reason: target === "clean"
        ? "MEDIA_SCAN_RELEASED"
        : target === "blocked"
          ? "MEDIA_SCAN_BLOCKED"
          : "MEDIA_SCAN_FAILED",
    };
  }
  return { allowed: false, idempotent: false, nextStatus: current ?? "pending_scan", reason: "MEDIA_SCAN_STATE_CONFLICT" };
}

/**
 * Only the internal, bounded retry worker may re-queue a failed object. A
 * scanner callback never calls this function, preventing a stale provider
 * callback from re-opening a previously failed or rejected object.
 */
export function decideMediaScannerRetryTransition(
  current: MediaQuarantineStatus | null | undefined,
  retryCount: number,
  maxRetries: number,
): { allowed: boolean; nextStatus: MediaQuarantineStatus; reason: string } {
  if (current !== "scan_failed") {
    return { allowed: false, nextStatus: current ?? "pending_scan", reason: "MEDIA_SCAN_RETRY_STATE_CONFLICT" };
  }
  if (!Number.isInteger(retryCount) || !Number.isInteger(maxRetries) || retryCount < 0 || maxRetries < 1 || retryCount >= maxRetries) {
    return { allowed: false, nextStatus: "scan_failed", reason: "MEDIA_SCAN_RETRY_LIMIT_REACHED" };
  }
  return { allowed: true, nextStatus: "pending_scan", reason: "MEDIA_SCAN_RETRY_QUEUED" };
}
