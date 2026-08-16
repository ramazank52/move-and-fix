import { invokeLLM, type InvokeResult } from "../_core/llm";

const SUPPORTED_TARGET_LANGUAGES = new Set([
  "tr", "en", "de", "fr", "ar", "ru", "es", "it", "pt", "nl", "zh", "fa", "uk",
]);

export type MessageTranslationResult =
  | { status: "translated"; translatedText: string; targetLanguage: string }
  | { status: "unavailable"; code: "TRANSLATION_UNAVAILABLE" | "TRANSLATION_INVALID_OUTPUT" };

export type MessageTranslationInvoker = (params: {
  messages: Array<{ role: "system" | "user"; content: string }>;
  maxTokens: number;
  outputSchema: { name: string; strict: boolean; schema: Record<string, unknown> };
}) => Promise<InvokeResult>;

const translationOutputSchema = {
  name: "message_translation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["translatedText"],
    properties: {
      translatedText: { type: "string", minLength: 1, maxLength: 5000 },
    },
  },
} as const;

const extractTranslatedText = (result: InvokeResult): string | null => {
  const content = result.choices[0]?.message.content;
  if (typeof content !== "string") return null;
  try {
    const parsed = JSON.parse(content) as { translatedText?: unknown };
    const translatedText = typeof parsed.translatedText === "string" ? parsed.translatedText.trim() : "";
    return translatedText.length > 0 && translatedText.length <= 5000 ? translatedText : null;
  } catch {
    return null;
  }
};

/**
 * Translates only caller-authorized text supplied by the router. This function persists neither
 * source text nor output, deliberately makes no business assertions, and returns no model error.
 */
export async function translateMessageOnDemand(
  input: { sourceText: string; targetLanguage: string },
  invoker: MessageTranslationInvoker = invokeLLM,
): Promise<MessageTranslationResult> {
  const sourceText = input.sourceText.trim();
  if (!SUPPORTED_TARGET_LANGUAGES.has(input.targetLanguage) || sourceText.length === 0 || sourceText.length > 5000) {
    return { status: "unavailable", code: "TRANSLATION_UNAVAILABLE" };
  }

  try {
    const result = await invoker({
      maxTokens: 1500,
      outputSchema: translationOutputSchema,
      messages: [
        {
          role: "system",
          content: "Translate only the user-provided message into the requested target language. Do not add advice, price, payment, safety, regulatory, credential, or factual claims. Return only the required JSON object.",
        },
        { role: "user", content: JSON.stringify({ targetLanguage: input.targetLanguage, sourceText }) },
      ],
    });
    const translatedText = extractTranslatedText(result);
    if (!translatedText) return { status: "unavailable", code: "TRANSLATION_INVALID_OUTPUT" };
    return { status: "translated", translatedText, targetLanguage: input.targetLanguage };
  } catch {
    return { status: "unavailable", code: "TRANSLATION_UNAVAILABLE" };
  }
}
