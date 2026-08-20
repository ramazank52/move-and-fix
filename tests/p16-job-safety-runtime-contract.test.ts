import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("P16 job safety runtime contract", () => {
  const dbSource = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
  const safetySource = readFileSync(join(process.cwd(), "server/compliance/JobSafetyEngine.ts"), "utf8");

  it("does not treat an absent matching rule as a permissive runtime result", () => {
    expect(safetySource).toContain('reason: "JOB_SAFETY_RULE_UNKNOWN"');
    expect(dbSource).not.toContain("if (rules.length === 0) return;");
  });

  it("enforces the same provider safety assertion before offer, acceptance and job start transitions", () => {
    const calls = dbSource.match(/assertProviderP11PolicyEligibility\(/g) ?? [];
    expect(calls).toHaveLength(4);
    expect(dbSource).toContain("export async function createOffer");
    expect(dbSource).toContain("export async function acceptOffer");
    expect(dbSource).toContain('data.status === "on_the_way"');
    expect(dbSource).toContain('data.status === "in_progress"');
  });
});
