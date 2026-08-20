import { describe, expect, it } from "vitest";

import { decideMediaScannerAttemptCorrelation } from "../server/security/MediaScannerAttemptCorrelationPolicy";
import { decideMediaScannerDispatchFailure } from "../server/security/MediaScannerDispatchPolicy";

describe("P17-14 scanner attempt correlation behavior", () => {
  it("rejects a late callback from a timed-out attempt after retry creates a new dispatch attempt", () => {
    const timeout = decideMediaScannerDispatchFailure(1, 3, new Date("2026-08-20T10:00:00.000Z"));
    expect(timeout).toMatchObject({ nextStatus: "retry_scheduled", retryCount: 0 });

    const oldAttempt = "attempt-before-timeout-0001";
    const currentAttempt = "attempt-after-retry-0002";
    expect(decideMediaScannerAttemptCorrelation({
      persistedAttemptToken: currentAttempt,
      callbackAttemptToken: oldAttempt,
    })).toEqual({ allowed: false, reason: "MEDIA_SCAN_STALE_DISPATCH_ATTEMPT" });
    expect(decideMediaScannerAttemptCorrelation({
      persistedAttemptToken: currentAttempt,
      callbackAttemptToken: currentAttempt,
    })).toEqual({ allowed: true });
  });

  it("fails closed when the queue lacks an active attempt token", () => {
    expect(decideMediaScannerAttemptCorrelation({
      persistedAttemptToken: null,
      callbackAttemptToken: "attempt-callback-0001",
    })).toEqual({ allowed: false, reason: "MEDIA_SCAN_STALE_DISPATCH_ATTEMPT" });
  });
});
