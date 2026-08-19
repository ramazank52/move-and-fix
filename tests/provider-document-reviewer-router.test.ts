import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  hasValidAdminMfaGrant: vi.fn(),
  hasActiveSuperAdminRole: vi.fn(),
  hasActiveProviderDocumentReviewerPermission: vi.fn(),
  getProviderDocumentById: vi.fn(),
  logOperationEvent: vi.fn(),
  grantProviderDocumentReviewerPermission: vi.fn(),
  revokeProviderDocumentReviewerPermission: vi.fn(),
}));

vi.mock("../server/storage", () => ({
  storageGetSignedUrl: vi.fn(),
  storagePut: vi.fn(),
}));

import * as db from "../server/db";
import { storageGetSignedUrl } from "../server/storage";
import { appRouter } from "../server/routers";

function createAdminContext(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 901,
      openId: "reviewer-router-test",
      email: "reviewer@example.test",
      phone: null,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: null,
      name: "Reviewer Test",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    sessionFingerprint: "mfa-reauthed-session",
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    ...overrides,
  };
}

const cleanDocument = {
  id: 41,
  providerId: 77,
  quarantineStatus: "clean",
  contentPurgedAt: null,
  storageKey: "private/provider-documents/opaque-41",
};

describe("provider document reviewer router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.hasValidAdminMfaGrant).mockResolvedValue(true);
  });

  it("requires an active MFA re-authentication before any reviewer document lookup", async () => {
    vi.mocked(db.hasValidAdminMfaGrant).mockResolvedValue(false);
    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.reviewerDocuments.getDocumentAccess({ documentId: 41 }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.hasActiveProviderDocumentReviewerPermission).not.toHaveBeenCalled();
    expect(db.getProviderDocumentById).not.toHaveBeenCalled();
  });

  it("rejects an MFA-authenticated admin without the distinct reviewer permission before document lookup", async () => {
    vi.mocked(db.hasActiveProviderDocumentReviewerPermission).mockResolvedValue(false);
    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.reviewerDocuments.getDocumentAccess({ documentId: 41 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getProviderDocumentById).not.toHaveBeenCalled();
  });

  it("issues only a short-lived signed URL for clean retained content and emits an audit event", async () => {
    vi.mocked(db.hasActiveProviderDocumentReviewerPermission).mockResolvedValue(true);
    vi.mocked(db.getProviderDocumentById).mockResolvedValue(cleanDocument as never);
    vi.mocked(storageGetSignedUrl).mockResolvedValue("https://signed.example.test/review/opaque-41");
    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.reviewerDocuments.getDocumentAccess({ documentId: 41 }))
      .resolves.toEqual({ url: "https://signed.example.test/review/opaque-41", expiresInSeconds: 60 });
    expect(storageGetSignedUrl).toHaveBeenCalledWith(cleanDocument.storageKey, { expiresInSeconds: 60 });
    expect(db.logOperationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "provider_document_access_granted",
      actorId: 901,
      payload: expect.objectContaining({ accessScope: "reviewer", mfaReauthenticated: true }),
    }));
  });

  it("does not issue a URL for pending, malicious, purged, or storage-less documents", async () => {
    vi.mocked(db.hasActiveProviderDocumentReviewerPermission).mockResolvedValue(true);
    vi.mocked(db.getProviderDocumentById).mockResolvedValue({ ...cleanDocument, quarantineStatus: "pending_scan" } as never);
    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.reviewerDocuments.getDocumentAccess({ documentId: 41 }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(storageGetSignedUrl).not.toHaveBeenCalled();
    expect(db.logOperationEvent).not.toHaveBeenCalled();
  });
});
