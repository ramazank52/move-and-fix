import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  mediaScannerCallbackCanonicalPayload,
  verifyMediaScannerCallbackSignature,
} from "../server/security/MediaScannerCallbackSecurity";

describe("P15 media scanner callback secret rotation", () => {
  const payload = {
    mediaClass: "provider_document" as const,
    mediaId: "media-rotation-1",
    sha256: "a".repeat(64),
    outcome: "clean" as const,
  };
  const context = { timestamp: 1_760_000_000_000, nonce: "rotation-nonce-0001" };

  it("accepts a valid previous secret only when the explicit rotation slot is supplied", () => {
    const signature = createHmac("sha256", "previous-scanner-secret")
      .update(mediaScannerCallbackCanonicalPayload(payload, context), "utf8")
      .digest("hex");

    expect(verifyMediaScannerCallbackSignature({
      secret: "active-scanner-secret",
      previousSecret: "previous-scanner-secret",
      signature,
      payload,
      context,
    })).toBe(true);
    expect(verifyMediaScannerCallbackSignature({
      secret: "active-scanner-secret",
      signature,
      payload,
      context,
    })).toBe(false);
  });

  it("does not accept arbitrary signatures during rotation", () => {
    expect(verifyMediaScannerCallbackSignature({
      secret: "active-scanner-secret",
      previousSecret: "previous-scanner-secret",
      signature: "0".repeat(64),
      payload,
      context,
    })).toBe(false);
  });
});
