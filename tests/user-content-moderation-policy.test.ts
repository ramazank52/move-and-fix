import { describe, expect, it } from "vitest";

import { evaluateUserGeneratedContent } from "../server/moderation/UserContentModerationPolicy";

describe("canonical user-content moderation policy", () => {
  it("fails closed to review_required without external approval", () => {
    expect(evaluateUserGeneratedContent({ kind: "review_comment", text: "Temiz ve zamanında hizmet." })).toEqual({
      status: "review_required",
      reasonCode: "EXTERNAL_MODERATION_REQUIRED",
      isPubliclyVisible: false,
    });
  });

  it("rejects unicode/space-obfuscated direct contact content", () => {
    expect(evaluateUserGeneratedContent({ kind: "service_request", text: "Bana a l i @ örnek . com üzerinden yazın" })).toEqual({
      status: "rejected",
      reasonCode: "DIRECT_CONTACT_PII",
      isPubliclyVisible: false,
    });
  });

  it("does not approve empty content", () => {
    expect(evaluateUserGeneratedContent({ kind: "provider_bio", text: "   " }).status).toBe("review_required");
  });
});
