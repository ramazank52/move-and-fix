import { createHmac, timingSafeEqual } from "node:crypto";
import type { MediaScannerMediaClass, MediaScannerOutcome } from "./MediaQuarantinePolicy";

export type MediaScannerCallbackPayload = {
  mediaClass: MediaScannerMediaClass;
  mediaId: string;
  sha256: string;
  outcome: MediaScannerOutcome;
  reason?: string;
};

/** Stable provider-neutral representation signed by the scanner integration. */
export function mediaScannerCallbackCanonicalPayload(input: MediaScannerCallbackPayload) {
  return [input.mediaClass, input.mediaId, input.sha256.toLowerCase(), input.outcome, input.reason?.trim() ?? ""].join("\n");
}

/**
 * No secret means no callback is trusted. Callers must surface NOT_CONFIGURED,
 * never accept an unsigned scan decision or silently release media.
 */
export function verifyMediaScannerCallbackSignature(input: {
  secret: string;
  signature: string | undefined;
  payload: MediaScannerCallbackPayload;
}) {
  if (!input.secret || !input.signature) return false;
  const expected = createHmac("sha256", input.secret)
    .update(mediaScannerCallbackCanonicalPayload(input.payload), "utf8")
    .digest("hex");
  const received = input.signature.trim().replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(received) || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}
