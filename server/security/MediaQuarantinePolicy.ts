export type MediaQuarantineStatus = "pending_scan" | "clean" | "blocked" | "expired";

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
