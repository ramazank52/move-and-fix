import { ENV } from "../_core/env";
import {
  claimNextMediaScannerJob,
  recordMediaScannerDispatchResult,
} from "../db";
import { createHttpMediaScannerAdapter, type MediaScannerAdapter } from "./MediaScannerAdapter";

export type MediaScannerDispatchResult =
  | { status: "not_configured" }
  | { status: "idle" }
  | { status: "dispatched"; jobId: number }
  | { status: "retry_scheduled" | "scan_failed"; jobId: number };

export function resolveConfiguredMediaScannerAdapter(): MediaScannerAdapter | null {
  return createHttpMediaScannerAdapter({
    submissionUrl: ENV.mediaScannerSubmissionUrl,
    apiKey: ENV.mediaScannerSubmissionApiKey,
  });
}

/** Claims and submits at most one durable job. It is intentionally safe for
 * scheduler retries: an unavailable adapter leaves the queue untouched and a
 * rejected submission remains quarantined with bounded retry and an explicit
 * operational-review-required terminal state. */
export async function dispatchOneMediaScannerJob(
  adapter = resolveConfiguredMediaScannerAdapter(),
): Promise<MediaScannerDispatchResult> {
  if (!adapter) return { status: "not_configured" };
  const job = await claimNextMediaScannerJob();
  if (!job) return { status: "idle" };
  const submission = await adapter.submitScan(job);
  const persisted = submission.accepted
    ? await recordMediaScannerDispatchResult({
      jobId: job.jobId,
      accepted: true,
      scannerReference: submission.scannerReference,
    })
    : await recordMediaScannerDispatchResult({
      jobId: job.jobId,
      accepted: false,
      reason: submission.reason,
    });
  if (persisted.status === "dispatched") return { status: "dispatched", jobId: job.jobId };
  return {
    status: persisted.status === "scan_failed" ? "scan_failed" : "retry_scheduled",
    jobId: job.jobId,
  };
}
