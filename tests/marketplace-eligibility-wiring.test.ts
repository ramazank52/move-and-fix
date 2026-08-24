import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

describe("marketplace central eligibility wiring", () => {
  it("requires the server-owned evaluator at every implemented marketplace transition", () => {
    const references = dbSource.match(/assertProviderMarketplaceEligibilityForRequest\(/g) ?? [];
    // Definition + opportunity exposure + offer create + offer acceptance + job start.
    expect(references.length).toBeGreaterThanOrEqual(5);
    expect(dbSource).toContain('transition: "OPPORTUNITY_EXPOSURE"');
    expect(dbSource).toContain('transition: "OFFER_CREATE"');
    expect(dbSource).toContain('transition: "OFFER_ACCEPT"');
    expect(dbSource).toContain('transition: "JOB_START"');
  });

  it("keeps opportunity notification intent in-app-only and PII-minimised", () => {
    expect(dbSource).toContain("marketplaceOpportunityNotifications");
    expect(dbSource).toContain("buildOpportunityNotificationIntent");
    expect(dbSource).not.toContain("sendOpportunitySms");
    expect(dbSource).not.toContain("sendOpportunityEmail");
  });
});
