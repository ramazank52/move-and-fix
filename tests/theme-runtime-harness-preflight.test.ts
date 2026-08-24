import { describe, expect, it } from "vitest";

import { assertThemeHarnessPreflight, classifyThemeHarnessRoute } from "../scripts/theme-runtime-harness-lib";

const safeEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "development",
  HARNESS_ENVIRONMENT: "staging",
  HARNESS_ALLOW_STAGING: "1",
  DATABASE_URL: "mysql://staging-user@staging-db.example/theme_harness",
  PREVIEW_URL: "https://8081-example.manus.computer",
  EXPO_PUBLIC_API_BASE_URL: "https://3000-example.manus.computer",
};

describe("theme runtime harness fail-closed preflight", () => {
  it("accepts only explicitly acknowledged non-production hosts", () => {
    const result = assertThemeHarnessPreflight(safeEnvironment, "theme-12345678");
    expect(result.approved).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("blocks production node environments and production hostnames before any fixture write", () => {
    const result = assertThemeHarnessPreflight({
      ...safeEnvironment,
      NODE_ENV: "production",
      PREVIEW_URL: "https://moveandfix.app",
    }, "theme-12345678");
    expect(result.approved).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "NODE_ENV_PRODUCTION",
      "PREVIEW_URL is not an approved non-production hostname",
    ]));
  });

  it("blocks missing explicit staging acknowledgement and preserves role categorisation", () => {
    const result = assertThemeHarnessPreflight({ ...safeEnvironment, HARNESS_ALLOW_STAGING: "0" }, "theme-12345678");
    expect(result.approved).toBe(false);
    expect(result.blockers).toContain("HARNESS_ALLOW_STAGING_NOT_ACKNOWLEDGED");
    expect(classifyThemeHarnessRoute("admin/country-control.tsx")).toBe("owner_admin");
    expect(classifyThemeHarnessRoute("provider-dashboard.tsx")).toBe("provider");
    expect(classifyThemeHarnessRoute("login.tsx")).toBe("public");
  });
});
