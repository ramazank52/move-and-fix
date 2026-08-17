export const PROVIDER_DOCUMENT_TYPES = [
  "identity",
  "driver_license",
  "src_certificate",
  "psychotechnic",
] as const;

export type ProviderDocumentType = (typeof PROVIDER_DOCUMENT_TYPES)[number];

export type ProviderDocumentRequirement = {
  type: ProviderDocumentType;
  title: string;
  description: string;
};

export type ProviderDocumentRequirements = {
  policyVersion: "tr-provider-documents-2026-08";
  category: {
    slug: string | null;
    name: string | null;
  };
  required: ProviderDocumentRequirement[];
};

const identityRequirement: ProviderDocumentRequirement = {
  type: "identity",
  title: "Kimlik belgesi",
  description: "T.C. kimlik kartı veya pasaport",
};

const driverLicenseRequirement: ProviderDocumentRequirement = {
  type: "driver_license",
  title: "Ehliyet",
  description: "Sürücü belgesi",
};

const srcCertificateRequirement: ProviderDocumentRequirement = {
  type: "src_certificate",
  title: "SRC belgesi",
  description: "Ticari taşıma için geçerli SRC belgesi",
};

const psychotechnicRequirement: ProviderDocumentRequirement = {
  type: "psychotechnic",
  title: "Psikoteknik belgesi",
  description: "Sürüş hizmetleri için geçerli psikoteknik belgesi",
};

const roadTransportCategorySlugs = new Set(["courier", "tow_truck", "tow-truck", "roadside"]);

/**
 * Türkiye lansmanında belge türleri yalnız bu policy ile türetilir. Bilinmeyen
 * veya henüz atanmamış kategori, kapsam genişletmek yerine yalnız temel kimlik
 * gereksinimini döndürür; ek capability aktivasyonu ayrı uyum kontrollerinden geçer.
 */
export function resolveProviderDocumentRequirements(input: {
  categorySlug: string | null;
  categoryName: string | null;
}): ProviderDocumentRequirements {
  const categorySlug = input.categorySlug?.trim().toLowerCase() || null;
  const required = [identityRequirement];

  if (categorySlug && roadTransportCategorySlugs.has(categorySlug)) {
    required.push(driverLicenseRequirement, srcCertificateRequirement, psychotechnicRequirement);
  }

  return {
    policyVersion: "tr-provider-documents-2026-08",
    category: {
      slug: categorySlug,
      name: input.categoryName,
    },
    required,
  };
}
