import { containsDirectContactData } from "../communications/MaskedCommunicationService";

export type UserGeneratedContentKind =
  | "service_request"
  | "provider_bio"
  | "provider_portfolio"
  | "review_comment"
  | "support_claim"
  | "media_metadata";

export type ModerationStatus = "pending" | "approved" | "rejected" | "quarantined" | "review_required";

export type LocalModerationDecision = {
  status: ModerationStatus;
  reasonCode: "DIRECT_CONTACT_PII" | "EMPTY_CONTENT" | "EXTERNAL_MODERATION_REQUIRED";
  isPubliclyVisible: false;
};

/**
 * Deterministic, fail-closed first-stage policy.
 *
 * This policy is intentionally not an AI approval system. Content without a
 * deterministic rejection remains review_required until a privileged reviewer
 * records an auditable decision in the canonical persistence lifecycle.
 */
export function evaluateUserGeneratedContent(input: {
  kind: UserGeneratedContentKind;
  text: string | null | undefined;
}): LocalModerationDecision {
  const normalized = input.text?.normalize("NFKC").trim() ?? "";
  if (!normalized) {
    return { status: "review_required", reasonCode: "EMPTY_CONTENT", isPubliclyVisible: false };
  }
  if (containsDirectContactData(normalized)) {
    return { status: "rejected", reasonCode: "DIRECT_CONTACT_PII", isPubliclyVisible: false };
  }
  return {
    status: "review_required",
    reasonCode: "EXTERNAL_MODERATION_REQUIRED",
    isPubliclyVisible: false,
  };
}
