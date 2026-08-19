/**
 * Stable, version-bound mappings from the approved TR Gold Master service
 * scopes to the database-owned service catalog. The source scope ordinal is
 * part of the approved immutable pack version; no user-facing display name is
 * used to infer a legal or operational mapping at runtime.
 */
export type CanonicalCatalogRow = {
  id: number;
  slug: string;
  isActive: number;
};

export type CanonicalSubcategoryRow = CanonicalCatalogRow & {
  categoryId: number;
};

export type GoldMasterCatalogSnapshot = {
  categories: readonly CanonicalCatalogRow[];
  subcategories: readonly CanonicalSubcategoryRow[];
};

export type GoldMasterScopeTarget = {
  categorySlug: string;
  subcategorySlug: string;
};

export type GoldMasterScopeMapping =
  | {
      status: "RESOLVED";
      value: GoldMasterScopeTarget & { categoryId: number; subcategoryId: number };
    }
  | {
      status: "MISSING_SERVICE_CATALOG_MAPPING";
      value: null;
      reason: "SCOPE_NOT_APPROVED_FOR_CATALOG" | "CANONICAL_TARGET_NOT_FOUND" | "CANONICAL_TARGET_INACTIVE";
    };

export function goldMasterSourceScopeKey(serviceKey: string, ruleIndex: number) {
  return `${serviceKey}:${ruleIndex + 1}`;
}

/**
 * Every approved source scope is explicitly represented. `null` means the
 * current DB catalog has no safe, exact canonical target; it is intentionally
 * retained as a legal-review-only draft capability rather than guessed.
 */
export const TR_GOLD_MASTER_SCOPE_TARGETS: Readonly<Record<string, GoldMasterScopeTarget | null>> = {
  "cleaning:1": { categorySlug: "cleaning", subcategorySlug: "home-cleaning" },
  "plumbing:1": { categorySlug: "plumbing", subcategorySlug: "faucet-installation" },
  "plumbing:2": { categorySlug: "plumbing", subcategorySlug: "leak-repair" },
  "plumbing:3": null,
  "electrical:1": { categorySlug: "electrical", subcategorySlug: "fault-repair" },
  "electrical:2": { categorySlug: "electrical", subcategorySlug: "panel-renewal" },
  "electrical:3": null,
  "painting:1": { categorySlug: "painting", subcategorySlug: "interior-painting" },
  "air_conditioning:1": { categorySlug: "hvac", subcategorySlug: "ac-maintenance" },
  "air_conditioning:2": { categorySlug: "hvac", subcategorySlug: "ac-installation" },
  "air_conditioning:3": null,
  "heating:1": { categorySlug: "hvac", subcategorySlug: "radiator-heating" },
  "heating:2": { categorySlug: "hvac", subcategorySlug: "boiler-maintenance" },
  "heating:3": { categorySlug: "plumbing", subcategorySlug: "boiler-piping" },
  "moving:1": { categorySlug: "moving", subcategorySlug: "house-moving" },
  "moving:2": { categorySlug: "moving", subcategorySlug: "intercity-moving" },
  "moving:3": { categorySlug: "moving", subcategorySlug: "single-item-moving" },
  "moving:4": null,
  "locksmith:1": { categorySlug: "locksmith", subcategorySlug: "lock-replacement" },
  "locksmith:2": { categorySlug: "locksmith", subcategorySlug: "door-opening" },
  "locksmith:3": { categorySlug: "locksmith", subcategorySlug: "car-locksmith" },
  "towing:1": { categorySlug: "towing", subcategorySlug: "vehicle-transport" },
  "roadside_assistance:1": { categorySlug: "roadside", subcategorySlug: "battery-jump" },
  "roadside_assistance:2": { categorySlug: "roadside", subcategorySlug: "tire-change" },
  "roadside_assistance:3": { categorySlug: "roadside", subcategorySlug: "minor-repair" },
  "roadside_assistance:4": { categorySlug: "towing", subcategorySlug: "breakdown-tow" },
  "roadside_assistance:5": { categorySlug: "locksmith", subcategorySlug: "car-locksmith" },
  "roadside_assistance:6": { categorySlug: "roadside", subcategorySlug: "fuel-delivery" },
  "courier:1": { categorySlug: "courier", subcategorySlug: "moto-courier" },
  "courier:2": { categorySlug: "courier", subcategorySlug: "parcel-courier" },
  "courier:3": null,
  "furniture:1": { categorySlug: "home-repair", subcategorySlug: "furniture-assembly" },
  "furniture:2": null,
  "automotive:1": { categorySlug: "automotive", subcategorySlug: "vehicle-maintenance" },
  "automotive:2": null,
  "automotive:3": { categorySlug: "automotive", subcategorySlug: "tire-service" },
  "automotive:4": null,
  "automotive:5": null,
};

export function resolveGoldMasterScopeMapping(
  snapshot: GoldMasterCatalogSnapshot,
  sourceScopeKey: string,
): GoldMasterScopeMapping {
  const target = TR_GOLD_MASTER_SCOPE_TARGETS[sourceScopeKey];
  if (!target) {
    return {
      status: "MISSING_SERVICE_CATALOG_MAPPING",
      value: null,
      reason: "SCOPE_NOT_APPROVED_FOR_CATALOG",
    };
  }

  const category = snapshot.categories.find((candidate) => candidate.slug === target.categorySlug);
  if (!category) {
    return { status: "MISSING_SERVICE_CATALOG_MAPPING", value: null, reason: "CANONICAL_TARGET_NOT_FOUND" };
  }
  if (category.isActive !== 1) {
    return { status: "MISSING_SERVICE_CATALOG_MAPPING", value: null, reason: "CANONICAL_TARGET_INACTIVE" };
  }

  const subcategory = snapshot.subcategories.find(
    (candidate) => candidate.categoryId === category.id && candidate.slug === target.subcategorySlug,
  );
  if (!subcategory) {
    return { status: "MISSING_SERVICE_CATALOG_MAPPING", value: null, reason: "CANONICAL_TARGET_NOT_FOUND" };
  }
  if (subcategory.isActive !== 1) {
    return { status: "MISSING_SERVICE_CATALOG_MAPPING", value: null, reason: "CANONICAL_TARGET_INACTIVE" };
  }

  return {
    status: "RESOLVED",
    value: {
      ...target,
      categoryId: category.id,
      subcategoryId: subcategory.id,
    },
  };
}
