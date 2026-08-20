import { MEDIA_UPLOAD_LIMIT_BYTES } from "./mediaUploadLimits";

/**
 * Product defaults are intentionally retained next to effective values.
 * The effective byte ceilings must never relax the existing secure media
 * policy, even though the product maximum allows larger files.
 */
export const EXPENSE_EVIDENCE_LIMITS = {
  configuredImageMaxBytes: 10 * 1024 * 1024,
  configuredVideoMaxBytes: 50 * 1024 * 1024,
  imageMaxBytes: Math.min(10 * 1024 * 1024, MEDIA_UPLOAD_LIMIT_BYTES.requestImage),
  videoMaxBytes: Math.min(50 * 1024 * 1024, MEDIA_UPLOAD_LIMIT_BYTES.requestVideo),
  maxImagesPerRole: 6,
  maxImagesPerExpense: 15,
  maxVideosPerExpense: 2,
  maxItemsPerExpense: 20,
  maxVideoDurationMs: 60_000,
  /** Existing request-media storage remains stricter than the per-expense total. */
  existingRequestMediaMaxItems: 8,
} as const;

export type ExpenseEvidenceRole = "receipt" | "invoice" | "product" | "material" | "video" | "other";

export function isExpenseEvidenceWithinByteLimit(kind: "image" | "video", byteLength: number): boolean {
  const limit = kind === "video" ? EXPENSE_EVIDENCE_LIMITS.videoMaxBytes : EXPENSE_EVIDENCE_LIMITS.imageMaxBytes;
  return Number.isSafeInteger(byteLength) && byteLength >= 0 && byteLength <= limit;
}
