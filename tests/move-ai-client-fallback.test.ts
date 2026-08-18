import { describe, expect, it } from "vitest";
import { getMoveAiClientFallbackResponse } from "../lib/ai/client-fallback";

const prohibitedClaim = /₺|fiyat|ücret|en yakın|buluyorum|ödeme|garanti|onaylı/i;

describe("MoveAI client fallback", () => {
  it.each([
    "Evimin suyu akıyor",
    "Arabam yolda kaldı",
    "Klima soğutmuyor",
    "Çekici gerekiyor",
    "Kurye gönderisi oluşturmak istiyorum",
  ])("never makes commercial or availability claims for: %s", (prompt) => {
    const response = getMoveAiClientFallbackResponse(prompt);
    expect(response.text).not.toMatch(prohibitedClaim);
    expect(response.suggestions.join(" ")).not.toMatch(prohibitedClaim);
  });

  it("uses only neutral server-review guidance and categorizes without creating an action", () => {
    const response = getMoveAiClientFallbackResponse("Evimin suyu akıyor");
    expect(response).toMatchObject({ category: "plumbing" });
    expect(response.text).toContain("sunucuda doğrulandıktan sonra");
    expect(response.suggestions).toEqual(["Talebi ayrıntılandır", "Tekrar dene"]);
  });
});
