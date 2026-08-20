import { createHmac, timingSafeEqual } from "node:crypto";
import type { MediaScannerMediaClass, MediaScannerOutcome } from "./MediaQuarantinePolicy";

export const MEDIA_SCANNER_CALLBACK_MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;

export type MediaScannerCallbackPayload = {
  mediaClass: MediaScannerMediaClass;
  mediaId: string;
  sha256: string;
  /** Opaque token generated when this exact scanner dispatch was claimed. */
  dispatchAttemptToken: string;
  outcome: MediaScannerOutcome;
  reason?: string;
};

export type MediaScannerCallbackSecurityContext = {
  timestamp: number;
  nonce: string;
};

/** Stable provider-neutral representation signed by the scanner integration. */
export function mediaScannerCallbackCanonicalPayload(
  input: MediaScannerCallbackPayload,
  context?: MediaScannerCallbackSecurityContext,
) {
  const body = [
    input.mediaClass,
    input.mediaId,
    input.sha256.toLowerCase(),
    input.dispatchAttemptToken,
    input.outcome,
    input.reason?.trim() ?? "",
  ];
  return context ? [String(context.timestamp), context.nonce, ...body].join("\n") : body.join("\n");
}

export function parseFreshMediaScannerCallbackContext(input: {
  timestamp: string | undefined;
  nonce: string | undefined;
  nowMs?: number;
  maxClockSkewMs?: number;
}): { valid: true; context: MediaScannerCallbackSecurityContext } | { valid: false; reason: string } {
  const rawTimestamp = input.timestamp?.trim() ?? "";
  const rawNonce = input.nonce?.trim() ?? "";
  if (!/^\d{10,13}$/.test(rawTimestamp)) return { valid: false, reason: "MEDIA_SCANNER_CALLBACK_TIMESTAMP_INVALID" };
  const parsed = Number(rawTimestamp);
  const timestamp = rawTimestamp.length === 10 ? parsed * 1_000 : parsed;
  const now = input.nowMs ?? Date.now();
  const maxClockSkewMs = input.maxClockSkewMs ?? MEDIA_SCANNER_CALLBACK_MAX_CLOCK_SKEW_MS;
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > maxClockSkewMs) {
    return { valid: false, reason: "MEDIA_SCANNER_CALLBACK_TIMESTAMP_EXPIRED" };
  }
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(rawNonce)) return { valid: false, reason: "MEDIA_SCANNER_CALLBACK_NONCE_INVALID" };
  return { valid: true, context: { timestamp, nonce: rawNonce } };
}

/**
 * No secret means no callback is trusted. Callers must surface NOT_CONFIGURED,
 * never accept an unsigned scan decision or silently release media.
 */
export function verifyMediaScannerCallbackSignature(input: {
  secret: string;
  previousSecret?: string;
  signature: string | undefined;
  payload: MediaScannerCallbackPayload;
  context?: MediaScannerCallbackSecurityContext;
}) {
  if (!input.secret || !input.signature || !input.context) return false;
  const received = input.signature.trim().replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const canonicalPayload = mediaScannerCallbackCanonicalPayload(input.payload, input.context);
  return [input.secret, input.previousSecret ?? ""]
    .filter(Boolean)
    .some((secret) => {
      const expected = createHmac("sha256", secret).update(canonicalPayload, "utf8").digest("hex");
      return received.length === expected.length && timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
    });
}
