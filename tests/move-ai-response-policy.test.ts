import { describe, expect, it } from "vitest";

import { createPolicyBoundMoveAiResponse, resolveMoveAiCategory } from "../server/ai/MoveAiResponsePolicy";

describe("MoveAI response policy", () => {
  it("accepts only known service categories", () => {
    expect(resolveMoveAiCategory("plumbing")).toBe("plumbing");
    expect(resolveMoveAiCategory("regulated-expert")).toBe("general");
    expect(resolveMoveAiCategory(undefined)).toBe("general");
  });

  it("returns deterministic, proposal-only language without pricing or availability claims", () => {
    const output = createPolicyBoundMoveAiResponse({ category: "towing", draftCreated: true });

    expect(output.category).toBe("towing");
    expect(output.response).toContain("hizmet taslağı");
    expect(output.response).not.toMatch(/₺|fiyat|ücret|en yakın|buluyorum|ödeme|garanti|onaylı/i);
    expect(output.suggestions).toEqual(["Talebi gözden geçir", "Ayrıntı ekle", "Taslağı onayla"]);
  });

  it("does not claim an action when no confirmable draft exists", () => {
    const output = createPolicyBoundMoveAiResponse({ category: "plumbing", draftCreated: false });
    expect(output.response).toContain("biraz daha ayrıntı");
    expect(output.response).not.toMatch(/hazırladım|buluyorum|fiyat/i);
  });

  it("uses a safety-only response for a blocked risk case", () => {
    const output = createPolicyBoundMoveAiResponse({ category: "electrical", draftCreated: false, riskBlocked: true });
    expect(output.response).toContain("güvenlik incelemesi");
    expect(output.response).toContain("acil yardım");
  });
});
