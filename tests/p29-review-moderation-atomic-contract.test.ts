import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const reviewSection = dbSource.slice(dbSource.indexOf("// Reviews"), dbSource.indexOf("export async function getProviderReviews"));

describe("P29 review + moderation atomic writer contract", () => {
  it("uses one transaction to create a review and a pending canonical moderation record", () => {
    expect(reviewSection).toContain("return await db.transaction(async (tx) => {");
    expect(reviewSection).toContain("await tx.insert(reviews).values");
    expect(reviewSection).toContain("await tx.insert(userContentModerationRecords).values");
    expect(reviewSection).toContain('surface: "review"');
    expect(reviewSection).toContain('status: "pending"');
    expect(reviewSection).not.toContain('status: "approved"');
  });

  it("retains owner/request/lifecycle checks and retry behavior without exposing comment text in audit payload", () => {
    expect(reviewSection).toContain("eq(serviceRequests.userId, data.userId)");
    expect(reviewSection).toContain('request.status !== "completed"');
    expect(reviewSection).toContain("MIGRATION_REQUIRED_REVIEW_MODERATION");
    expect(reviewSection).toContain("idempotent: true");
    expect(reviewSection).toContain('contentHash: createHash("sha256")');
    expect(reviewSection).not.toContain("auditComment");
  });

  it("fails closed for absent moderation schema and recovers only a same-owner/provider duplicate-request race", () => {
    expect(reviewSection).toContain("isReviewModerationMigrationMissing");
    expect(reviewSection).toContain("MIGRATION_REQUIRED_REVIEW_MODERATION");
    expect(reviewSection).toContain("isDuplicateReviewRequest");
    expect(reviewSection).toContain("REVIEW_IDEMPOTENCY_CONFLICT");
    expect(reviewSection).toContain("existing[0].userId !== data.userId");
    expect(reviewSection).toContain("existing[0].providerId !== data.providerId");
    expect(reviewSection).toContain("moderationStatus: moderation[0].status");
  });
});
