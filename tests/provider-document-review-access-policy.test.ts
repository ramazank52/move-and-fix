import { describe, expect, it } from "vitest";

import { decideProviderDocumentReviewAccess } from "../server/compliance/ProviderDocumentReviewAccessPolicy";

const cleanDocument = {
  hasReviewerPermission: true,
  mfaReauthenticated: true,
  quarantineStatus: "clean",
  contentPurgedAt: null,
  storageKey: "provider-documents/opaque-id.pdf",
} as const;

describe("provider document reviewer access policy", () => {
  it("allows only separately authorized, re-authenticated reviewers to inspect clean retained content", () => {
    expect(decideProviderDocumentReviewAccess(cleanDocument)).toEqual({ allowed: true });
  });

  it("fails closed when the distinct reviewer grant or MFA re-authentication is absent", () => {
    expect(decideProviderDocumentReviewAccess({ ...cleanDocument, hasReviewerPermission: false }))
      .toEqual({ allowed: false, code: "REVIEWER_PERMISSION_REQUIRED" });
    expect(decideProviderDocumentReviewAccess({ ...cleanDocument, mfaReauthenticated: false }))
      .toEqual({ allowed: false, code: "MFA_REAUTH_REQUIRED" });
  });

  it("never permits pending, malicious, purged, or storage-less documents", () => {
    expect(decideProviderDocumentReviewAccess({ ...cleanDocument, quarantineStatus: "pending_scan" }))
      .toEqual({ allowed: false, code: "DOCUMENT_NOT_CLEAN" });
    expect(decideProviderDocumentReviewAccess({ ...cleanDocument, quarantineStatus: "malicious" }))
      .toEqual({ allowed: false, code: "DOCUMENT_NOT_CLEAN" });
    expect(decideProviderDocumentReviewAccess({ ...cleanDocument, contentPurgedAt: new Date() }))
      .toEqual({ allowed: false, code: "DOCUMENT_CONTENT_UNAVAILABLE" });
    expect(decideProviderDocumentReviewAccess({ ...cleanDocument, storageKey: null }))
      .toEqual({ allowed: false, code: "DOCUMENT_CONTENT_UNAVAILABLE" });
  });
});
