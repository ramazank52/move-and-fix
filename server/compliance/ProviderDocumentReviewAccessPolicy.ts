export type ProviderDocumentReviewAccessInput = {
  hasReviewerPermission: boolean;
  mfaReauthenticated: boolean;
  quarantineStatus: string | null;
  contentPurgedAt: Date | null;
  storageKey: string | null;
  purpose?: "review_clean" | "remediate_scan_failure";
};

export type ProviderDocumentReviewAccessDecision =
  | { allowed: true }
  | {
      allowed: false;
      code:
        | "REVIEWER_PERMISSION_REQUIRED"
        | "MFA_REAUTH_REQUIRED"
        | "DOCUMENT_NOT_CLEAN"
        | "DOCUMENT_CONTENT_UNAVAILABLE";
    };

/**
 * Pure policy for privileged document content inspection. The provider owner
 * path remains separate; this policy is intentionally deny-by-default for
 * internal reviewers and never exposes a raw storage key.
 */
export function decideProviderDocumentReviewAccess(
  input: ProviderDocumentReviewAccessInput,
): ProviderDocumentReviewAccessDecision {
  if (!input.hasReviewerPermission) return { allowed: false, code: "REVIEWER_PERMISSION_REQUIRED" };
  if (!input.mfaReauthenticated) return { allowed: false, code: "MFA_REAUTH_REQUIRED" };
  const purpose = input.purpose ?? "review_clean";
  const permittedQuarantineState = input.quarantineStatus === "clean"
    || (input.quarantineStatus === "scan_failed" && purpose === "remediate_scan_failure");
  if (!permittedQuarantineState) return { allowed: false, code: "DOCUMENT_NOT_CLEAN" };
  if (input.contentPurgedAt || !input.storageKey) return { allowed: false, code: "DOCUMENT_CONTENT_UNAVAILABLE" };
  return { allowed: true };
}
