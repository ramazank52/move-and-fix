/**
 * P14 canonical service catalog resolver.
 *
 * Canonical identities always originate in the service catalog tables. Legacy,
 * external and approved-source names are treated only as explicit, auditable
 * aliases stored in `service_catalog_aliases`; display labels are never used
 * as a production fallback.
 */
export type ServiceCatalogCategory = {
  id: number;
  slug: string;
  name: string;
  isActive: number;
};

export type ServiceCatalogSubcategory = {
  id: number;
  categoryId: number;
  slug: string;
  name: string;
  isActive: number;
};

export type ServiceCatalogAlias = {
  namespace: "legacy_category" | "external_service" | "approved_source_service" | "request_service_type";
  alias: string;
  categoryId: number;
  /** Zero explicitly represents a category-wide mapping. */
  subcategoryId: number;
  isActive: number;
};

export type ServiceCatalogSnapshot = {
  categories: ServiceCatalogCategory[];
  subcategories: ServiceCatalogSubcategory[];
  aliases: ServiceCatalogAlias[];
};

export type CanonicalServiceIdentity = {
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  subcategoryId: number | null;
  subcategorySlug: string | null;
  subcategoryName: string | null;
};

export type CatalogResolution<T> =
  | { status: "RESOLVED"; value: T }
  | { status: "MISSING_SERVICE_CATALOG_MAPPING"; value: null }
  | { status: "AMBIGUOUS_SERVICE_MAPPING"; value: null };

export function normalizeServiceCatalogAlias(value: string | null | undefined) {
  return value
    ?.trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || null;
}

function identityKey(identity: CanonicalServiceIdentity) {
  return `${identity.categoryId}:${identity.subcategoryId ?? 0}`;
}

function toIdentity(
  snapshot: ServiceCatalogSnapshot,
  categoryId: number,
  subcategoryId: number | null,
): CanonicalServiceIdentity | null {
  const category = snapshot.categories.find((item) => item.id === categoryId && item.isActive === 1);
  if (!category) return null;

  if (subcategoryId == null) {
    return {
      categoryId: category.id,
      categorySlug: category.slug,
      categoryName: category.name,
      subcategoryId: null,
      subcategorySlug: null,
      subcategoryName: null,
    };
  }

  const subcategory = snapshot.subcategories.find(
    (item) => item.id === subcategoryId && item.categoryId === category.id && item.isActive === 1,
  );
  if (!subcategory) return null;

  return {
    categoryId: category.id,
    categorySlug: category.slug,
    categoryName: category.name,
    subcategoryId: subcategory.id,
    subcategorySlug: subcategory.slug,
    subcategoryName: subcategory.name,
  };
}

/** Resolves a caller-supplied canonical catalog ID pair; no name inference exists. */
export function resolveCanonicalServiceIdentity(
  snapshot: ServiceCatalogSnapshot,
  input: { categoryId: number; subcategoryId?: number | null },
): CatalogResolution<CanonicalServiceIdentity> {
  const identity = toIdentity(snapshot, input.categoryId, input.subcategoryId ?? null);
  return identity
    ? { status: "RESOLVED", value: identity }
    : { status: "MISSING_SERVICE_CATALOG_MAPPING", value: null };
}

/**
 * Resolves an explicit alias within the supplied canonical service scope.
 * Multiple distinct live targets are an explicit fail-closed condition.
 */
export function resolveServiceCatalogAlias(
  snapshot: ServiceCatalogSnapshot,
  input: {
    namespace: ServiceCatalogAlias["namespace"];
    alias: string | null | undefined;
    categoryId?: number;
    subcategoryId?: number | null;
  },
): CatalogResolution<CanonicalServiceIdentity> {
  const alias = normalizeServiceCatalogAlias(input.alias);
  if (!alias) return { status: "MISSING_SERVICE_CATALOG_MAPPING", value: null };

  const aliases = snapshot.aliases.filter((candidate) => {
    if (candidate.isActive !== 1 || candidate.namespace !== input.namespace || candidate.alias !== alias) return false;
    if (input.categoryId != null && candidate.categoryId !== input.categoryId) return false;
    if (input.subcategoryId != null && candidate.subcategoryId !== 0 && candidate.subcategoryId !== input.subcategoryId) return false;
    return true;
  });

  const identities = new Map<string, CanonicalServiceIdentity>();
  for (const candidate of aliases) {
    const scopedSubcategoryId = candidate.subcategoryId === 0 ? input.subcategoryId ?? null : candidate.subcategoryId;
    const identity = toIdentity(snapshot, candidate.categoryId, scopedSubcategoryId);
    if (identity) identities.set(identityKey(identity), identity);
  }

  if (identities.size === 0) return { status: "MISSING_SERVICE_CATALOG_MAPPING", value: null };
  if (identities.size > 1) return { status: "AMBIGUOUS_SERVICE_MAPPING", value: null };
  return { status: "RESOLVED", value: [...identities.values()][0] };
}

/**
 * Maps an already-canonical catalog identity to a Gold Master service key using
 * only the approved-source aliases persisted in the database.
 */
export function resolveApprovedSourceService(
  snapshot: ServiceCatalogSnapshot,
  identity: CanonicalServiceIdentity,
): CatalogResolution<string> {
  const aliases = snapshot.aliases.filter((candidate) =>
    candidate.isActive === 1 &&
    candidate.namespace === "approved_source_service" &&
    candidate.categoryId === identity.categoryId &&
    (candidate.subcategoryId === 0 || candidate.subcategoryId === identity.subcategoryId),
  );

  const sourceKeys = new Set(aliases.map((candidate) => candidate.alias));
  if (sourceKeys.size === 0) return { status: "MISSING_SERVICE_CATALOG_MAPPING", value: null };
  if (sourceKeys.size > 1) return { status: "AMBIGUOUS_SERVICE_MAPPING", value: null };
  return { status: "RESOLVED", value: [...sourceKeys][0] };
}
