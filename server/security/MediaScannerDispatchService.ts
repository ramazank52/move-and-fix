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
  | { status: "retry_scheduled" | "dead_letter"; jobId: number };

export function resolveConfiguredMediaScannerAdapter(): MediaScannerAdapter | null {
  return createHttpMediaScannerAdapter({
    submissionUrl: ENV.mediaScannerSubmissionUrl,
    apiKey: ENV.mediaScannerSubmissionApiKey,
  });
}

/** Claims and submits at most one durable job. It is intentionally safe for
 * scheduler retries: an unavailable adapter leaves the queue untouched and a
 * rejected submission remains quarantined with bounded retry/dead-letter state. */
export async function dispatchOneMediaScannerJob(
  adapter = resolveConfiguredMediaScannerAdapter(),
): Promise<MediaScannerDispatchResult> {
  if (!adapter) return { status: "not_configured" };
  const job = await claimNextMediaScannerJob();
  if (!job) return { status: "idle" };
  const submission = await adapter.submitScan(job);
  const persisted = await recordMediaScannerDispatchResult({
    jobId: job.jobId,
    accepted: submission.accepted,
    scannerReference: submission.accepted ? submission.scannerReference : undefined,
    reason: submission.accepted ? undefined : submission.reason,
  });
  if (persisted.status === "dispatched") return { status: "dispatched", jobId: job.jobId };
  return {
    status: persisted.status === "failed" ? "dead_letter" : "retry_scheduled",
    jobId: job.jobId,
  };
}
