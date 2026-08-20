import { t, type Language } from "../../lib/i18n-core";

export type MoveAiCategory = string | "general";

/**
 * Category values must be pre-validated canonical aliases by the router. This
 * policy never carries a competing service taxonomy or makes market claims.
 */
export function resolveMoveAiCategory(value: unknown): MoveAiCategory {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value)
    ? value.trim().toLowerCase()
    : "general";
}

export function createPolicyBoundMoveAiResponse(input: {
  category: unknown;
  categoryLabel?: string;
  draftCreated: boolean;
  riskBlocked?: boolean;
  language?: Language;
}) {
  const language = input.language ?? "tr";
  const category = resolveMoveAiCategory(input.category);
  const isCanonicalDraft = input.draftCreated && category !== "general" && Boolean(input.categoryLabel);

  if (input.riskBlocked) {
    return {
      category: "general" as const,
      response: t("ai.policy.safetyBlocked", language),
      suggestions: [t("ai.policy.safetySuggestion", language), t("ai.policy.contactSupportSuggestion", language)],
    };
  }

  if (isCanonicalDraft) {
    return {
      category,
      response: t("ai.policy.draftCreated", language, { service: input.categoryLabel! }),
      suggestions: [t("ai.policy.reviewDraft", language), t("ai.policy.addDetail", language), t("ai.policy.confirmDraft", language)],
    };
  }

  return {
    category: "general" as const,
    response: t("ai.policy.needDetails", language),
    suggestions: [t("ai.policy.specifyService", language), t("ai.policy.addLocation", language), t("ai.policy.shareTiming", language)],
  };
}
