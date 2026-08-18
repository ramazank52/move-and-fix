export type MediaQuarantineStatus = "pending_scan" | "clean" | "blocked" | "expired";
export type MediaScannerOutcome = "clean" | "blocked";
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
  if (status === "blocked") return { allowed: false, reason: "MEDIA_QUARANTINE_BLOCKED" };
  if (status === "expired") return { allowed: false, reason: "MEDIA_QUARANTINE_EXPIRED" };
  return { allowed: false, reason: "MEDIA_QUARANTINE_STATE_MISSING" };
}

/**
 * A scanner may only move a quarantined object to an explicit terminal result.
 * Any missing or contradictory state stays non-servable, including a repeated
 * callback after a different terminal decision.
 */
export function decideMediaScannerTransition(
  current: MediaQuarantineStatus | null | undefined,
  outcome: MediaScannerOutcome,
): { allowed: boolean; idempotent: boolean; nextStatus: MediaQuarantineStatus; reason: string } {
  if (current === "pending_scan") {
    return {
      allowed: true,
      idempotent: false,
      nextStatus: outcome,
      reason: outcome === "clean" ? "MEDIA_SCAN_RELEASED" : "MEDIA_SCAN_BLOCKED",
    };
  }
  if (current === outcome) {
    return { allowed: true, idempotent: true, nextStatus: outcome, reason: "MEDIA_SCAN_CALLBACK_IDEMPOTENT" };
  }
  return { allowed: false, idempotent: false, nextStatus: current ?? "pending_scan", reason: "MEDIA_SCAN_STATE_CONFLICT" };
}
