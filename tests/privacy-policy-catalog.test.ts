import { describe, expect, it } from "vitest";
import { PRIVACY_POLICY_TRANSLATIONS } from "../lib/data/legal";

describe("gizlilik politikası katalog sözleşmesi", () => {
  it("TR ve EN için aynı sürüme bağlı, erişilebilir politika metni sağlar", () => {
    const tr = PRIVACY_POLICY_TRANSLATIONS.tr;
    const en = PRIVACY_POLICY_TRANSLATIONS.en;

    expect(tr.id).toBe("privacy");
    expect(en.id).toBe("privacy");
    expect(tr.version).toBe(en.version);
    expect(tr.lastUpdated).toBe(en.lastUpdated);
    expect(tr.content).toContain("VERİ TOPLAMA");
    expect(en.content).toContain("DATA COLLECTION");
  });

  it("yalnız hukukça onaylanan sürümü authoritative olarak işaretler", () => {
    expect(PRIVACY_POLICY_TRANSLATIONS.tr.reviewStatus).toBe("approved");
    expect(PRIVACY_POLICY_TRANSLATIONS.tr.authoritative).toBe(true);
    expect(PRIVACY_POLICY_TRANSLATIONS.en.reviewStatus).toBe("pending_legal_review");
    expect(PRIVACY_POLICY_TRANSLATIONS.en.authoritative).toBe(false);
  });
});
