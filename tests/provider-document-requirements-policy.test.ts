import { describe, expect, it } from "vitest";
import { resolveProviderDocumentRequirements } from "../server/compliance/ProviderDocumentRequirementsPolicy";
import {
  resolveApprovedSourceService,
  resolveCanonicalServiceIdentity,
  resolveServiceCatalogAlias,
  type ServiceCatalogSnapshot,
} from "../server/compliance/ServiceCatalogResolver";

const snapshot: ServiceCatalogSnapshot = {
  categories: [
    { id: 14, slug: "courier", name: "Kurye", isActive: 1 },
    { id: 2, slug: "electrical", name: "Elektrik", isActive: 1 },
    { id: 4, slug: "hvac", name: "Klima/Isıtma", isActive: 1 },
  ],
  subcategories: [],
  aliases: [
    { namespace: "approved_source_service", alias: "courier", categoryId: 14, subcategoryId: 0, isActive: 1 },
    { namespace: "approved_source_service", alias: "electrical", categoryId: 2, subcategoryId: 0, isActive: 1 },
    { namespace: "approved_source_service", alias: "air-conditioning", categoryId: 4, subcategoryId: 0, isActive: 1 },
    { namespace: "approved_source_service", alias: "heating", categoryId: 4, subcategoryId: 0, isActive: 1 },
    { namespace: "request_service_type", alias: "courier", categoryId: 14, subcategoryId: 0, isActive: 1 },
  ],
};

function requirementsFor(categoryId: number | null) {
  const identity = categoryId == null
    ? { status: "MISSING_SERVICE_CATALOG_MAPPING" as const, value: null }
    : resolveCanonicalServiceIdentity(snapshot, { categoryId });
  return resolveProviderDocumentRequirements({
    catalogIdentity: identity.status === "RESOLVED" ? identity.value : null,
    sourceService: identity.status === "RESOLVED"
      ? resolveApprovedSourceService(snapshot, identity.value)
      : identity,
  });
}

describe("ProviderDocumentRequirementsPolicy", () => {
  it("keeps an unmapped category fail-closed instead of inferring legal requirements", () => {
    const requirements = requirementsFor(null);

    expect(requirements.policyVersion).toBe("TR-GOLD-2026-08-13-v1.0");
    expect(requirements.countryCode).toBe("TR");
    expect(requirements.sourceMatched).toBe(false);
    expect(requirements.legalReviewRequired).toBe(true);
    expect(requirements.required).toEqual([expect.objectContaining({ type: "identity" })]);
  });

  it("derives the full courier checklist from the approved source instead of a fixed transport bundle", () => {
    const courier = requirementsFor(14);
    const electrical = requirementsFor(2);

    expect(courier.sourceMatched).toBe(true);
    expect(courier.category.sourceServiceKey).toBe("courier");
    expect(courier.required).toContainEqual(expect.objectContaining({ title: expect.stringContaining("SRC") }));
    expect(courier.required.map((item) => item.type)).not.toContain("driver_license");
    expect(courier.required.filter((item) => item.type.startsWith("tr-gold-courier-")).length).toBeGreaterThan(0);
    expect(electrical.sourceMatched).toBe(true);
    expect(electrical.required).toContainEqual(expect.objectContaining({ title: expect.stringContaining("Elektrik Tesisatçısı") }));
  });

  it("fails closed when one canonical catalog scope has more than one approved-source mapping", () => {
    const hvac = requirementsFor(4);

    expect(hvac.sourceMatched).toBe(false);
    expect(hvac.category.mappingStatus).toBe("AMBIGUOUS_SERVICE_MAPPING");
    expect(hvac.legalReviewRequired).toBe(true);
  });

  it("accepts request detail aliases only when an explicit DB alias targets the same canonical category", () => {
    const courier = resolveServiceCatalogAlias(snapshot, {
      namespace: "request_service_type",
      alias: "courier",
      categoryId: 14,
    });
    const electrical = resolveServiceCatalogAlias(snapshot, {
      namespace: "request_service_type",
      alias: "courier",
      categoryId: 2,
    });

    expect(courier.status).toBe("RESOLVED");
    expect(electrical.status).toBe("MISSING_SERVICE_CATALOG_MAPPING");
  });
});
