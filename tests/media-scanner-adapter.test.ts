import { describe, expect, it, vi } from "vitest";
import { createHttpMediaScannerAdapter } from "../server/security/MediaScannerAdapter";

describe("media scanner outbound adapter", () => {
  const submission = {
    jobId: 4,
    mediaClass: "service_request_media" as const,
    mediaId: "opaque-media-1",
    sha256: "a".repeat(64),
    storageKey: "private/opaque-media-1",
    dispatchAttemptToken: "attempt-adapter-0001",
  };

  it("is not configured until both scanner endpoint and credential are present", () => {
    expect(createHttpMediaScannerAdapter({ submissionUrl: "", apiKey: "x" })).toBeNull();
    expect(createHttpMediaScannerAdapter({ submissionUrl: "https://scanner.example", apiKey: "" })).toBeNull();
  });

  it("submits opaque metadata without manufacturing a clean result", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ scannerReference: "scan-42" }), { status: 202 }));
    const adapter = createHttpMediaScannerAdapter({ submissionUrl: "https://scanner.example/scan", apiKey: "secret", fetchImpl });
    await expect(adapter?.submitScan(submission)).resolves.toEqual({ accepted: true, scannerReference: "scan-42" });
    expect(fetchImpl).toHaveBeenCalledWith("https://scanner.example/scan", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchImpl.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      dispatchAttemptToken: submission.dispatchAttemptToken,
    });
  });

  it("keeps failed or unavailable submissions retryable and non-terminal", async () => {
    const rejected = createHttpMediaScannerAdapter({
      submissionUrl: "https://scanner.example/scan",
      apiKey: "secret",
      fetchImpl: vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })),
    });
    await expect(rejected?.submitScan(submission)).resolves.toEqual({
      accepted: false,
      retryable: true,
      reason: "MEDIA_SCANNER_SUBMISSION_REJECTED",
    });
    const unavailable = createHttpMediaScannerAdapter({
      submissionUrl: "https://scanner.example/scan",
      apiKey: "secret",
      fetchImpl: vi.fn().mockRejectedValue(new Error("network down")),
    });
    await expect(unavailable?.submitScan(submission)).resolves.toEqual({
      accepted: false,
      retryable: true,
      reason: "MEDIA_SCANNER_SUBMISSION_UNAVAILABLE",
    });
  });
});
