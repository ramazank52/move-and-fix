import { describe, expect, it } from "vitest";

import { evaluateSpdxExpression, normalizeDeclaredLicense } from "../scripts/license-policy.mjs";

describe("P17 SPDX-aware license policy", () => {
  it("MIT AND Apache-2.0 compound ifadesini her iki leaf izinli olduğunda kabul eder", () => {
    expect(evaluateSpdxExpression("MIT AND Apache-2.0")).toMatchObject({
      allowed: true,
      reason: "ALL_AND_OPERANDS_ALLOWED",
      selected: [
        { license: "MIT", exception: null },
        { license: "Apache-2.0", exception: null },
      ],
    });
  });

  it("OR ifadesinde yalnız izinli alternatifi attribution için seçer", () => {
    expect(evaluateSpdxExpression("GPL-3.0-only OR MIT")).toMatchObject({
      allowed: true,
      reason: "OR_RIGHT_OPERAND_ALLOWED",
      selected: [{ license: "MIT", exception: null }],
    });
  });

  it("onaylanmamış SPDX exception ve bilinmeyen license identifier için fail-closed davranır", () => {
    expect(evaluateSpdxExpression("GPL-2.0-only WITH Classpath-exception-2.0")).toMatchObject({
      allowed: false,
      reason: "DISALLOWED_LICENSE:GPL-2.0-only",
    });
    expect(evaluateSpdxExpression("MIT WITH Classpath-exception-2.0")).toMatchObject({
      allowed: false,
      reason: "UNAPPROVED_EXCEPTION:Classpath-exception-2.0",
    });
  });

  it("malformed, missing veya object-typed license bildirimini deterministik değerlendirir", () => {
    expect(evaluateSpdxExpression("MIT AND")).toMatchObject({ allowed: false, reason: "MALFORMED_SPDX_EXPRESSION" });
    expect(evaluateSpdxExpression("UNKNOWN")).toMatchObject({ allowed: false, reason: "UNKNOWN_LICENSE" });
    expect(normalizeDeclaredLicense({ type: " Apache-2.0 " })).toBe("Apache-2.0");
    expect(normalizeDeclaredLicense({})).toBe("UNKNOWN");
  });
});
