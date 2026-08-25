import { describe, expect, it } from "vitest";
import {
  containsDirectContactData,
  getMaskedCommunicationReadiness,
  sanitizeMaskedMessageContent,
} from "../server/communications/MaskedCommunicationService";

describe("masked communication content boundary", () => {
  it("redacts Turkish phone numbers and email addresses before persistence", () => {
    expect(
      sanitizeMaskedMessageContent("Bana 0532 123 45 67 veya ali@example.com üzerinden ulaşın."),
    ).toBe("Bana [telefon gizlendi] veya [e-posta gizlendi] üzerinden ulaşın.");
  });

  it("does not claim a proxy provider is ready without both provider settings", () => {
    expect(getMaskedCommunicationReadiness()).toEqual({ configured: false, code: "NOT_CONFIGURED" });
  });

  it("detects direct contact details after Unicode and spacing normalization", () => {
    expect(containsDirectContactData("ulaşım: ali@example.com")).toBe(true);
    expect(containsDirectContactData("0 5 3 2 1 2 3 4 5 6 7")).toBe(true);
    expect(containsDirectContactData("www.example.test/profile")).toBe(true);
    expect(containsDirectContactData("Yalnız hizmet detayını paylaşın")).toBe(false);
  });
});
