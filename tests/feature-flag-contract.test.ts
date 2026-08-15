import { describe, expect, it } from "vitest";

import { evaluateFeatureFlag, featureFlagBucket } from "../server/db";

const canaryFlag = {
  flagKey: "moveai.experimental-routing",
  enabled: 1,
  killSwitch: 0,
  rolloutPercent: 35,
  audienceSeed: "phase-6-canary",
};

describe("feature flag operational contract", () => {
  it("fails closed when no active flag record is available", () => {
    expect(evaluateFeatureFlag(null, { userId: 19, countryCode: "TR" })).toBe(false);
    expect(evaluateFeatureFlag(undefined, { userId: 19, countryCode: "TR" })).toBe(false);
  });

  it("assigns the same authenticated user to the same canary bucket deterministically", () => {
    const context = { userId: 42, countryCode: "TR" };
    const first = evaluateFeatureFlag(canaryFlag, context);
    const second = evaluateFeatureFlag(canaryFlag, context);
    const expected = featureFlagBucket("phase-6-canary:moveai.experimental-routing:42:TR") < 35;

    expect(first).toBe(second);
    expect(first).toBe(expected);
    expect(evaluateFeatureFlag(canaryFlag, { userId: 42, countryCode: "TR" })).toBe(expected);
  });

  it("does not expose a partial rollout to an anonymous caller", () => {
    expect(evaluateFeatureFlag(canaryFlag, {})).toBe(false);
    expect(evaluateFeatureFlag(canaryFlag, { countryCode: "TR" })).toBe(false);
  });

  it("applies the kill-switch immediately even when the flag is otherwise fully enabled", () => {
    expect(evaluateFeatureFlag({ ...canaryFlag, rolloutPercent: 100 }, { userId: 42 })).toBe(true);
    expect(evaluateFeatureFlag({ ...canaryFlag, rolloutPercent: 100, killSwitch: 1 }, { userId: 42 })).toBe(false);
    expect(evaluateFeatureFlag({ ...canaryFlag, enabled: 0, rolloutPercent: 100 }, { userId: 42 })).toBe(false);
  });
});
