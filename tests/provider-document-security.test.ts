import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    getProviderProfile: vi.fn(),
    getProviderDocumentRequirements: vi.fn(),
    getProviderDocuments: vi.fn(),
    getProviderDocumentById: vi.fn(),
    getProviderInsurancePolicies: vi.fn(),
    getProviderOperatingModel: vi.fn(),
    getJobSafetyRules: vi.fn(),
    listProviderCapabilityStatuses: vi.fn(),
    createProviderCapabilityAppeal: vi.fn(),
    assertMessageParticipant: vi.fn(),
    logOperationEvent: vi.fn(),
  };
});

vi.mock("../server/storage", () => ({ storagePut: vi.fn(), storageGetSignedUrl: vi.fn() }));

import * as providerDb from "../server/db";
import { storageGetSignedUrl, storagePut } from "../server/storage";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 81, role: AuthenticatedUser["role"] = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `provider-document-${id}`,
    email: `provider-document-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "Belge Testi",
    loginMethod: "local",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("provider document and voice media security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects anonymous document reads, document uploads and voice uploads", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });
    await expect(caller.provider.getDocuments()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.provider.getDocumentRequirements()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.compliance.myCapabilities()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.provider.getInsurancePolicies()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.provider.getOperatingModel({ jurisdictionCode: "TR" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.provider.uploadDocument({ type: "identity", fileName: "kimlik.pdf", mimeType: "application/pdf", base64: "JVBERi0=" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.messages.sendVoice({ requestId: 9, receiverId: 10, mimeType: "audio/webm", durationMs: 500, base64: "AAAA" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("derives the provider identity from the session for private document lists", async () => {
    vi.mocked(providerDb.getProviderProfile).mockResolvedValue({ id: 901 } as Awaited<ReturnType<typeof providerDb.getProviderProfile>>);
    vi.mocked(providerDb.getProviderDocuments).mockResolvedValue([]);
    const caller = appRouter.createCaller(createContext(81));

    await expect(caller.provider.getDocuments()).resolves.toEqual([]);
    expect(providerDb.getProviderDocuments).toHaveBeenCalledWith(901);
  });

  it("does not expose persistent document storage references from the private list DTO", async () => {
    vi.mocked(providerDb.getProviderProfile).mockResolvedValue({ id: 901 } as Awaited<ReturnType<typeof providerDb.getProviderProfile>>);
    vi.mocked(providerDb.getProviderDocuments).mockResolvedValue([{
      id: 9011,
      providerId: 901,
      ownerUserId: 81,
      type: "identity",
      storageKey: "provider-documents/901/identity/private.pdf",
      fileUrl: "/manus-storage/provider-documents/901/identity/private.pdf",
      fileName: "kimlik.pdf",
      mimeType: "application/pdf",
      sizeBytes: 123,
      sha256: "a".repeat(64),
      status: "pending",
      quarantineStatus: "pending_scan",
      quarantineReason: null,
      scannedAt: null,
      releasedAt: null,
      rejectionReason: null,
      reviewedByUserId: null,
      reviewedAt: null,
      retentionDueAt: null,
      contentPurgedAt: null,
      purgeStatus: "not_scheduled",
      createdAt: new Date(),
      updatedAt: new Date(),
    }] as Awaited<ReturnType<typeof providerDb.getProviderDocuments>>);

    const caller = appRouter.createCaller(createContext(81));
    await expect(caller.provider.getDocuments()).resolves.toEqual([
      expect.objectContaining({ id: 9011, contentAvailable: false }),
    ]);
    const result = await caller.provider.getDocuments();
    expect(result[0]).not.toHaveProperty("storageKey");
    expect(result[0]).not.toHaveProperty("fileUrl");
  });

  it("issues a storage URL only to the document owner after a clean, retained quarantine state", async () => {
    vi.mocked(providerDb.getProviderDocumentById).mockResolvedValue({
      id: 9012,
      providerId: 901,
      ownerUserId: 81,
      storageKey: "provider-documents/901/identity/clean.pdf",
      quarantineStatus: "clean",
      contentPurgedAt: null,
    } as Awaited<ReturnType<typeof providerDb.getProviderDocumentById>>);
    vi.mocked(storageGetSignedUrl).mockResolvedValue("https://signed.example/temporary");
    const caller = appRouter.createCaller(createContext(81));

    await expect(caller.provider.getDocumentAccess({ documentId: 9012 })).resolves.toEqual({ url: "https://signed.example/temporary" });
    expect(storageGetSignedUrl).toHaveBeenCalledWith("provider-documents/901/identity/clean.pdf");
    expect(providerDb.logOperationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "provider_document_access_granted",
      subjectId: 9012,
      actorId: 81,
    }));
  });

  it("fails closed for another provider, unscanned content, purged content and unavailable signing", async () => {
    const caller = appRouter.createCaller(createContext(81));
    vi.mocked(providerDb.getProviderDocumentById).mockResolvedValue({ id: 9013, ownerUserId: 82 } as Awaited<ReturnType<typeof providerDb.getProviderDocumentById>>);
    await expect(caller.provider.getDocumentAccess({ documentId: 9013 })).rejects.toMatchObject({ code: "NOT_FOUND" });

    vi.mocked(providerDb.getProviderDocumentById).mockResolvedValue({ id: 9013, ownerUserId: 81, storageKey: "private", quarantineStatus: "pending_scan", contentPurgedAt: null } as Awaited<ReturnType<typeof providerDb.getProviderDocumentById>>);
    await expect(caller.provider.getDocumentAccess({ documentId: 9013 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    vi.mocked(providerDb.getProviderDocumentById).mockResolvedValue({ id: 9013, ownerUserId: 81, storageKey: "private", quarantineStatus: "clean", contentPurgedAt: new Date() } as Awaited<ReturnType<typeof providerDb.getProviderDocumentById>>);
    await expect(caller.provider.getDocumentAccess({ documentId: 9013 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    vi.mocked(providerDb.getProviderDocumentById).mockResolvedValue({ id: 9013, ownerUserId: 81, storageKey: "private", quarantineStatus: "clean", contentPurgedAt: null } as Awaited<ReturnType<typeof providerDb.getProviderDocumentById>>);
    vi.mocked(storageGetSignedUrl).mockRejectedValue(new Error("NOT_CONFIGURED"));
    await expect(caller.provider.getDocumentAccess({ documentId: 9013 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("derives dynamic document requirements solely from the authenticated provider session", async () => {
    vi.mocked(providerDb.getProviderDocumentRequirements).mockResolvedValue({
      providerId: 905,
      policyVersion: "tr-provider-documents-2026-08",
      category: { slug: "courier", name: "Kurye" },
      required: [{ type: "identity", title: "Kimlik belgesi", description: "T.C. kimlik kartı veya pasaport" }],
    } as Awaited<ReturnType<typeof providerDb.getProviderDocumentRequirements>>);
    const caller = appRouter.createCaller(createContext(94));

    await expect(caller.provider.getDocumentRequirements()).resolves.toMatchObject({
      providerId: 905,
      category: { slug: "courier" },
      required: [expect.objectContaining({ type: "identity" })],
    });
    expect(providerDb.getProviderDocumentRequirements).toHaveBeenCalledWith(94);
  });

  it("derives private insurance and operating-model scope solely from the provider session", async () => {
    vi.mocked(providerDb.getProviderProfile).mockResolvedValue({ id: 904 } as Awaited<ReturnType<typeof providerDb.getProviderProfile>>);
    vi.mocked(providerDb.getProviderInsurancePolicies).mockResolvedValue([]);
    vi.mocked(providerDb.getProviderOperatingModel).mockResolvedValue(null as never);
    const caller = appRouter.createCaller(createContext(91));

    await expect(caller.provider.getInsurancePolicies()).resolves.toEqual([]);
    await expect(caller.provider.getOperatingModel({ jurisdictionCode: "tr" })).resolves.toBeNull();
    expect(providerDb.getProviderInsurancePolicies).toHaveBeenCalledWith(904);
    expect(providerDb.getProviderOperatingModel).toHaveBeenCalledWith(904, "TR");
  });

  it("rejects a non-provider before document bytes reach storage", async () => {
    vi.mocked(providerDb.getProviderProfile).mockResolvedValue(null);
    const caller = appRouter.createCaller(createContext(82));

    await expect(caller.provider.uploadDocument({ type: "identity", fileName: "kimlik.pdf", mimeType: "application/pdf", base64: "JVBERi0=" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("rejects invalid document media and audio signatures before authorization side effects or storage", async () => {
    vi.mocked(providerDb.getProviderProfile).mockResolvedValue({ id: 902 } as Awaited<ReturnType<typeof providerDb.getProviderProfile>>);
    const caller = appRouter.createCaller(createContext(83));

    await expect(caller.provider.uploadDocument({ type: "identity", fileName: "kimlik.pdf", mimeType: "application/pdf", base64: "AAAA" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.messages.sendVoice({ requestId: 9, receiverId: 10, mimeType: "audio/webm", durationMs: 500, base64: "AAAA" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(providerDb.assertMessageParticipant).not.toHaveBeenCalled();
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("derives capability appeals from the provider session and rejects non-providers", async () => {
    vi.mocked(providerDb.getProviderProfile).mockResolvedValue(null);
    const nonProvider = appRouter.createCaller(createContext(89));
    await expect(nonProvider.compliance.appeal({
      providerCapabilityStatusId: 77,
      type: "appeal",
      statement: "İnceleme sonucuna ilişkin ek kanıtımı değerlendirmeye sunuyorum.",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(providerDb.createProviderCapabilityAppeal).not.toHaveBeenCalled();

    vi.mocked(providerDb.getProviderProfile).mockResolvedValue({ id: 903 } as Awaited<ReturnType<typeof providerDb.getProviderProfile>>);
    vi.mocked(providerDb.createProviderCapabilityAppeal).mockResolvedValue({ id: 55 } as Awaited<ReturnType<typeof providerDb.createProviderCapabilityAppeal>>);
    const provider = appRouter.createCaller(createContext(90));
    await expect(provider.compliance.appeal({
      providerCapabilityStatusId: 78,
      type: "resubmission",
      statement: "Güncel belge ve kapsam açıklamam yeniden değerlendirme için hazırdır.",
    })).resolves.toMatchObject({ id: 55 });
    expect(providerDb.createProviderCapabilityAppeal).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 903,
      providerCapabilityStatusId: 78,
    }));
  });

  it("enforces the admin-only provider-document review boundary", async () => {
    const caller = appRouter.createCaller(createContext(84, "user"));
    await expect(caller.admin.reviewProviderDocument({ documentId: 901, status: "approved" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects non-providers from P11 private policy endpoints and exposes only active safety rule DTO fields publicly", async () => {
    vi.mocked(providerDb.getProviderProfile).mockResolvedValue(null);
    vi.mocked(providerDb.getProviderDocumentRequirements).mockResolvedValue(null);
    const nonProvider = appRouter.createCaller(createContext(92));
    await expect(nonProvider.provider.getInsurancePolicies()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(nonProvider.provider.getOperatingModel({ jurisdictionCode: "TR" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(nonProvider.provider.getDocumentRequirements()).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.mocked(providerDb.getJobSafetyRules).mockResolvedValue([{
      id: 301,
      jurisdictionCode: "TR",
      categoryId: 8,
      serviceKey: "electrical",
      activityStatus: "allowed",
      riskAttributesJson: { voltage: "low" },
      prerequisitesJson: { requiresVerifiedInsurance: true },
      version: "2026.08",
      status: "active",
      createdByUserId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }] as Awaited<ReturnType<typeof providerDb.getJobSafetyRules>>);
    const anonymous = appRouter.createCaller({ ...createContext(), user: null });
    await expect(anonymous.compliance.getJobSafetyRules({ jurisdictionCode: "tr", categoryId: 8, serviceKey: "electrical" }))
      .resolves.toEqual([expect.objectContaining({ id: 301, jurisdictionCode: "TR", activityStatus: "allowed" })]);
    expect(providerDb.getJobSafetyRules).toHaveBeenCalledWith({ jurisdictionCode: "TR", categoryId: 8, serviceKey: "electrical" });
  });
});
