import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";

describe("US-CA-LOS_ANGELES v2 authorization boundary", () => {
  it("does not expose an app-router mutation for country coverage, requirement, source, connector or issuer state", () => {
    const countryEvidenceProcedures = Object.keys(appRouter._def.procedures)
      .filter((path) => /countryCoverage|countryServiceCoverage|countryRequirement|countrySource|credentialIssuer|coveragePolicy/i.test(path));

    expect(countryEvidenceProcedures).toEqual([]);
  });
});
