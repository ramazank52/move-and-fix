import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";

import { describe, expect, it } from "vitest";

import { isEligiblePriceIntelligenceSettlement } from "../server/db";

describe("P17 partial settlement downstream semantics", () => {
  it("uses only undisputed or fully provider-resolved releases as market-price evidence", () => {
    expect(isEligiblePriceIntelligenceSettlement(null)).toBe(true);
    expect(isEligiblePriceIntelligenceSettlement(undefined)).toBe(true);
    expect(isEligiblePriceIntelligenceSettlement("resolved_provider")).toBe(true);

    expect(isEligiblePriceIntelligenceSettlement("open")).toBe(false);
    expect(isEligiblePriceIntelligenceSettlement("under_review")).toBe(false);
    expect(isEligiblePriceIntelligenceSettlement("resolved_customer")).toBe(false);
    expect(isEligiblePriceIntelligenceSettlement("resolved_partial")).toBe(false);
  });

  it("keeps the database query fail-closed for partial, customer and unknown dispute outcomes", async () => {
    const dbSource = await readFile(fileURLToPath(new URL("../server/db.ts", import.meta.url)), "utf8");

    expect(dbSource).toContain('or(isNull(completionDisputes.id), eq(completionDisputes.status, "resolved_provider"))');
    expect(dbSource).toContain("customer/partial/unknown disputes");
    expect(dbSource).not.toContain('ne(completionDisputes.status, "resolved_partial")');
  });
});
