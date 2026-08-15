import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({
  resolveFeatureFlag: vi.fn(),
}));

import * as db from "../server/db";
import { appRouter } from "../server/routers";

function createContext(authenticated = true) {
  return {
    user: authenticated
      ? {
          id: 53,
          openId: "feature-flag-user-53",
          email: "customer53@movefix.test",
          name: "Feature Flag Customer",
          role: "user",
        }
      : null,
    req: { protocol: "https", hostname: "localhost", headers: {} },
    res: {},
  } as never;
}

describe("feature flag client router contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated session before resolving a flag", async () => {
    const caller = appRouter.createCaller(createContext(false));

    await expect(caller.featureFlags.resolve({ key: "moveai.experimental-routing" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.resolveFeatureFlag).not.toHaveBeenCalled();
  });

  it("derives the canary identity from the authenticated user and normalizes country context", async () => {
    vi.mocked(db.resolveFeatureFlag).mockResolvedValue(true);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.featureFlags.resolve({ key: "moveai.experimental-routing", countryCode: "tr" })).resolves.toEqual({
      key: "moveai.experimental-routing",
      enabled: true,
    });
    expect(db.resolveFeatureFlag).toHaveBeenCalledWith("moveai.experimental-routing", {
      userId: 53,
      countryCode: "TR",
    });
  });
});
