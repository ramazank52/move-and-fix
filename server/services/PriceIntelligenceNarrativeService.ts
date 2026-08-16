import { ENV } from "../_core/env";
import { invokeLLM } from "../_core/llm";

type SupportedLocale = "tr" | "en" | "ru";

export type PriceIntelligenceNarrativeInput = {
  userId: number;
  locale?: SupportedLocale;
  currency: "TRY";
  sampleSize: number;
  lowAmount: number;
  medianAmount: number;
  highAmount: number;
};

export type PriceIntelligenceNarrative =
  | { status: "available"; summary: string; model: "gpt-5-mini" }
  | { status: "not_configured" | "unavailable" | "rate_limited" | "insufficient_data"; summary: null };

const NARRATIVE_COOLDOWN_MS = 60_000;
const lastNarrativeAtByUser = new Map<number, number>();

function getTextContent(content: string | Array<{ type: "text"; text: string } | { type: string }>): string | null {
  if (typeof content === "string") return content.trim() || null;
  const joined = content
    .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof (part as { text?: unknown }).text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
  return joined || null;
}

/**
 * Produces only an optional plain-language explanation. The numeric range remains
 * deterministic, persisted, and derived from released agreements in the DB.
 */
export async function createPriceIntelligenceNarrative(
  input: PriceIntelligenceNarrativeInput,
): Promise<PriceIntelligenceNarrative> {
  if (!ENV.aiPriceIntelligenceNarrativeEnabled || !ENV.forgeApiKey) {
    return { status: "not_configured", summary: null };
  }
  if (input.sampleSize < 5) return { status: "insufficient_data", summary: null };

  const now = Date.now();
  const lastNarrativeAt = lastNarrativeAtByUser.get(input.userId) ?? 0;
  if (now - lastNarrativeAt < NARRATIVE_COOLDOWN_MS) {
    return { status: "rate_limited", summary: null };
  }
  lastNarrativeAtByUser.set(input.userId, now);

  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 160,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "price_intelligence_narrative",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string", minLength: 12, maxLength: 300 },
            },
            required: ["summary"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You explain a supplied, non-binding marketplace price range. Never calculate, alter, round, recommend, guarantee, or add any price or ETA. Never mention hidden data, a user, a provider, or personal information. State that the range is indicative and the binding maximum is confirmed only after an offer is accepted. Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            locale: input.locale ?? "tr",
            currency: input.currency,
            sampleSize: input.sampleSize,
            lowAmount: input.lowAmount,
            medianAmount: input.medianAmount,
            highAmount: input.highAmount,
            instruction: "Write one concise, neutral explanation in the requested locale using only these supplied facts.",
          }),
        },
      ],
    });
    const content = getTextContent(response.choices[0]?.message.content ?? "");
    if (!content) return { status: "unavailable", summary: null };
    const parsed = JSON.parse(content) as { summary?: unknown };
    if (typeof parsed.summary !== "string") return { status: "unavailable", summary: null };
    const summary = parsed.summary.trim();
    if (summary.length < 12 || summary.length > 300) return { status: "unavailable", summary: null };
    return { status: "available", summary, model: "gpt-5-mini" };
  } catch {
    return { status: "unavailable", summary: null };
  }
}
