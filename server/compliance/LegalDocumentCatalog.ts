import { createHash } from "node:crypto";

import { LEGAL_DOCUMENTS, PRIVACY_POLICY_TRANSLATIONS, type LegalDocumentLocale } from "../../lib/data/legal";

export type LegalDocumentApprovalStatus = "APPROVED" | "LEGAL_APPROVAL_REQUIRED";
export type LegalDocumentPublicationStatus = "PUBLISHED" | "NOT_PUBLISHED";

export interface LegalDocumentManifestEntry {
  id: string;
  locale: LegalDocumentLocale;
  title: string;
  version: string;
  effectiveDate: string | null;
  contentHash: string | null;
  publicationStatus: LegalDocumentPublicationStatus;
  approvalStatus: LegalDocumentApprovalStatus;
  requiredForRegistration: boolean;
  approvalPlaceholders: readonly string[];
}

const REQUIRED_APPROVAL_PLACEHOLDERS = [
  "LEGAL_ENTITY_NAME_REQUIRED",
  "DATA_CONTROLLER_IDENTITY_REQUIRED",
  "LEGAL_CONTACT_REQUIRED",
  "LEGAL_APPROVAL_REQUIRED",
] as const;

const REGISTRATION_DOCUMENT_IDS = new Set(["terms", "privacy", "kvkk", "cookies"]);
const REQUIRED_TR_DOCUMENT_IDS = [
  "terms",
  "privacy",
  "kvkk",
  "cookies",
  "account_deletion",
  "support_contact",
  "community_provider_rules",
  "prohibited",
  "payment_policy",
] as const;

function sha256(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function existingTurkishEntry(id: string): LegalDocumentManifestEntry {
  const document = LEGAL_DOCUMENTS.find((candidate) => candidate.id === id);
  if (!document) {
    return {
      id,
      locale: "tr",
      title: id,
      version: "LEGAL_APPROVAL_REQUIRED",
      effectiveDate: null,
      contentHash: null,
      publicationStatus: "NOT_PUBLISHED",
      approvalStatus: "LEGAL_APPROVAL_REQUIRED",
      requiredForRegistration: false,
      approvalPlaceholders: REQUIRED_APPROVAL_PLACEHOLDERS,
    };
  }
  return {
    id,
    locale: "tr",
    title: document.title,
    version: document.version,
    effectiveDate: document.lastUpdated,
    contentHash: sha256(document.content),
    // Existing Turkish text remains available, but it cannot be asserted as a
    // production legal instrument without the named legal approval fields.
    publicationStatus: "PUBLISHED",
    approvalStatus: "LEGAL_APPROVAL_REQUIRED",
    requiredForRegistration: REGISTRATION_DOCUMENT_IDS.has(id),
    approvalPlaceholders: REQUIRED_APPROVAL_PLACEHOLDERS,
  };
}

function EnglishPendingEntry(id: string, title: string): LegalDocumentManifestEntry {
  const privacy = id === "privacy" ? PRIVACY_POLICY_TRANSLATIONS.en : null;
  return {
    id,
    locale: "en",
    title,
    version: privacy?.version ?? "LEGAL_APPROVAL_REQUIRED",
    effectiveDate: privacy?.lastUpdated ?? null,
    // The repository deliberately does not manufacture EN translations. The
    // pre-existing privacy working text is therefore not presented as an
    // approved publication and cannot unlock a release gate.
    contentHash: privacy ? sha256(privacy.content) : null,
    publicationStatus: privacy ? "PUBLISHED" : "NOT_PUBLISHED",
    approvalStatus: "LEGAL_APPROVAL_REQUIRED",
    requiredForRegistration: REGISTRATION_DOCUMENT_IDS.has(id),
    approvalPlaceholders: REQUIRED_APPROVAL_PLACEHOLDERS,
  };
}

/**
 * Versioned public-document manifest. It records content integrity without
 * inventing missing company identity, controller information, contact details,
 * jurisdictional wording, or English translations. A missing approval is a
 * release block, never an implicit approval.
 */
export function getLegalDocumentManifest(): LegalDocumentManifestEntry[] {
  const tr = REQUIRED_TR_DOCUMENT_IDS.map((id) => existingTurkishEntry(id));
  const en = [
    ["terms", "Terms of Use"],
    ["privacy", "Privacy Policy"],
    ["kvkk", "Data Processing Notice"],
    ["cookies", "Cookie Policy"],
    ["account_deletion", "Account and Data Deletion"],
    ["support_contact", "Contact and Support"],
    ["community_provider_rules", "Community and Provider Rules"],
    ["prohibited", "Prohibited Services"],
    ["payment_policy", "Payment, Cancellation, Refund and Dispute Framework"],
  ].map(([id, title]) => EnglishPendingEntry(id, title));
  return [...tr, ...en];
}

export function getLegalReleaseGate(manifest = getLegalDocumentManifest()) {
  const unresolved = manifest.filter((entry) =>
    entry.approvalStatus !== "APPROVED"
    || entry.publicationStatus !== "PUBLISHED"
    || !entry.effectiveDate
    || !entry.contentHash,
  );
  return {
    ready: unresolved.length === 0,
    reason: unresolved.length === 0 ? null : "LEGAL_APPROVAL_REQUIRED",
    unresolved: unresolved.map((entry) => ({ id: entry.id, locale: entry.locale, placeholders: entry.approvalPlaceholders })),
  } as const;
}

