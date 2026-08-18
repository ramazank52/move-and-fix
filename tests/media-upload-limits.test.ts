import { describe, expect, it } from "vitest";
import { MEDIA_UPLOAD_LIMIT_BYTES, isWithinDecodedByteLimit } from "../server/security/MediaUploadLimits";

describe("decoded media upload limits", () => {
  it("accepts exactly the configured boundary and rejects one byte above it", () => {
    const maxBytes = MEDIA_UPLOAD_LIMIT_BYTES.requestImage;

    expect(isWithinDecodedByteLimit(maxBytes, maxBytes)).toBe(true);
    expect(isWithinDecodedByteLimit(maxBytes + 1, maxBytes)).toBe(false);
  });

  it("keeps request and MoveAI upload classes at their explicitly fail-closed byte limits", () => {
    expect(MEDIA_UPLOAD_LIMIT_BYTES).toEqual({
      requestImage: 8 * 1024 * 1024,
      requestVideo: 25 * 1024 * 1024,
      moveAiImage: 8 * 1024 * 1024,
      moveAiAudio: 12 * 1024 * 1024,
      voiceMessage: 10 * 1024 * 1024,
      providerDocument: 10 * 1024 * 1024,
      completionProofTotal: 32 * 1024 * 1024,
    });
    expect(isWithinDecodedByteLimit(-1, MEDIA_UPLOAD_LIMIT_BYTES.requestImage)).toBe(false);
    expect(isWithinDecodedByteLimit(Number.NaN, MEDIA_UPLOAD_LIMIT_BYTES.requestImage)).toBe(false);
  });
});
