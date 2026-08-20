/**
 * Prevents a callback produced for a timed-out/retried scanner dispatch from
 * changing the newer attempt's media or queue state.
 */
export function decideMediaScannerAttemptCorrelation(input: {
  persistedAttemptToken: string | null;
  callbackAttemptToken: string;
}) {
  if (!input.persistedAttemptToken || !input.callbackAttemptToken) {
    return { allowed: false, reason: "MEDIA_SCAN_STALE_DISPATCH_ATTEMPT" as const };
  }
  if (input.persistedAttemptToken !== input.callbackAttemptToken) {
    return { allowed: false, reason: "MEDIA_SCAN_STALE_DISPATCH_ATTEMPT" as const };
  }
  return { allowed: true as const };
}
