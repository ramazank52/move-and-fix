import countryPack from "./approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Gold_Master_Country_Pack_v1.json";

type ApprovedService = (typeof countryPack.services)[number];

export type ProviderDocumentRequirement = {
  /** Stable, source-derived identifier; never a client-defined document category. */
  type: string;
  title: string;
  description: string;
  sourceReferenceIds: string[];
};

export type ProviderDocumentRequirements = {
  policyVersion: string;
  countryCode: string;
  category: {
    slug: string | null;
    name: string | null;
    sourceServiceKey: string | null;
  };
  sourceMatched: boolean;
  legalReviewRequired: boolean;
  required: ProviderDocumentRequirement[];
};

const serviceAliases: Record<string, string> = {
  "su-tesisati": "plumbing",
  plumbing: "plumbing",
  elektrik: "electrical",
  electrical: "electrical",
  "boya-badana": "painting",
  painting: "painting",
  klima: "air_conditioning",
  "air-conditioning": "air_conditioning",
  air_conditioning: "air_conditioning",
  "kombi-isitma": "heating",
  heating: "heating",
  tasima: "moving",
  moving: "moving",
  temizlik: "cleaning",
  cleaning: "cleaning",
  cekici: "towing",
  towing: "towing",
  "yol-yardimi": "roadside_assistance",
  "roadside-assistance": "roadside_assistance",
  roadside_assistance: "roadside_assistance",
  kurye: "courier",
  courier: "courier",
};

function normalizeCategory(value: string | null) {
  return value
    ?.trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || null;
}

function sourceDocumentType(serviceKey: string, ruleIndex: number, credentialIndex: number) {
  return `tr-gold-${serviceKey}-${ruleIndex + 1}-credential-${credentialIndex + 1}`.slice(0, 160);
}

const identityRequirement: ProviderDocumentRequirement = {
  type: "identity",
  title: "Kimlik belgesi",
  description: countryPack.common_rules.identity,
  sourceReferenceIds: [],
};

/**
 * Builds the onboarding checklist strictly from the approved source package.
 * A category that cannot be mapped to a source service is intentionally not
 * expanded by an inferred rule; downstream capability activation must block it.
 */
export function resolveProviderDocumentRequirements(input: {
  categorySlug: string | null;
  categoryName: string | null;
}): ProviderDocumentRequirements {
  const categorySlug = normalizeCategory(input.categorySlug);
  const categoryName = input.categoryName?.trim() || null;
  const normalizedName = normalizeCategory(categoryName);
  const sourceServiceKey = (categorySlug && serviceAliases[categorySlug]) ||
    (normalizedName && serviceAliases[normalizedName]) ||
    null;
  const service = sourceServiceKey
    ? countryPack.services.find((candidate) => candidate.key === sourceServiceKey) ?? null
    : null;

  const required = [identityRequirement];
  if (service) {
    const discovered = service.rules.flatMap((rule, ruleIndex) =>
      (rule.credentials ?? []).map((credential, credentialIndex) => ({
        type: sourceDocumentType(service.key, ruleIndex, credentialIndex),
        title: credential,
        description: `${rule.subservice} — Kaynak durumu: ${rule.status}. İnsan incelemesi olmadan etkinleştirilmez.`,
        sourceReferenceIds: [...(rule.sources ?? [])],
      })),
    );
    const seen = new Set(required.map((item) => item.type));
    for (const requirement of discovered) {
      if (!seen.has(requirement.type)) {
        required.push(requirement);
        seen.add(requirement.type);
      }
    }
  }

  return {
    policyVersion: countryPack.pack_id,
    countryCode: countryPack.country_code,
    category: { slug: categorySlug, name: categoryName, sourceServiceKey },
    sourceMatched: Boolean(service),
    // The approved pack itself requires production legal sign-off. This flag is
    // informational for onboarding; unknown/mismatched scopes are enforced as a block.
    legalReviewRequired: countryPack.status.includes("LEGAL_SIGNOFF_REQUIRED") || !service,
    required,
  };
}
