import { describe, expect, it } from "vitest";
import {
  buildMediaScannerJob,
  decideMediaScannerJobCompletion,
} from "../server/security/MediaScannerJobQueue";
import {
  decideMediaScannerDispatchFailure,
  MEDIA_SCANNER_MAX_DISPATCH_ATTEMPTS,
} from "../server/security/MediaScannerDispatchPolicy";
import type { MediaScannerMediaClass } from "../server/security/MediaQuarantinePolicy";

const mediaClasses: MediaScannerMediaClass[] = [
  "provider_document",
  "service_request_media",
  "voice_message",
  "move_ai_draft_media",
];

describe("durable media scanner job contract", () => {
  it.each(mediaClasses)("creates a queued, digest-bound job for %s", (mediaClass) => {
    const now = new Date("2026-08-18T10:00:00.000Z");
    const job = buildMediaScannerJob({
      mediaClass,
      mediaId: `${mediaClass}-ref`,
      sha256: "A".repeat(64),
      storageKey: `quarantine/${mediaClass}/object`,
      now,
    });

    expect(job).toEqual({
      mediaClass,
      mediaId: `${mediaClass}-ref`,
      sha256: "a".repeat(64),
      storageKey: `quarantine/${mediaClass}/object`,
      status: "queued",
      deliveryAttempts: 0,
      lastDispatchAt: null,
      nextAttemptAt: now,
      scannerReference: null,
      outcome: null,
      outcomeReason: null,
      completedAt: null,
    });
  });

  it("rejects incomplete or malformed job records before persistence", () => {
    expect(() => buildMediaScannerJob({
      mediaClass: "voice_message",
      mediaId: "",
      sha256: "a".repeat(64),
      storageKey: "voice/1",
    })).toThrow("MEDIA_SCANNER_JOB_MEDIA_ID_INVALID");
    expect(() => buildMediaScannerJob({
      mediaClass: "voice_message",
      mediaId: "1",
      sha256: "invalid",
      storageKey: "voice/1",
    })).toThrow("MEDIA_SCANNER_JOB_DIGEST_INVALID");
  });

  it("completes only durably queued jobs and makes exact scanner callback replays idempotent", () => {
    expect(decideMediaScannerJobCompletion("queued", "clean")).toMatchObject({
      allowed: true,
      idempotent: false,
      nextStatus: "completed",
    });
    expect(decideMediaScannerJobCompletion("completed", "clean")).toMatchObject({
      allowed: true,
      idempotent: true,
      nextStatus: "completed",
    });
    expect(decideMediaScannerJobCompletion("completed", "blocked")).toMatchObject({ allowed: false });
    expect(decideMediaScannerJobCompletion("failed", "clean")).toMatchObject({ allowed: false });
  });

  it("uses bounded exponential retry and dead-letters a repeatedly unavailable scanner without releasing media", () => {
    const now = new Date("2026-08-18T00:00:00.000Z");
    expect(decideMediaScannerDispatchFailure(1, now)).toMatchObject({
      nextStatus: "retry_scheduled",
      reason: "MEDIA_SCANNER_RETRY_SCHEDULED",
      nextAttemptAt: new Date("2026-08-18T00:00:05.000Z"),
    });
    expect(decideMediaScannerDispatchFailure(MEDIA_SCANNER_MAX_DISPATCH_ATTEMPTS, now)).toEqual({
      nextStatus: "failed",
      nextAttemptAt: null,
      reason: "MEDIA_SCANNER_DEAD_LETTER",
    });
    expect(() => decideMediaScannerDispatchFailure(0, now)).toThrow("MEDIA_SCANNER_DISPATCH_ATTEMPTS_INVALID");
  });
});
