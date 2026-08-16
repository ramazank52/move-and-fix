import { describe, expect, it } from "vitest";
import { quoteTurkeyVat } from "../server/tax/TurkeyVatPolicy";

describe("Türkiye KDV kuralı", () => {
  it("sürümlü kuralın verdiği oranla tam TRY tutarını half-up yuvarlar", () => {
    expect(quoteTurkeyVat({ subtotalAmount: 999, rateBasisPoints: 2_000 })).toEqual({
      subtotalAmount: 999,
      rateBasisPoints: 2_000,
      taxAmount: 200,
      totalAmount: 1_199,
    });
  });

  it("geçersiz veya varsayılanı ima eden tutar/oranı fail-closed reddeder", () => {
    expect(() => quoteTurkeyVat({ subtotalAmount: -1, rateBasisPoints: 2_000 })).toThrow("TAX_SUBTOTAL_INVALID");
    expect(() => quoteTurkeyVat({ subtotalAmount: 100, rateBasisPoints: 10_001 })).toThrow("TAX_RATE_INVALID");
    expect(() => quoteTurkeyVat({ subtotalAmount: Number.MAX_SAFE_INTEGER, rateBasisPoints: 10_000 })).toThrow("TAX_AMOUNT_OVERFLOW");
  });
});
