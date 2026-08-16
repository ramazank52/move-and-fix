import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeLLM } = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("../server/_core/env", () => ({
  ENV: {
    aiPriceIntelligenceNarrativeEnabled: true,
    forgeApiKey: "test-forge-key",
  },
}));

vi.mock("../server/_core/llm", () => ({ invokeLLM }));

import { createPriceIntelligenceNarrative } from "../server/services/PriceIntelligenceNarrativeService";

const input = {
  userId: 901_001,
  locale: "tr" as const,
  currency: "TRY" as const,
  sampleSize: 12,
  lowAmount: 900,
  medianAmount: 1_200,
  highAmount: 1_600,
};

describe("AI Price Intelligence narrative", () => {
  beforeEach(() => {
    invokeLLM.mockReset();
  });

  it("accepts only the structured, bounded model explanation without changing deterministic amounts", async () => {
    invokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ summary: "Bu aralık geçmişte tamamlanan benzer işlerden türetilmiş bağlayıcı olmayan bir göstergedir." }) } }],
    });

    const result = await createPriceIntelligenceNarrative(input);

    expect(result).toEqual({
      status: "available",
      summary: "Bu aralık geçmişte tamamlanan benzer işlerden türetilmiş bağlayıcı olmayan bir göstergedir.",
      model: "gpt-5-mini",
    });
    expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5-mini",
      responseFormat: expect.objectContaining({ type: "json_schema" }),
    }));
  });

  it("fails safe when the model response is not valid structured output", async () => {
    invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: "not-json" } }] });

    const result = await createPriceIntelligenceNarrative({ ...input, userId: 901_002 });

    expect(result).toEqual({ status: "unavailable", summary: null });
  });

  it("applies a per-user cooldown before initiating another model call", async () => {
    invokeLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ summary: "Bu aralık yalnız bilgilendirme amaçlıdır ve teklif kabulünden önce bağlayıcı değildir." }) } }],
    });

    await createPriceIntelligenceNarrative({ ...input, userId: 901_003 });
    const second = await createPriceIntelligenceNarrative({ ...input, userId: 901_003 });

    expect(second).toEqual({ status: "rate_limited", summary: null });
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });
});
