import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const ownerRouter = readFileSync(resolve(root, "server/_core/ownerRouter.ts"), "utf8");
const repository = readFileSync(resolve(root, "server/compliance/CountryMarketControlRepository.ts"), "utf8");
const complianceRepository = readFileSync(resolve(root, "server/compliance/CountryComplianceRepository.ts"), "utf8");

describe("country market control authorization contract", () => {
  it("requires both Super Admin MFA and platform owner identity for state views and mutations", () => {
    expect(ownerRouter).toMatch(/countryMarketControls:\s*superAdminMfaProcedure/);
    expect(ownerRouter).toMatch(/requestCountryMarketDesiredState:\s*superAdminMfaProcedure/);
    expect(ownerRouter).toMatch(/assertPlatformOwner\(ctx\)/);
    expect(ownerRouter).toMatch(/getValidAdminMfaGrantId/);
  });

  it("does not accept client-supplied readiness booleans or an effective state", () => {
    const mutationInput = ownerRouter.match(/requestCountryMarketDesiredState:\s*superAdminMfaProcedure[\s\S]{0,1600}?\.mutation/)?.[0] ?? "";
    expect(mutationInput).not.toContain("effectiveState:");
    expect(mutationInput).not.toContain("officialSourceVerified:");
    expect(mutationInput).not.toContain("ownerReleaseApprovalLedgerValid:");
    expect(repository).toContain("buildServerDerivedGateSnapshot");
    expect(repository).toContain("deriveCountryMarketEffectiveState");
  });

  it("adds the effective market control as a narrowing server-side gate before legacy deployment flags", () => {
    const transitionBody = complianceRepository.slice(complianceRepository.indexOf("const deployment = deploymentRows"));
    const controlIndex = transitionBody.indexOf("const marketReason");
    const deploymentIndex = transitionBody.indexOf("const deploymentReason");
    expect(controlIndex).toBeGreaterThan(-1);
    expect(deploymentIndex).toBeGreaterThan(controlIndex);
  });
});
