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
    const transition = decideMediaScannerTransition("pending_scan", "clean");
    expect(transition).toMatchObject({ allowed: true, idempotent: false, nextStatus: "clean" });
    expect(decideMediaQuarantineAccess(transition.nextStatus)).toMatchObject({ allowed: true });
    expect(mediaClass).toBeTruthy();
  });

  it.each(mediaClasses)("keeps %s blocked after a malicious scanner result", () => {
    const transition = decideMediaScannerTransition("pending_scan", "blocked");
    expect(transition).toMatchObject({ allowed: true, nextStatus: "blocked" });
    expect(decideMediaQuarantineAccess(transition.nextStatus)).toMatchObject({ allowed: false });
    expect(decideMediaScannerTransition("blocked", "clean")).toMatchObject({ allowed: false });
  });

  it("accepts only a matching HMAC signature and canonical payload", () => {
    const payload = {
      mediaClass: "voice_message" as const,
      mediaId: "42",
      sha256: "a".repeat(64),
      outcome: "clean" as const,
      reason: "signature verified",
    };
    const secret = "scanner-test-secret";
    const signature = createHmac("sha256", secret)
      .update(mediaScannerCallbackCanonicalPayload(payload), "utf8")
      .digest("hex");

    expect(verifyMediaScannerCallbackSignature({ secret, signature, payload })).toBe(true);
    expect(verifyMediaScannerCallbackSignature({ secret, signature: "0".repeat(64), payload })).toBe(false);
    expect(verifyMediaScannerCallbackSignature({ secret: "", signature, payload })).toBe(false);
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
});
