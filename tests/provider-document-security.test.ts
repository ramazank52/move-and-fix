import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    getProviderProfile: vi.fn(),
    getProviderDocuments: vi.fn(),
    assertMessageParticipant: vi.fn(),
  };
});

vi.mock("../server/storage", () => ({ storagePut: vi.fn() }));

import * as providerDb from "../server/db";
import { storagePut } from "../server/storage";
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
    await expect(caller.providers.getDocuments()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.providers.uploadDocument({ type: "identity", fileName: "kimlik.pdf", mimeType: "application/pdf", base64: "JVBERi0=" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.messages.sendVoice({ requestId: 9, receiverId: 10, mimeType: "audio/webm", durationMs: 500, base64: "AAAA" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("derives the provider identity from the session for private document lists", async () => {
    vi.mocked(providerDb.getProviderProfile).mockResolvedValue({ id: 901 } as Awaited<ReturnType<typeof providerDb.getProviderProfile>>);
    vi.mocked(providerDb.getProviderDocuments).mockResolvedValue([]);
    const caller = appRouter.createCaller(createContext(81));

    await expect(caller.providers.getDocuments()).resolves.toEqual([]);
    expect(providerDb.getProviderDocuments).toHaveBeenCalledWith(901);
  });

  it("rejects a non-provider before document bytes reach storage", async () => {
    vi.mocked(providerDb.getProviderProfile).mockResolvedValue(null);
    const caller = appRouter.createCaller(createContext(82));

    await expect(caller.providers.uploadDocument({ type: "identity", fileName: "kimlik.pdf", mimeType: "application/pdf", base64: "JVBERi0=" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("rejects invalid document media and audio signatures before authorization side effects or storage", async () => {
    vi.mocked(providerDb.getProviderProfile).mockResolvedValue({ id: 902 } as Awaited<ReturnType<typeof providerDb.getProviderProfile>>);
    const caller = appRouter.createCaller(createContext(83));

    await expect(caller.providers.uploadDocument({ type: "identity", fileName: "kimlik.pdf", mimeType: "application/pdf", base64: "AAAA" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.messages.sendVoice({ requestId: 9, receiverId: 10, mimeType: "audio/webm", durationMs: 500, base64: "AAAA" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(providerDb.assertMessageParticipant).not.toHaveBeenCalled();
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("enforces the admin-only provider-document review boundary", async () => {
    const caller = appRouter.createCaller(createContext(84, "user"));
    await expect(caller.admin.reviewProviderDocument({ documentId: 901, status: "approved" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
