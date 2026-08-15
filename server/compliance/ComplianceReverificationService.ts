export const EXPIRY_WARNING_DAYS = [90, 30, 15, 7] as const;

export type ReverificationCredential = {
  id: number;
  status: "submitted" | "verified" | "rejected" | "expired" | "suspended" | "revoked";
  revocationStatus: "unknown" | "clear" | "revoked" | "check_failed";
  expiresAt: Date | null;
  nextCheckAt: Date | null;
};

export type ReverificationAction = "NONE" | "WARN_EXPIRY" | "QUEUE_HUMAN_REVIEW" | "BLOCK_CAPABILITIES";

export function evaluateReverification(credential: ReverificationCredential, now = new Date()): {
  action: ReverificationAction;
  warningDays: (typeof EXPIRY_WARNING_DAYS)[number] | null;
  reason: string | null;
} {
  if (credential.status === "revoked" || credential.status === "suspended" || credential.revocationStatus === "revoked") {
    return { action: "BLOCK_CAPABILITIES", warningDays: null, reason: "CREDENTIAL_REVOKED_OR_SUSPENDED" };
  }
  if (credential.expiresAt && credential.expiresAt.getTime() <= now.getTime()) {
    return { action: "BLOCK_CAPABILITIES", warningDays: null, reason: "CREDENTIAL_EXPIRED" };
  }
  if (credential.nextCheckAt && credential.nextCheckAt.getTime() <= now.getTime()) {
    return { action: "BLOCK_CAPABILITIES", warningDays: null, reason: "REVERIFICATION_DUE" };
  }
  if (credential.expiresAt) {
    const daysRemaining = Math.ceil((credential.expiresAt.getTime() - now.getTime()) / 86_400_000);
    const warningDays = EXPIRY_WARNING_DAYS.find((day) => daysRemaining <= day && daysRemaining > 0) ?? null;
    if (warningDays) return { action: "WARN_EXPIRY", warningDays, reason: "CREDENTIAL_EXPIRING" };
  }
  return { action: "NONE", warningDays: null, reason: null };
}

export function mayReturnEvidenceLink(input: { evidencePurgedAt: Date | null; retentionDueAt: Date | null }, now = new Date()): boolean {
  if (input.evidencePurgedAt) return false;
  // A due-but-not-yet-purged record remains hidden until a storage eraser completes.
  if (input.retentionDueAt && input.retentionDueAt.getTime() <= now.getTime()) return false;
  return true;
}
