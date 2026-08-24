import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { THEME_FIXTURES } from "./theme-preview/fixture-manifest";

const root = process.cwd();

describe("development-only theme preview isolation", () => {
  it("keeps the gallery outside the production Expo Router app tree", () => {
    expect(existsSync(resolve(root, "app/theme-preview.tsx"))).toBe(false);
    expect(existsSync(resolve(root, "app/theme-preview"))).toBe(false);
    const packageJson = readFileSync(resolve(root, "package.json"), "utf8");
    expect(packageJson).toContain("node scripts/serve-theme-preview.mjs");
    expect(readFileSync(resolve(root, "app.config.ts"), "utf8")).not.toContain("THEME_PREVIEW_ROUTER_ROOT");
  });

  it("declares all 14 fixture screens with a waiting physical-evidence state", () => {
    expect(THEME_FIXTURES).toHaveLength(14);
    expect(new Set(THEME_FIXTURES.map((fixture) => fixture.id)).size).toBe(14);
    expect(THEME_FIXTURES.every((fixture) => fixture.evidenceStatus === "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS")).toBe(true);
  });

  it("does not import application routes, auth, database, network, or external service clients", () => {
    const gallerySources = [
      "scripts/serve-theme-preview.mjs",
      "scripts/theme-preview-fixtures.mjs",
      "tests/theme-preview/fixture-manifest.ts",
    ].map((relativePath) => readFileSync(resolve(root, relativePath), "utf8")).join("\n");

    for (const forbiddenPattern of [
      "@/app/",
      "@/",
      "@/lib/trpc",
      "@/hooks/use-auth",
      "@/server/",
      "fetch(",
      "axios",
      "stripe",
      "iyzico",
      "notifications",
    ]) {
      expect(gallerySources).not.toContain(forbiddenPattern);
    }
  });

  it("creates a direct gallery/detail contract for 14 blocked fixture details without a hand-drawn substitute", () => {
    const fixtures = readFileSync(resolve(root, "scripts/theme-preview-fixtures.mjs"), "utf8");
    expect(fixtures).toContain("prefers-color-scheme: dark");
    expect((fixtures.match(/^  \["\d{2}",/gm) ?? [])).toHaveLength(14);
    expect(fixtures).toContain('isolationStatus: "BLOCKED_COMPONENT_NOT_ISOLATABLE"');
    expect(fixtures).toContain("COMPONENT_FIXTURE — ROUTE E2E DEĞİLDİR");
    expect(fixtures).toContain('href="/fixture/${fixture.id}"');
  });
});
