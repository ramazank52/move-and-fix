import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createHmac } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createApp } from "../server/_core/index";
import {
  decideMediaQuarantineAccess,
  decideMediaScannerTransition,
  type MediaScannerMediaClass,
} from "../server/security/MediaQuarantinePolicy";
import {
  mediaScannerCallbackCanonicalPayload,
  verifyMediaScannerCallbackSignature,
} from "../server/security/MediaScannerCallbackSecurity";

const mediaClasses: MediaScannerMediaClass[] = [
  "provider_document",
  "service_request_media",
  "voice_message",
  "move_ai_draft_media",
];

describe("all media classes quarantine contract", () => {
  it.each(mediaClasses)("keeps %s non-servable until an explicit clean scanner result", (mediaClass) => {
    expect(decideMediaQuarantineAccess("pending_scan")).toMatchObject({ allowed: false });
    const start = decideMediaScannerTransition("pending_scan", "scanning");
    expect(start).toMatchObject({ allowed: true, idempotent: false, nextStatus: "scanning" });
    expect(decideMediaQuarantineAccess(start.nextStatus)).toMatchObject({ allowed: false });
    const transition = decideMediaScannerTransition("scanning", "clean");
    expect(transition).toMatchObject({ allowed: true, idempotent: false, nextStatus: "clean" });
    expect(decideMediaQuarantineAccess(transition.nextStatus)).toMatchObject({ allowed: true });
    expect(mediaClass).toBeTruthy();
  });

  it.each(mediaClasses)("keeps %s blocked after a malicious scanner result", () => {
    const start = decideMediaScannerTransition("pending_scan", "scanning");
    expect(start).toMatchObject({ allowed: true, nextStatus: "scanning" });
    const transition = decideMediaScannerTransition("scanning", "blocked");
    expect(transition).toMatchObject({ allowed: true, nextStatus: "blocked" });
    expect(decideMediaQuarantineAccess(transition.nextStatus)).toMatchObject({ allowed: false });
    expect(decideMediaScannerTransition("blocked", "clean")).toMatchObject({ allowed: false });
  });

  it("accepts only a matching HMAC signature and canonical payload", () => {
    const payload = {
      mediaClass: "voice_message" as const,
      mediaId: "42",
      sha256: "a".repeat(64),
      dispatchAttemptToken: "attempt-all-media-0001",
      outcome: "clean" as const,
      reason: "signature verified",
    };
    const secret = "scanner-test-secret";
    const context = { timestamp: Date.parse("2026-08-20T10:00:00.000Z"), nonce: "media-class-nonce-0001" };
    const signature = createHmac("sha256", secret)
      .update(mediaScannerCallbackCanonicalPayload(payload, context), "utf8")
      .digest("hex");

    expect(verifyMediaScannerCallbackSignature({ secret, signature, payload, context })).toBe(true);
    expect(verifyMediaScannerCallbackSignature({ secret, signature: "0".repeat(64), payload, context })).toBe(false);
    expect(verifyMediaScannerCallbackSignature({ secret: "", signature, payload, context })).toBe(false);
  });
});

describe("media scanner HTTP callback fail-closed contract", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer(await createApp());
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("rejects scanner callbacks while no dedicated scanner secret is configured", async () => {
    const response = await fetch(`${baseUrl}/api/webhooks/media-scanner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mediaClass: "move_ai_draft_media",
        mediaId: "opaque-id",
        sha256: "a".repeat(64),
        outcome: "clean",
      }),
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "MEDIA_SCANNER_NOT_CONFIGURED" });
  });

  it("does not expose scanner dispatch or watchdog while the separate scanner cron secret is not configured", async () => {
    const response = await fetch(`${baseUrl}/api/scheduled/media-scanner-dispatch`, {
      method: "POST",
      headers: { Authorization: "Bearer fabricated-value" },
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "MEDIA_SCANNER_CRON_NOT_CONFIGURED" });

    const watchdog = await fetch(`${baseUrl}/api/scheduled/media-scanner-watchdog`, {
      method: "POST",
      headers: { Authorization: "Bearer fabricated-value" },
    });
    expect(watchdog.status).toBe(503);
    await expect(watchdog.json()).resolves.toEqual({ error: "MEDIA_SCANNER_CRON_NOT_CONFIGURED" });
  });
});
