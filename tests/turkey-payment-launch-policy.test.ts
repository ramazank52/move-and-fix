import { describe, expect, it } from "vitest";

import { evaluateTurkeyPaymentLaunchReadiness } from "../server/compliance/TurkeyPaymentLaunchPolicy";

const now = new Date("2026-08-16T12:00:00.000Z");
const operational = {
  provider: "iyzico" as const,
  countryCode: "TR",
  currency: "TRY",
  status: "operational" as const,
  configVersion: "tr-2026.08",
  healthCheckedAt: new Date("2026-08-15T12:00:00.000Z"),
  regulatoryReviewedAt: new Date("2026-08-15T12:00:00.000Z"),
  nextReviewAt: new Date("2026-09-15T12:00:00.000Z"),
  blockingReason: null,
};

describe("Turkey payment launch readiness", () => {
  it("fails closed when no TR/TRY provider watch record exists", () => {
    expect(evaluateTurkeyPaymentLaunchReadiness({ countryCode: "TR", currency: "TRY", candidates: [], now })).toEqual({
      ready: false,
      eligibleProviders: [],
      blockers: ["TR/TRY için ödeme sağlayıcısı operasyon kaydı yok"],
    });
  });

  it("does not treat a manual operational status as credential readiness", () => {
    const result = evaluateTurkeyPaymentLaunchReadiness({
      countryCode: "TR",
      currency: "TRY",
      candidates: [{ ...operational, configured: false }],
      now,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("iyzico: çalışma zamanı credential yapılandırması eksik");
  });

  it("requires a fresh health and regulatory review even when runtime credentials exist", () => {
    const result = evaluateTurkeyPaymentLaunchReadiness({
      countryCode: "TR",
      currency: "TRY",
      candidates: [{ ...operational, configured: true, nextReviewAt: new Date("2026-08-15T12:00:00.000Z") }],
      now,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers[0]).toContain("düzenleyici incelemesi yenilenmelidir");
  });

  it("accepts an exact TR/TRY scope only after independent operational and runtime checks", () => {
    expect(evaluateTurkeyPaymentLaunchReadiness({
      countryCode: "tr",
      currency: "try",
      candidates: [{ ...operational, configured: true }],
      now,
    })).toEqual({ ready: true, eligibleProviders: ["iyzico"], blockers: [] });
  });
});
