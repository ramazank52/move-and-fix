import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertProviderMarketplaceEligibility,
  decideProviderMarketplaceEligibility,
  type ProviderMarketplaceEligibilityInput,
} from "../server/matching/ProviderEligibilityService";

const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

const eligible = (overrides: Partial<ProviderMarketplaceEligibilityInput> = {}): ProviderMarketplaceEligibilityInput => ({
  transition: "OFFER_ACCEPT",
  countryTransitionAllowed: true,
  requestIsOpenAndUnassigned: true,
  providerIsVerified: true,
  providerIsAvailable: true,
  providerEnforcementClear: true,
  providerCapacityAvailable: true,
  capabilityAllowed: true,
  credentialAllowed: true,
  scopeAllowed: true,
  serviceAreaAllowed: true,
  safetyAllowed: true,
  ...overrides,
});

describe("P1.4 marketplace negative security contracts", () => {
  it("denies a stale or expired capability before the accept transition", () => {
    const decision = decideProviderMarketplaceEligibility(eligible({ capabilityAllowed: false }));
    expect(decision.allowed).toBe(false);
    expect(decision.blockers).toContain("CAPABILITY_NOT_ELIGIBLE");
    expect(() => assertProviderMarketplaceEligibility(eligible({ credentialAllowed: false }))).toThrow(
      "PROVIDER_MARKETPLACE_INELIGIBLE:CREDENTIAL_NOT_ELIGIBLE",
    );
  });

  it("denies an enforced provider even if every client-visible capability flag appears valid", () => {
    const decision = decideProviderMarketplaceEligibility(eligible({ providerEnforcementClear: false }));
    expect(decision.allowed).toBe(false);
    expect(decision.blockers).toContain("PROVIDER_ENFORCEMENT_BLOCKED");
  });

  it("keeps customer acceptance ownership and provider duplicate scope server-side", () => {
    const acceptBody = dbSource.slice(dbSource.indexOf("export async function acceptOffer"), dbSource.indexOf("export async function rejectOffer"));
    const createBody = dbSource.slice(dbSource.indexOf("export async function createOffer"), dbSource.indexOf("export async function acceptOffer"));

    expect(acceptBody).toContain("eq(serviceRequests.userId, userId)");
    expect(acceptBody).toContain("eq(serviceRequests.status, \"pending\")");
    expect(acceptBody).toContain("OFFER_ACCEPT_CONFLICT");
    expect(createBody).toContain("eq(offers.requestId, data.requestId)");
    expect(createBody).toContain("eq(offers.providerId, data.providerId)");
  });
});
