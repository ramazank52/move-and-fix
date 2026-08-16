import { describe, expect, it } from "vitest";

import { buildJobCompletionTimelineEvent } from "../server/jobs/JobCapsuleLifecycle";

describe("Job Capsule completion lifecycle", () => {
  it("creates one stable, append-only completion identity for a completed job", () => {
    expect(buildJobCompletionTimelineEvent({ requestId: 41, actorUserId: 77, source: "provider_completion" })).toEqual({
      requestId: 41,
      eventType: "job_completed",
      actorUserId: 77,
      referenceType: "service_request_completion",
      referenceId: 41,
      metadataJson: { status: "completed", source: "provider_completion" },
    });
  });

  it("rejects invalid request or actor identifiers before a timeline write can occur", () => {
    expect(() => buildJobCompletionTimelineEvent({ requestId: 0, actorUserId: 77, source: "job_status_update" })).toThrow("JOB_CAPSULE_REQUEST_ID_INVALID");
    expect(() => buildJobCompletionTimelineEvent({ requestId: 41, actorUserId: 0, source: "job_status_update" })).toThrow("JOB_CAPSULE_ACTOR_ID_INVALID");
  });
});
