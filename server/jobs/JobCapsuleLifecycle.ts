export type JobCompletionTimelineEvent = {
  requestId: number;
  eventType: "job_completed";
  actorUserId: number;
  referenceType: "service_request_completion";
  referenceId: number;
  metadataJson: { status: "completed"; source: "job_status_update" | "provider_completion" };
};

/**
 * Produces the single idempotency identity used by the append-only Job Capsule.
 * The caller must write it in the same transaction as the first completion state
 * transition. No customer-controlled text or mutable payment amount is included.
 */
export function buildJobCompletionTimelineEvent(input: {
  requestId: number;
  actorUserId: number;
  source: "job_status_update" | "provider_completion";
}): JobCompletionTimelineEvent {
  if (!Number.isSafeInteger(input.requestId) || input.requestId <= 0) {
    throw new Error("JOB_CAPSULE_REQUEST_ID_INVALID");
  }
  if (!Number.isSafeInteger(input.actorUserId) || input.actorUserId <= 0) {
    throw new Error("JOB_CAPSULE_ACTOR_ID_INVALID");
  }
  return {
    requestId: input.requestId,
    eventType: "job_completed",
    actorUserId: input.actorUserId,
    referenceType: "service_request_completion",
    referenceId: input.requestId,
    metadataJson: { status: "completed", source: input.source },
  };
}
