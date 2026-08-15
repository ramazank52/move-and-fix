import { z } from "zod";

import { invokeLLM } from "../_core/llm";

const analysisSchema = z.object({
  assessment: z.enum(["evidence_visible", "insufficient_evidence", "potential_mismatch"]),
  summary: z.string().trim().min(1).max(600),
  confidence: z.number().int().min(0).max(100),
  flags: z.array(z.string().trim().min(1).max(160)).max(5),
});

export type CompletionEvidenceAnalysis = {
  status: "completed" | "unavailable" | "failed";
  summary: string | null;
  confidence: number | null;
  flags: string[];
};

type EvidenceMedia = {
  buffer: Buffer;
  kind: "image" | "video";
  mimeType: string;
};

/**
 * Produces advisory-only evidence signals. It neither changes the completion
 * state nor releases/refunds escrow; customer and admin decisions stay human.
 */
export async function analyzeCompletionEvidence(input: {
  summary: string;
  media: EvidenceMedia[];
}): Promise<CompletionEvidenceAnalysis> {
  const images = input.media.filter((item) => item.kind === "image").slice(0, 3);
  if (images.length === 0) {
    return {
      status: "unavailable",
      summary: "Otomatik kanıt analizi için fotoğraf bulunamadı.",
      confidence: null,
      flags: ["Yalnız video kanıtı gönderildi; insan incelemesi gerekir."],
    };
  }

  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 700,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "completion_evidence_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              assessment: {
                type: "string",
                enum: ["evidence_visible", "insufficient_evidence", "potential_mismatch"],
              },
              summary: { type: "string" },
              confidence: { type: "integer", minimum: 0, maximum: 100 },
              flags: {
                type: "array",
                items: { type: "string" },
                maxItems: 5,
              },
            },
            required: ["assessment", "summary", "confidence", "flags"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Sen Move&Fix iş kanıtı yardımcı inceleme sistemisin. Yalnız görsel kanıtın hizmet özetiyle makul ilişkisini değerlendir. Kimlik tespiti yapma, hassas kişisel çıkarım yapma, işin tamamlandığını kesin ilan etme ve ödeme/escrow kararı verme. Belirsizlikte insufficient_evidence seç; kısa ve Türkçe yaz.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Hizmet sağlayıcının tamamlanma özeti:\n${input.summary.trim()}\n\nBu çıktı yalnız müşteriye ve yöneticiye yardımcı risk/uyum sinyalidir.`,
            },
            ...images.map((item) => ({
              type: "image_url" as const,
              image_url: {
                url: `data:${item.mimeType};base64,${item.buffer.toString("base64")}`,
                detail: "low" as const,
              },
            })),
          ],
        },
      ],
    });
    const content = response.choices[0]?.message.content;
    const parsed = analysisSchema.parse(typeof content === "string" ? JSON.parse(content) : null);
    const flags = [...parsed.flags];
    if (parsed.assessment !== "evidence_visible") flags.unshift(parsed.assessment);
    if (input.media.some((item) => item.kind === "video")) flags.push("Video içeriği otomatik değerlendirilmedi.");

    return {
      status: "completed",
      summary: parsed.summary,
      confidence: parsed.confidence,
      flags: Array.from(new Set(flags)).slice(0, 5),
    };
  } catch {
    return {
      status: "failed",
      summary: "Otomatik kanıt analizi şu anda tamamlanamadı; müşteri ve yönetici incelemesi devam eder.",
      confidence: null,
      flags: ["Otomatik analiz kullanılamadı; insan incelemesi gerekir."],
    };
  }
}
