import { MEDIA_UPLOAD_LIMIT_BYTES } from "../../shared/mediaUploadLimits";

export { MEDIA_UPLOAD_LIMIT_BYTES } from "../../shared/mediaUploadLimits";

/** Returns true only when the decoded binary payload is at or below its policy limit. */
export function isWithinDecodedByteLimit(byteLength: number, maxBytes: number): boolean {
  return Number.isSafeInteger(byteLength) && byteLength >= 0 && byteLength <= maxBytes;
}
