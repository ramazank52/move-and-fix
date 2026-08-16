export type MoveAiMediaConsentInput = {
  opaqueIds: readonly string[] | undefined;
  mediaConsentGranted: boolean;
};

export type MoveAiMediaConsentDecision =
  | { allowed: true }
  | { allowed: false; reason: "MOVE_AI_MEDIA_CONSENT_REQUIRED" | "MOVE_AI_MEDIA_DUPLICATE" | "MOVE_AI_MEDIA_LIMIT_EXCEEDED" };

/** Fail-closed attachment policy: an opaque media reference is never linked without explicit consent. */
export function evaluateMoveAiMediaConsent(input: MoveAiMediaConsentInput): MoveAiMediaConsentDecision {
  const ids = input.opaqueIds ?? [];
  if (ids.length === 0) return { allowed: true };
  if (!input.mediaConsentGranted) return { allowed: false, reason: "MOVE_AI_MEDIA_CONSENT_REQUIRED" };
  if (ids.length > 4) return { allowed: false, reason: "MOVE_AI_MEDIA_LIMIT_EXCEEDED" };
  if (new Set(ids).size !== ids.length) return { allowed: false, reason: "MOVE_AI_MEDIA_DUPLICATE" };
  return { allowed: true };
}
