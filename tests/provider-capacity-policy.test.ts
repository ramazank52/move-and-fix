import { describe, expect, it } from "vitest";
import { decideProviderCapacity, normalizeProviderMaxConcurrentActiveJobs } from "../server/matching/ProviderCapacityPolicy";

describe("provider capacity policy", () => {
  it("defaults missing and invalid migration-backed capacity to one active job", () => {
    for (const candidate of [undefined, null, 0, -1, 1.5, "3", 99]) {
      expect(normalizeProviderMaxConcurrentActiveJobs(candidate)).toEqual({ maxConcurrentActiveJobs: 1, usedFallback: true });
    }
  });

  it("allows only strictly fewer active jobs than the validated server limit", () => {
    expect(decideProviderCapacity({ configuredMaxConcurrentActiveJobs: 2, activeJobCount: 1 })).toMatchObject({ available: true, usedFallback: false });
    expect(decideProviderCapacity({ configuredMaxConcurrentActiveJobs: 2, activeJobCount: 2 })).toMatchObject({ available: false, usedFallback: false });
    expect(decideProviderCapacity({ configuredMaxConcurrentActiveJobs: undefined, activeJobCount: 1 })).toMatchObject({ available: false, maxConcurrentActiveJobs: 1 });
  });

  it("fails closed when active job count is malformed", () => {
    expect(decideProviderCapacity({ configuredMaxConcurrentActiveJobs: 3, activeJobCount: -1 })).toMatchObject({ available: false });
  });
});
