import { describe, expect, it } from "vitest";
import { resolveProviderDocumentRequirements } from "../server/compliance/ProviderDocumentRequirementsPolicy";

describe("ProviderDocumentRequirementsPolicy", () => {
  it("keeps an unmapped category fail-closed instead of inferring legal requirements", () => {
    const requirements = resolveProviderDocumentRequirements({ categorySlug: null, categoryName: null });

    expect(requirements.policyVersion).toBe("TR-GOLD-2026-08-13-v1.0");
    expect(requirements.countryCode).toBe("TR");
    expect(requirements.sourceMatched).toBe(false);
    expect(requirements.legalReviewRequired).toBe(true);
    expect(requirements.required).toEqual([expect.objectContaining({ type: "identity" })]);
  });

  it("derives the full courier checklist from the approved source instead of a fixed transport bundle", () => {
    const courier = resolveProviderDocumentRequirements({ categorySlug: "courier", categoryName: "Kurye" });
    const electrical = resolveProviderDocumentRequirements({ categorySlug: "electrical", categoryName: "Elektrik" });

    expect(courier.sourceMatched).toBe(true);
    expect(courier.category.sourceServiceKey).toBe("courier");
    expect(courier.required).toContainEqual(expect.objectContaining({ title: expect.stringContaining("SRC") }));
    expect(courier.required.map((item) => item.type)).not.toContain("driver_license");
    expect(courier.required.filter((item) => item.type.startsWith("tr-gold-courier-")).length).toBeGreaterThan(0);
    expect(electrical.sourceMatched).toBe(true);
    expect(electrical.required).toContainEqual(expect.objectContaining({ title: expect.stringContaining("Elektrik Tesisatçısı") }));
  });
});
