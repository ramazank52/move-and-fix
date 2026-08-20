import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveServiceCatalogAlias } from "../server/compliance/ServiceCatalogResolver";

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

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
    expect(source).toContain("language,");
  });

  it("accepts a model alias only when it is an active canonical catalog candidate", () => {
    const source = readProjectFile("server/routers.ts");
    const repository = readProjectFile("server/db.ts");

    expect(source).toContain("const catalogCandidates = await db.listMoveAiCatalogCandidates()");
    expect(source).toContain("const canonicalCandidate = catalogCandidates.find((item) => item.alias === category)");
    expect(source).toContain("if (parsed.shouldCreateRequest && canonicalCandidate)");
    expect(source).toContain("const catalogResolution = await db.resolveMoveAiCatalogCategory(category)");
    expect(source).toContain('catalogResolution: "MISSING_SERVICE_CATALOG_MAPPING" as const');
    expect(repository).toContain('if (entry.namespace !== "external_service" || entry.isActive !== 1) continue');
    expect(repository).toContain('if (resolution.status !== "RESOLVED") continue');
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
