/**
 * Decoded (binary) payload limits. Base64 character length must never be used
 * as a substitute for these limits because its expansion ratio varies.
 */
export const MEDIA_UPLOAD_LIMIT_BYTES = {
  requestImage: 8 * 1024 * 1024,
  requestVideo: 25 * 1024 * 1024,
  moveAiImage: 8 * 1024 * 1024,
  moveAiAudio: 12 * 1024 * 1024,
  voiceMessage: 10 * 1024 * 1024,
  providerDocument: 10 * 1024 * 1024,
  completionProofTotal: 32 * 1024 * 1024,
} as const;

/** Returns true only when the decoded binary payload is at or below its policy limit. */
export function isWithinDecodedByteLimit(byteLength: number, maxBytes: number): boolean {
  return Number.isSafeInteger(byteLength) && byteLength >= 0 && byteLength <= maxBytes;
}
