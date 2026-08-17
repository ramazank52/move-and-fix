import { describe, expect, it } from "vitest";
import { resolveProviderDocumentRequirements } from "../server/compliance/ProviderDocumentRequirementsPolicy";

describe("ProviderDocumentRequirementsPolicy", () => {
  it("requires the identity document for every provider scope", () => {
    const requirements = resolveProviderDocumentRequirements({ categorySlug: null, categoryName: null });

    expect(requirements.required).toEqual([
      expect.objectContaining({ type: "identity" }),
    ]);
  });

  it("adds road-transport documents only for the bounded transport scopes", () => {
    const courier = resolveProviderDocumentRequirements({ categorySlug: "courier", categoryName: "Kurye" });
    const electrical = resolveProviderDocumentRequirements({ categorySlug: "electrical", categoryName: "Elektrik" });

    expect(courier.required.map((item) => item.type)).toEqual([
      "identity",
      "driver_license",
      "src_certificate",
      "psychotechnic",
    ]);
    expect(electrical.required.map((item) => item.type)).toEqual(["identity"]);
  });
});
