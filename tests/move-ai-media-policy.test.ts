import { describe, expect, it } from "vitest";
import { evaluateMoveAiMediaConsent } from "../server/ai/MoveAiMediaPolicy";

describe("MoveAI media consent policy", () => {
  it("permits a text-only draft without a media consent record", () => {
    expect(evaluateMoveAiMediaConsent({ opaqueIds: [], mediaConsentGranted: false })).toEqual({ allowed: true });
  });

  it("fails closed when a media reference has no explicit consent", () => {
    expect(evaluateMoveAiMediaConsent({ opaqueIds: ["opaque-a"], mediaConsentGranted: false })).toEqual({
      allowed: false,
      reason: "MOVE_AI_MEDIA_CONSENT_REQUIRED",
    });
  });

  it("rejects duplicate or oversized media reference lists", () => {
    expect(evaluateMoveAiMediaConsent({ opaqueIds: ["a", "a"], mediaConsentGranted: true })).toEqual({
      allowed: false,
      reason: "MOVE_AI_MEDIA_DUPLICATE",
    });
    expect(evaluateMoveAiMediaConsent({ opaqueIds: ["1", "2", "3", "4", "5"], mediaConsentGranted: true })).toEqual({
      allowed: false,
      reason: "MOVE_AI_MEDIA_LIMIT_EXCEEDED",
    });
  });
});
