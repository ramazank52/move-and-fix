import { describe, expect, it } from "vitest";

import {
  buildPrivacyDataScope,
  PRIVACY_SCOPE_RECORD_LIMIT,
} from "../server/privacy/PrivacyDataScope";

describe("P17-16 privacy data scope policy", () => {
  it("bounds provenance records and never presents deletion as automatic", () => {
    const createdAt = new Date("2026-08-20T09:00:00.000Z");
    const scope = buildPrivacyDataScope({
      preference: {
        configured: true,
        autoTranslateMessages: true,
        preferredTranslationLanguage: "en",
        updatedAt: createdAt,
      },
      translationProvenance: Array.from({ length: PRIVACY_SCOPE_RECORD_LIMIT + 1 }, (_, index) => ({
        messageId: index + 1,
        sourceLanguage: "tr",
        targetLanguage: "en",
        translationProvider: "configured-provider",
        model: "configured-model",
        modelVersion: "2026-08",
        translationVersion: "v1",
        createdAt,
      })),
      contactVerificationHistory: [{
        contactType: "email",
        status: "verified",
        initiatedAt: createdAt,
        verifiedAt: createdAt,
      }],
      contactChangeHistory: [{
        contactType: "phone",
        eventType: "confirmed",
        contactValueHash: "a".repeat(64),
        challengeId: 11,
        metadata: null,
        createdAt,
      }],
    });

    expect(scope.version).toBe("p17-16");
    expect(scope.translationPreference).toMatchObject({ configured: true, autoTranslateMessages: true, preferredTranslationLanguage: "en" });
    expect(scope.translationProvenance.records).toHaveLength(PRIVACY_SCOPE_RECORD_LIMIT);
    expect(scope.translationProvenance.truncated).toBe(true);
    expect(scope.contactChangeHistory.records[0]).toMatchObject({ contactValueHash: "a".repeat(64) });
    expect(scope.contactChangeHistory.records[0]).not.toHaveProperty("contactValue");
    expect(scope.erasureHandling).toEqual({ automaticErasure: false, status: "retention_review_required" });
  });
});
