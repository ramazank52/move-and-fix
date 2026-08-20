import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveServiceCatalogAlias } from "../server/compliance/ServiceCatalogResolver";

const readProjectFile = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

describe("P16 MoveAI canonical catalog and country launch contract", () => {
  it("requires an explicit active canonical alias and blocks unknown aliases", () => {
    const snapshot = {
      categories: [{ id: 7, slug: "repair", name: "Repair", isActive: 1 }],
      subcategories: [{ id: 11, categoryId: 7, slug: "plumbing", name: "Plumbing", isActive: 1 }],
      aliases: [{ namespace: "external_service" as const, alias: "water-leak", categoryId: 7, subcategoryId: 11, isActive: 1 }],
    };

    expect(resolveServiceCatalogAlias(snapshot, { namespace: "external_service", alias: "water-leak" })).toMatchObject({
      status: "RESOLVED",
      value: { categoryId: 7, subcategoryId: 11 },
    });
    expect(resolveServiceCatalogAlias(snapshot, { namespace: "external_service", alias: "unregistered-service" })).toMatchObject({
      status: "MISSING_SERVICE_CATALOG_MAPPING",
      value: null,
    });
  });

  it("removes client fallback behavior and sends an explicit country to draft confirmation", () => {
    const source = readProjectFile("app/ai-assistant.tsx");
    expect(source).not.toContain("getMoveAiClientFallbackResponse");
    expect(source).toContain("trpc.countryRegistry.list.useQuery()");
    expect(source).toContain("countryCode: selectableCountries[0]!.countryCode");
    expect(source).toContain("countryCode: country.countryCode");
  });

  it("exposes enabled and payment-ready jurisdictions as selectable, while retaining explicit non-selectable availability", () => {
    const source = readProjectFile("server/compliance/CountryComplianceRepository.ts");
    const routerSource = readProjectFile("server/routers.ts");
    expect(source).toContain("gate?.status === \"enabled\" && paymentReadiness.ready");
    expect(source).toContain("availability: selectable");
    expect(source).toContain('"AVAILABLE" as const');
    expect(source).toContain('"COMING_SOON" as const');
    expect(source).toContain('"BLOCKED" as const');
    expect(routerSource).toContain("countryRegistry: router({");
    expect(routerSource).toContain("listPublicCountryLaunchOptions()");
  });
});
