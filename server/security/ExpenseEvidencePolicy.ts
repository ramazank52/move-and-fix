import { EXPENSE_EVIDENCE_LIMITS, type ExpenseEvidenceRole, isExpenseEvidenceWithinByteLimit } from "../../shared/expenseEvidenceLimits";

export { EXPENSE_EVIDENCE_LIMITS } from "../../shared/expenseEvidenceLimits";

export type ExpenseEvidenceMetadata = {
  mediaId: number;
  mediaRole: ExpenseEvidenceRole;
  kind: "image" | "video" | "audio" | "document";
  sizeBytes: number;
  durationMs: number | null;
};

/**
 * Enforces P17 evidence limits at the persistence boundary. It intentionally
 * trusts neither client file-size declarations nor client video duration.
 */
export function assertExpenseEvidenceWithinLimits(items: readonly ExpenseEvidenceMetadata[]): void {
  if (items.length > EXPENSE_EVIDENCE_LIMITS.maxItemsPerExpense) {
    throw new Error("EXPENSE_EVIDENCE_LIMIT_EXCEEDED");
  }

  const images = items.filter((item) => item.kind === "image");
  const videos = items.filter((item) => item.kind === "video");
  if (images.length > EXPENSE_EVIDENCE_LIMITS.maxImagesPerExpense || videos.length > EXPENSE_EVIDENCE_LIMITS.maxVideosPerExpense) {
    throw new Error("EXPENSE_EVIDENCE_LIMIT_EXCEEDED");
  }

  const imageCountByRole = new Map<ExpenseEvidenceRole, number>();
  for (const item of items) {
    if (item.kind === "image") {
      const next = (imageCountByRole.get(item.mediaRole) ?? 0) + 1;
      imageCountByRole.set(item.mediaRole, next);
      if (next > EXPENSE_EVIDENCE_LIMITS.maxImagesPerRole || !isExpenseEvidenceWithinByteLimit("image", item.sizeBytes)) {
        throw new Error(next > EXPENSE_EVIDENCE_LIMITS.maxImagesPerRole ? "EXPENSE_EVIDENCE_LIMIT_EXCEEDED" : "EXPENSE_EVIDENCE_SIZE_EXCEEDED");
      }
      continue;
    }

    if (item.kind === "video") {
      if (!isExpenseEvidenceWithinByteLimit("video", item.sizeBytes)) {
        throw new Error("EXPENSE_EVIDENCE_SIZE_EXCEEDED");
      }
      if (!Number.isSafeInteger(item.durationMs) || item.durationMs === null || item.durationMs < 0 || item.durationMs > EXPENSE_EVIDENCE_LIMITS.maxVideoDurationMs) {
        throw new Error("EXPENSE_EVIDENCE_VIDEO_DURATION_EXCEEDED");
      }
    }
  }
}
