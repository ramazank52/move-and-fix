import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync("server/db.ts", "utf8");
const acceptOfferSection = dbSource.slice(dbSource.indexOf("export async function acceptOffer"), dbSource.indexOf("export async function rejectOffer"));

describe("P33 provider capacity offer-acceptance contracts", () => {
  it("uses a provider row lock and active-job capacity guard before selecting the request winner", () => {
    expect(acceptOfferSection).toContain("SELECT maxConcurrentActiveJobs");
    expect(acceptOfferSection).toContain("FOR UPDATE");
    expect(acceptOfferSection).toContain("assertProviderCapacityAvailable");
    expect(acceptOfferSection.indexOf("assertProviderCapacityAvailable")).toBeLessThan(acceptOfferSection.indexOf("const requestUpdate"));
    expect(acceptOfferSection).toContain('eq(serviceRequests.status, "active")');
    expect(acceptOfferSection).toContain("OFFER_ACCEPT_CONFLICT");
  });

  it("falls back only for the unapplied capacity column and keeps other query failures visible", () => {
    expect(acceptOfferSection).toContain("isUnknownProviderCapacityColumn");
    expect(acceptOfferSection).toContain("if (!isUnknownProviderCapacityColumn(capacityError)) throw capacityError");
    expect(acceptOfferSection).toContain("configuredMaxConcurrentActiveJobs = undefined");
  });
});
