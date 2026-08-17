import { describe, expect, it } from "vitest";

import { matchCapabilityScopeConstraints, parseCapabilityScopeConstraints } from "../server/compliance/CapabilityScopeConstraintMatcher";

describe("P11 capability scope constraint matcher", () => {
  it("rejects empty, malformed and open-ended limited scope values", () => {
    expect(parseCapabilityScopeConstraints(null)).toBeNull();
    expect(parseCapabilityScopeConstraints({})).toBeNull();
    expect(parseCapabilityScopeConstraints({ jurisdictionCodes: [] })).toBeNull();
    expect(parseCapabilityScopeConstraints({ unexpected: ["TR"] })).toBeNull();
    expect(matchCapabilityScopeConstraints(undefined, { jurisdictionCode: "TR" }))
      .toEqual({ matched: false, code: "SCOPE_CONSTRAINTS_MISSING" });
  });

  it("matches only exact, unexpired constraints", () => {
    const scope = { jurisdictionCodes: ["tr"], categoryIds: [7], serviceKeys: ["towing"], validUntil: "2030-01-01T00:00:00.000Z" };
    expect(matchCapabilityScopeConstraints(scope, { jurisdictionCode: "TR", categoryId: 7, serviceKey: "towing", now: new Date("2029-01-01") }))
      .toEqual({ matched: true });
    expect(matchCapabilityScopeConstraints(scope, { jurisdictionCode: "TR", categoryId: 8, serviceKey: "towing", now: new Date("2029-01-01") }))
      .toEqual({ matched: false, code: "SCOPE_CONSTRAINTS_NOT_MATCHED" });
    expect(matchCapabilityScopeConstraints(scope, { jurisdictionCode: "TR", categoryId: 7, serviceKey: "towing", now: new Date("2031-01-01") }))
      .toEqual({ matched: false, code: "SCOPE_CONSTRAINTS_EXPIRED" });
  });
});
