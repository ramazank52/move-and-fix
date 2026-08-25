import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  hasActiveSuperAdminRole: vi.fn(),
  hasValidAdminMfaGrant: vi.fn(),
  planApprovedRatingReconciliation: vi.fn(),
  applyApprovedRatingReconciliation: vi.fn(),
  setProviderMaxConcurrentActiveJobs: vi.fn(),
}));

import * as db from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function context(options?: { sessionFingerprint?: string; userId?: number }): TrpcContext {
  const user: AuthenticatedUser = {
    id: options?.userId ?? 44,
    openId: "p33-rating-admin",
    email: "p33-rating-admin@example.invalid",
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "P33 Synthetic Super Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    sessionFingerprint: options?.sessionFingerprint,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("P33 rating reconciliation Super Admin contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.hasValidAdminMfaGrant).mockResolvedValue(true);
    vi.mocked(db.hasActiveSuperAdminRole).mockResolvedValue(true);
  });

  it("requires a session-bound MFA grant before even the redacted dry-run plan", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.ratingReconciliation.plan()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.planApprovedRatingReconciliation).not.toHaveBeenCalled();
  });

  it("requires an active Super Admin role after MFA", async () => {
    vi.mocked(db.hasActiveSuperAdminRole).mockResolvedValue(false);
    const caller = appRouter.createCaller(context({ sessionFingerprint: "p33-session" }));
    await expect(caller.ratingReconciliation.plan()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.planApprovedRatingReconciliation).not.toHaveBeenCalled();
  });

  it("returns only dry-run plan hashes and aggregate count, never review text or reviewer PII", async () => {
    vi.mocked(db.planApprovedRatingReconciliation).mockResolvedValue({
      planHash: "a".repeat(64),
      schemaFingerprint: "b".repeat(64),
      aggregateCount: 2,
      aggregates: [{ providerId: 7, approvedReviewCount: 3, averageRating: 4.67 }],
    });
    const caller = appRouter.createCaller(context({ sessionFingerprint: "p33-session" }));
    await expect(caller.ratingReconciliation.plan()).resolves.toEqual({
      planHash: "a".repeat(64),
      schemaFingerprint: "b".repeat(64),
      aggregateCount: 2,
      mode: "dry_run",
    });
  });

  it("maps disabled apply to a fail-closed private-staging precondition", async () => {
    vi.mocked(db.applyApprovedRatingReconciliation).mockRejectedValue(new Error("RATING_RECONCILIATION_APPLY_NOT_CONFIGURED"));
    const caller = appRouter.createCaller(context({ sessionFingerprint: "p33-session", userId: 44 }));
    await expect(caller.ratingReconciliation.applyRun({
      runKey: "rating_run_p33_123456",
      expectedPlanHash: "a".repeat(64),
      expectedSchemaFingerprint: "b".repeat(64),
      batchSize: 100,
    })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.applyApprovedRatingReconciliation).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 44 }));
  });

  it("requires Super Admin MFA for provider capacity changes and preserves an unapplied migration blocker", async () => {
    vi.mocked(db.setProviderMaxConcurrentActiveJobs).mockRejectedValue(new Error("MIGRATION_REQUIRED_PROVIDER_CAPACITY"));
    const caller = appRouter.createCaller(context({ sessionFingerprint: "p33-session", userId: 44 }));
    await expect(caller.providerCapacity.setMaxConcurrentActiveJobs({ providerId: 7, maxConcurrentActiveJobs: 2 }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.setProviderMaxConcurrentActiveJobs).toHaveBeenCalledWith({ actorUserId: 44, providerId: 7, maxConcurrentActiveJobs: 2 });
  });
});
