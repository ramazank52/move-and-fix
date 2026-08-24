import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const trpcSource = readFileSync(resolve(process.cwd(), "server/_core/trpc.ts"), "utf8");
const ownerSource = readFileSync(resolve(process.cwd(), "server/_core/ownerRouter.ts"), "utf8");

function procedureDeclaration(name: string) {
  const marker = `${name}:`;
  const start = ownerSource.indexOf(marker);
  if (start < 0) return "";
  const next = ownerSource.indexOf("\n  ", start + marker.length);
  return ownerSource.slice(start, next < 0 ? undefined : next);
}

describe("Master P1.8 admin MFA negative contracts", () => {
  it("binds the admin MFA grant to the authenticated user and session fingerprint", () => {
    expect(trpcSource).toContain("!ctx.user || !ctx.sessionFingerprint");
    expect(trpcSource).toContain("hasValidAdminMfaGrant({ userId: ctx.user.id, sessionFingerprint: ctx.sessionFingerprint })");
    expect(trpcSource).toContain('code: "PRECONDITION_FAILED"');
  });

  it("requires super-admin authority after MFA for country control and high-privilege operations", () => {
    expect(trpcSource).toContain("hasActiveSuperAdminRole(ctx.user.id)");
    for (const name of ["operationsControl", "requestCountryMarketDesiredState", "countryMarketControls"]) {
      expect(procedureDeclaration(name)).toContain("superAdminMfaProcedure");
    }
  });

  it("requires an MFA-bound procedure for platform withdrawal and kill-switch capable feature flags", () => {
    expect(procedureDeclaration("withdrawFunds")).toContain("adminMfaProcedure");
    expect(procedureDeclaration("setFeatureFlag")).toContain("adminMfaProcedure");
    expect(ownerSource).toContain("killSwitch: z.boolean().optional()");
  });
});
