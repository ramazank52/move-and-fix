import { describe, expect, it } from "vitest";

import { resolveSettlementPolicy } from "../server/db";

const NOW = new Date("2026-08-15T07:00:00.000Z");

function policy(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    scopeKey: "TR:standard:any:global:v1",
    countryCode: "TR",
    categoryId: null,
    gatewayProvider: "any",
    contractType: "standard",
    precedence: 0,
    version: "tr-global-v1",
    commissionRateBps: 1_000,
    completionReviewHours: 48,
    cancellationPolicyJson: JSON.stringify({
      version: "tr-global-v1",
      requiresHumanReviewForPartialSettlement: true,
      requiresGatewayRefundConfirmation: true,
    }),
    status: "active",
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    createdByUserId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as any;
}

describe("settlement policy contract", () => {
  it("prefers a category-scoped active policy over the active national fallback", () => {
    const selected = resolveSettlementPolicy(
      [policy(), policy({ id: 2, scopeKey: "TR:standard:category-9:v2", categoryId: 9, version: "tr-cat-9-v2" })],
      { countryCode: "TR", categoryId: 9, now: NOW },
    );

    expect(selected.id).toBe(2);
    expect(selected.version).toBe("tr-cat-9-v2");
  });

  it("selects a gateway-scoped policy only after a gateway is explicitly chosen", () => {
    const policies = [
      policy(),
      policy({ id: 2, scopeKey: "TR:standard:stripe:global:v2", gatewayProvider: "stripe", version: "tr-stripe-v2" }),
    ];

    expect(resolveSettlementPolicy(policies, { countryCode: "TR", categoryId: 4, now: NOW }).id).toBe(1);
    expect(
      resolveSettlementPolicy(policies, { countryCode: "TR", categoryId: 4, gatewayProvider: "stripe", now: NOW }).id,
    ).toBe(2);
  });

  it("rejects inactive, expired, future and foreign-country policies instead of falling back unsafely", () => {
    const unusable = [
      policy({ status: "retired" }),
      policy({ id: 2, scopeKey: "TR:expired", effectiveTo: new Date("2026-08-01T00:00:00.000Z") }),
      policy({ id: 3, scopeKey: "TR:future", effectiveFrom: new Date("2026-09-01T00:00:00.000Z") }),
      policy({ id: 4, scopeKey: "DE:global", countryCode: "DE" }),
    ];

    expect(() => resolveSettlementPolicy(unusable, { countryCode: "TR", categoryId: 4, now: NOW })).toThrow(
      "SETTLEMENT_POLICY_NOT_FOUND",
    );
  });

  it("fails closed when a policy has an invalid review window or cancellation snapshot", () => {
    expect(() => resolveSettlementPolicy([policy({ completionReviewHours: 0 })], { countryCode: "TR", categoryId: 4, now: NOW })).toThrow(
      "AGREEMENT_COMPLETION_REVIEW_WINDOW_INVALID",
    );
    expect(() =>
      resolveSettlementPolicy(
        [policy({ cancellationPolicyJson: "[]" })],
        { countryCode: "TR", categoryId: 4, now: NOW },
      ),
    ).toThrow("SETTLEMENT_POLICY_CANCELLATION_POLICY_INVALID");
  });
});
