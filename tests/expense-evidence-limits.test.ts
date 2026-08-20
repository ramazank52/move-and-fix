import { describe, expect, it } from "vitest";
import { EXPENSE_EVIDENCE_LIMITS } from "../shared/expenseEvidenceLimits";
import { assertExpenseEvidenceWithinLimits, type ExpenseEvidenceMetadata } from "../server/security/ExpenseEvidencePolicy";

const image = (mediaId: number, mediaRole: ExpenseEvidenceMetadata["mediaRole"] = "receipt", sizeBytes: number = EXPENSE_EVIDENCE_LIMITS.imageMaxBytes): ExpenseEvidenceMetadata => ({
  mediaId,
  mediaRole,
  kind: "image",
  sizeBytes,
  durationMs: null,
});

const video = (mediaId: number, durationMs: number = EXPENSE_EVIDENCE_LIMITS.maxVideoDurationMs, sizeBytes: number = EXPENSE_EVIDENCE_LIMITS.videoMaxBytes): ExpenseEvidenceMetadata => ({
  mediaId,
  mediaRole: "video",
  kind: "video",
  sizeBytes,
  durationMs,
});

describe("P17 expense evidence limits", () => {
  it("accepts the documented image, video and total boundary", () => {
    const images = Array.from({ length: EXPENSE_EVIDENCE_LIMITS.maxImagesPerExpense }, (_, index) => image(
      index + 1,
      index < 6 ? "receipt" : index < 12 ? "product" : "material",
    ));
    const videos = Array.from({ length: EXPENSE_EVIDENCE_LIMITS.maxVideosPerExpense }, (_, index) => video(100 + index));

    expect(() => assertExpenseEvidenceWithinLimits([...images, ...videos])).not.toThrow();
  });

  it("rejects per-role and total item count overflows at the server boundary", () => {
    const tooManyForRole = Array.from({ length: EXPENSE_EVIDENCE_LIMITS.maxImagesPerRole + 1 }, (_, index) => image(index + 1));
    const tooManyItems = Array.from({ length: EXPENSE_EVIDENCE_LIMITS.maxItemsPerExpense + 1 }, (_, index) => image(index + 1, index % 2 ? "receipt" : "product"));

    expect(() => assertExpenseEvidenceWithinLimits(tooManyForRole)).toThrow("EXPENSE_EVIDENCE_LIMIT_EXCEEDED");
    expect(() => assertExpenseEvidenceWithinLimits(tooManyItems)).toThrow("EXPENSE_EVIDENCE_LIMIT_EXCEEDED");
  });

  it("rejects image and video byte overflows without relaxing existing media limits", () => {
    expect(() => assertExpenseEvidenceWithinLimits([image(1, "receipt", EXPENSE_EVIDENCE_LIMITS.imageMaxBytes + 1)])).toThrow("EXPENSE_EVIDENCE_SIZE_EXCEEDED");
    expect(() => assertExpenseEvidenceWithinLimits([video(2, 1_000, EXPENSE_EVIDENCE_LIMITS.videoMaxBytes + 1)])).toThrow("EXPENSE_EVIDENCE_SIZE_EXCEEDED");
  });

  it("fails closed when video duration is missing or exceeds 60 seconds", () => {
    expect(() => assertExpenseEvidenceWithinLimits([{ ...video(1), durationMs: null }])).toThrow("EXPENSE_EVIDENCE_VIDEO_DURATION_EXCEEDED");
    expect(() => assertExpenseEvidenceWithinLimits([video(2, EXPENSE_EVIDENCE_LIMITS.maxVideoDurationMs + 1)])).toThrow("EXPENSE_EVIDENCE_VIDEO_DURATION_EXCEEDED");
  });
});
