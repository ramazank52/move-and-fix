import { describe, expect, it, vi } from "vitest";

const { invokeLLMMock } = vi.hoisted(() => ({
  invokeLLMMock: vi.fn(),
}));

vi.mock("../server/_core/llm", () => ({
  invokeLLM: invokeLLMMock,
}));

import { analyzeCompletionEvidence } from "../server/services/CompletionEvidenceAnalysisService";

const imageMedia = {
  buffer: Buffer.from("proof-image"),
  kind: "image" as const,
  mimeType: "image/jpeg",
};

describe("CompletionEvidenceAnalysisService", () => {
  it("fotoğraf bulunmadığında modeli çağırmadan insan incelemesini zorunlu tutar", async () => {
    const result = await analyzeCompletionEvidence({
      summary: "İş tamamlandı.",
      media: [{ buffer: Buffer.from("proof-video"), kind: "video", mimeType: "video/mp4" }],
    });

    expect(invokeLLMMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "unavailable",
      summary: "Otomatik kanıt analizi için fotoğraf bulunamadı.",
      confidence: null,
      flags: ["Yalnız video kanıtı gönderildi; insan incelemesi gerekir."],
    });
  });

  it("belirsiz görsel sinyalini ödeme kararı yerine yardımcı bayrak olarak üretir", async () => {
    invokeLLMMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              assessment: "potential_mismatch",
              summary: "Görsel, açıklanan tesisat işiyle sınırlı ilişki gösteriyor.",
              confidence: 64,
              flags: ["Daha net kanıt gerekebilir."],
            }),
          },
        },
      ],
    });

    const result = await analyzeCompletionEvidence({
      summary: "Musluk arızası onarıldı.",
      media: [imageMedia, { buffer: Buffer.from("proof-video"), kind: "video", mimeType: "video/mp4" }],
    });

    expect(invokeLLMMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "completed",
      summary: "Görsel, açıklanan tesisat işiyle sınırlı ilişki gösteriyor.",
      confidence: 64,
      flags: ["potential_mismatch", "Daha net kanıt gerekebilir.", "Video içeriği otomatik değerlendirilmedi."],
    });
  });

  it("sağlayıcı hatasında fail-safe sonuç üretir ve iş akışını engellemez", async () => {
    invokeLLMMock.mockRejectedValueOnce(new Error("LLM geçici olarak kullanılamıyor"));

    const result = await analyzeCompletionEvidence({
      summary: "Klima bakım işlemi tamamlandı.",
      media: [imageMedia],
    });

    expect(result.status).toBe("failed");
    expect(result.confidence).toBeNull();
    expect(result.summary).toContain("müşteri ve yönetici incelemesi");
    expect(result.flags).toEqual(["Otomatik analiz kullanılamadı; insan incelemesi gerekir."]);
  });
});
