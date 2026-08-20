import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEV_SEED_EXPLICIT_OPT_IN_REQUIRED,
  DEV_SEED_FORBIDDEN_IN_PRODUCTION,
  assertDevelopmentFixtureSeedAllowed,
} from "../scripts/seed";

const root = process.cwd();

describe("P16 production seed hygiene", () => {
  it("hard-fails development fixtures before any database mutation in production", () => {
    expect(() =>
      assertDevelopmentFixtureSeedAllowed({
        NODE_ENV: "production",
        ALLOW_DEV_SEED: "true",
        DATABASE_URL: "mysql://production.example/movefix",
      }),
    ).toThrow(DEV_SEED_FORBIDDEN_IN_PRODUCTION);
  });

  it("requires explicit development opt-in before any fixture database connection", () => {
    expect(() =>
      assertDevelopmentFixtureSeedAllowed({
        NODE_ENV: "development",
        DATABASE_URL: "mysql://localhost/movefix_dev",
      }),
    ).toThrow(DEV_SEED_EXPLICIT_OPT_IN_REQUIRED);

    expect(() =>
      assertDevelopmentFixtureSeedAllowed({
        NODE_ENV: "development",
        ALLOW_DEV_SEED: "true",
        DATABASE_URL: "mysql://localhost/movefix_dev",
      }),
    ).not.toThrow();
  });

  it("keeps fixture identities out of the production catalog bootstrap", () => {
    const catalogBootstrap = readFileSync(resolve(root, "scripts/seed-tr-gold-master.ts"), "utf8");
    expect(catalogBootstrap).not.toMatch(/INSERT\s+INTO\s+(users|providers)/i);
    expect(catalogBootstrap).not.toMatch(/test-(customer|provider|admin)-open-id/i);
  });

  it("exposes fixture and catalog commands distinctly and uses the authoritative package name", () => {
    const packageManifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(packageManifest.name).toBe("move-and-fix");
    expect(packageManifest.scripts["seed:dev"]).toContain("scripts/seed.ts");
    expect(packageManifest.scripts["seed:catalog:tr"]).toContain("scripts/seed-tr-gold-master.ts");
  });
});
