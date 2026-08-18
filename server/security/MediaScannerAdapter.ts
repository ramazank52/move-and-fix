import type { MediaScannerMediaClass } from "./MediaQuarantinePolicy";

export type MediaScannerSubmission = {
  jobId: number;
  mediaClass: MediaScannerMediaClass;
  mediaId: string;
  sha256: string;
  storageKey: string;
};

export type MediaScannerSubmissionResult =
  | { accepted: true; scannerReference?: string }
  | { accepted: false; retryable: boolean; reason: string };

export interface MediaScannerAdapter {
  submitScan(submission: MediaScannerSubmission): Promise<MediaScannerSubmissionResult>;
  healthCheck?(): Promise<{ healthy: boolean; reason: string }>;
}

type HttpMediaScannerAdapterConfig = {
  submissionUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
};

/**
 * Server-to-server adapter for a configured malware scanner. It only submits
 * a class-scoped opaque media reference and digest; it never marks media clean
 * and the signed callback remains the exclusive terminal decision channel.
 */
export function createHttpMediaScannerAdapter(
  config: HttpMediaScannerAdapterConfig,
): MediaScannerAdapter | null {
  const submissionUrl = config.submissionUrl.trim();
  const apiKey = config.apiKey.trim();
  if (!submissionUrl || !apiKey) return null;
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async submitScan(submission) {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 12_000);
      try {
        const response = await fetchImpl(submissionUrl, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            jobId: submission.jobId,
            mediaClass: submission.mediaClass,
            mediaId: submission.mediaId,
            sha256: submission.sha256,
            storageKey: submission.storageKey,
          }),
          signal: abortController.signal,
        });
        if (!response.ok) {
          return {
            accepted: false,
            retryable: response.status === 408 || response.status === 429 || response.status >= 500,
            reason: "MEDIA_SCANNER_SUBMISSION_REJECTED",
          };
        }
        const payload = await response.json().catch(() => ({})) as { scannerReference?: unknown };
        const scannerReference = typeof payload.scannerReference === "string"
          ? payload.scannerReference.trim().slice(0, 191)
          : undefined;
        return { accepted: true, scannerReference: scannerReference || undefined };
      } catch {
        return { accepted: false, retryable: true, reason: "MEDIA_SCANNER_SUBMISSION_UNAVAILABLE" };
      } finally {
        clearTimeout(timeout);
      }
    },
    async healthCheck() {
      return { healthy: true, reason: "MEDIA_SCANNER_ADAPTER_CONFIGURED" };
    },
  };
}
