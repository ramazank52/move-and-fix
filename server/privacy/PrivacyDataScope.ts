/**
 * P17-16 privacy scope is deliberately limited to provenance and verification
 * evidence. It is not a delivery format for a full data export: an export
 * request still requires the existing secure delivery and retention-aware
 * review process.
 */
export const PRIVACY_SCOPE_RECORD_LIMIT = 250;

export type PrivacyTranslationPreferenceScope = {
  configured: boolean;
  autoTranslateMessages: boolean;
  preferredTranslationLanguage: string;
  updatedAt: Date | null;
};

export type PrivacyTranslationProvenanceScope = {
  messageId: number;
  sourceLanguage: string;
  targetLanguage: string;
  translationProvider: string;
  model: string;
  modelVersion: string;
  translationVersion: string;
  createdAt: Date;
};

export type PrivacyContactVerificationScope = {
  contactType: "email" | "phone";
  status: string;
  initiatedAt: Date;
  verifiedAt: Date | null;
};

export type PrivacyContactChangeEventScope = {
  contactType: "email" | "phone";
  eventType: "initiated" | "confirmed" | "expired" | "cancelled";
  contactValueHash: string;
  challengeId: number | null;
  metadata: unknown;
  createdAt: Date;
};

function boundedRecords<T>(records: T[]) {
  return {
    records: records.slice(0, PRIVACY_SCOPE_RECORD_LIMIT),
    truncated: records.length > PRIVACY_SCOPE_RECORD_LIMIT,
  };
}

/**
 * Makes the scope returned alongside an owner's export/erasure request. The
 * explicit review state prevents the UI from implying that audit provenance or
 * verification history were erased automatically.
 */
export function buildPrivacyDataScope(input: {
  preference: PrivacyTranslationPreferenceScope;
  translationProvenance: PrivacyTranslationProvenanceScope[];
  contactVerificationHistory: PrivacyContactVerificationScope[];
  contactChangeHistory: PrivacyContactChangeEventScope[];
}) {
  return {
    version: "p17-16" as const,
    generatedAt: new Date(),
    translationPreference: input.preference,
    translationProvenance: boundedRecords(input.translationProvenance),
    contactVerificationHistory: boundedRecords(input.contactVerificationHistory),
    contactChangeHistory: boundedRecords(input.contactChangeHistory),
    erasureHandling: {
      automaticErasure: false,
      status: "retention_review_required" as const,
    },
  };
}
