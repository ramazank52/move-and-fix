import { describe, expect, it } from "vitest";

import { getLegalDocumentManifest, getLegalReleaseGate } from "../server/compliance/LegalDocumentCatalog";

describe("P15 versioned legal document catalog", () => {
  it("lists every mandatory legal surface in TR and EN with version metadata", () => {
    const manifest = getLegalDocumentManifest();
    for (const locale of ["tr", "en"] as const) {
      for (const id of ["terms", "privacy", "kvkk", "cookies", "account_deletion", "support_contact", "community_provider_rules", "prohibited", "payment_policy"]) {
        expect(manifest).toEqual(expect.arrayContaining([expect.objectContaining({ id, locale })]));
      }
    }
    expect(manifest.filter((entry) => entry.contentHash)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "terms", locale: "tr", contentHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    ]));
  });

  it("keeps unresolved company identity and legal approval as a fail-closed release gate", () => {
    const gate = getLegalReleaseGate();
    expect(gate.ready).toBe(false);
    expect(gate.reason).toBe("LEGAL_APPROVAL_REQUIRED");
    expect(gate.unresolved).toEqual(expect.arrayContaining([
      expect.objectContaining({ placeholders: expect.arrayContaining(["LEGAL_ENTITY_NAME_REQUIRED", "LEGAL_APPROVAL_REQUIRED"]) }),
    ]));
  });

  it("does not label an untranslated English document as approved", () => {
    const englishTerms = getLegalDocumentManifest().find((entry) => entry.id === "terms" && entry.locale === "en");
    expect(englishTerms).toMatchObject({ approvalStatus: "LEGAL_APPROVAL_REQUIRED", publicationStatus: "NOT_PUBLISHED" });
  });
});
