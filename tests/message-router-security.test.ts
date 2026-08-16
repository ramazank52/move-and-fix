import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    getConversation: vi.fn(),
    getAuthorizedVoiceMessageStorage: vi.fn(),
    getAuthorizedTextMessageForTranslation: vi.fn(),
    getMessageParticipant: vi.fn(),
    markConversationRead: vi.fn(),
    sendMessage: vi.fn(),
    softDeleteMessage: vi.fn(),
    listOwnPrivacyRightsRequests: vi.fn(),
    createPrivacyRightsRequest: vi.fn(),
    getMaskedCommunicationSession: vi.fn(),
    createMaskedCommunicationSession: vi.fn(),
    releaseMaskedCommunicationSession: vi.fn(),
  };
});

vi.mock("../server/ai/OnDemandMessageTranslation", () => ({
  translateMessageOnDemand: vi.fn(),
}));

import * as messageDb from "../server/db";
import { translateMessageOnDemand } from "../server/ai/OnDemandMessageTranslation";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 10): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `message-user-${id}`,
    email: `message-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: `Message User ${id}`,
    loginMethod: "manus",
    role: "user",
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

function createParticipantDatabase(row?: {
  customerUserId: number;
  providerUserId: number | null;
}) {
  const limit = vi.fn().mockResolvedValue(row ? [row] : []);
  const where = vi.fn(() => ({ limit }));
  const leftJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ leftJoin }));
  return {
    select: vi.fn(() => ({ from })),
  } as unknown as Parameters<typeof messageDb.assertMessageParticipant>[0];
}

describe("message participant database policy", () => {
  it("allows only the request customer and assigned provider as the exact pair", async () => {
    const database = createParticipantDatabase({ customerUserId: 10, providerUserId: 20 });

    await expect(
      messageDb.assertMessageParticipant(database, 42, 10, 20),
    ).resolves.toBeUndefined();
    await expect(
      messageDb.assertMessageParticipant(database, 42, 20, 10),
    ).resolves.toBeUndefined();
    await expect(
      messageDb.assertMessageParticipant(database, 42, 30, 20),
    ).rejects.toThrow("MESSAGE_FORBIDDEN");
    await expect(
      messageDb.assertMessageParticipant(database, 42, 10, 30),
    ).rejects.toThrow("MESSAGE_COUNTERPARTY_FORBIDDEN");
  });

  it("fails closed for missing or unassigned service requests", async () => {
    await expect(
      messageDb.assertMessageParticipant(createParticipantDatabase(), 404, 10, 20),
    ).rejects.toThrow("MESSAGE_REQUEST_NOT_FOUND");
    await expect(
      messageDb.assertMessageParticipant(
        createParticipantDatabase({ customerUserId: 10, providerUserId: null }),
        42,
        10,
        20,
      ),
    ).rejects.toThrow("MESSAGE_REQUEST_NOT_ASSIGNED");
  });
});

describe("message router security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects anonymous reads, sends and read receipts before database access", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });

    await expect(
      caller.messages.conversation({ requestId: 42, otherUserId: 20 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.messages.send({ requestId: 42, receiverId: 20, content: "Merhaba" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.messages.markRead({ requestId: 42, otherUserId: 20 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.messages.delete({ messageId: 501 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.messages.translate({ messageId: 501, targetLanguage: "en" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.privacyRights.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.privacyRights.submit({ requestType: "erasure", requestReason: "Veri silme talebi" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(messageDb.getConversation).not.toHaveBeenCalled();
    expect(messageDb.sendMessage).not.toHaveBeenCalled();
    expect(messageDb.markConversationRead).not.toHaveBeenCalled();
    expect(messageDb.softDeleteMessage).not.toHaveBeenCalled();
    expect(messageDb.getAuthorizedTextMessageForTranslation).not.toHaveBeenCalled();
    expect(messageDb.listOwnPrivacyRightsRequests).not.toHaveBeenCalled();
    expect(messageDb.createPrivacyRightsRequest).not.toHaveBeenCalled();
  });

  it("binds a message delete request to the authenticated sender only", async () => {
    vi.mocked(messageDb.softDeleteMessage).mockResolvedValue({ deleted: true, idempotent: false });
    const caller = appRouter.createCaller(createContext(10));

    await expect(caller.messages.delete({ messageId: 501 })).resolves.toEqual({ deleted: true, idempotent: false });
    expect(messageDb.softDeleteMessage).toHaveBeenCalledWith({ messageId: 501, actorUserId: 10 });
  });

  it("validates and binds privacy requests to their owner", async () => {
    vi.mocked(messageDb.createPrivacyRightsRequest).mockResolvedValue({ id: 83, status: "open" });
    vi.mocked(messageDb.listOwnPrivacyRightsRequests).mockResolvedValue([]);
    const caller = appRouter.createCaller(createContext(10));

    await expect(caller.privacyRights.submit({ requestType: "export", requestReason: "KVKK veri kopyası" }))
      .resolves.toEqual({ id: 83, status: "open" });
    await expect(caller.privacyRights.list()).resolves.toEqual([]);
    expect(messageDb.createPrivacyRightsRequest).toHaveBeenCalledWith({
      requesterUserId: 10,
      requestType: "export",
      requestReason: "KVKK veri kopyası",
    });
    expect(messageDb.listOwnPrivacyRightsRequests).toHaveBeenCalledWith(10);
    await expect(caller.privacyRights.submit({ requestType: "erasure", requestReason: "x" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a third party trying to send into another service conversation", async () => {
    vi.mocked(messageDb.sendMessage).mockRejectedValue(new Error("MESSAGE_FORBIDDEN"));
    const caller = appRouter.createCaller(createContext(30));

    await expect(
      caller.messages.send({ requestId: 42, receiverId: 20, content: "Yetkisiz mesaj" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(messageDb.sendMessage).toHaveBeenCalledWith({
      requestId: 42,
      receiverId: 20,
      content: "Yetkisiz mesaj",
      senderId: 30,
    });
  });

  it("derives valid customer and provider identities exclusively from their sessions", async () => {
    vi.mocked(messageDb.sendMessage).mockResolvedValue(501);
    vi.mocked(messageDb.getConversation).mockResolvedValue([
      {
        id: 501,
        senderId: 10,
        receiverId: 20,
        requestId: 42,
        content: "Randevu uygun.",
        kind: "text",
        mediaMimeType: null,
        mediaSizeBytes: null,
        mediaDurationMs: null,
        isRead: 0,
        createdAt: new Date("2026-08-09T08:00:00.000Z"),
      },
    ]);

    const customerCaller = appRouter.createCaller(createContext(10));
    const providerCaller = appRouter.createCaller(createContext(20));

    await expect(
      customerCaller.messages.send({ requestId: 42, receiverId: 20, content: "Randevu uygun." }),
    ).resolves.toBe(501);
    await expect(
      providerCaller.messages.conversation({ requestId: 42, otherUserId: 10 }),
    ).resolves.toEqual([
      expect.objectContaining({ id: 501, isOwn: false, requestId: 42 }),
    ]);

    expect(messageDb.sendMessage).toHaveBeenCalledWith({
      requestId: 42,
      receiverId: 20,
      content: "Randevu uygun.",
      senderId: 10,
    });
    expect(messageDb.getConversation).toHaveBeenCalledWith(42, 20, 10);
  });

  it("never exposes a permanent media address in a conversation DTO", async () => {
    vi.mocked(messageDb.getConversation).mockResolvedValue([
      {
        id: 502,
        senderId: 10,
        receiverId: 20,
        requestId: 42,
        content: "Sesli mesaj",
        kind: "audio",
        mediaMimeType: "audio/mpeg",
        mediaSizeBytes: 1_024,
        mediaDurationMs: 2_000,
        isRead: 0,
        createdAt: new Date("2026-08-09T08:01:00.000Z"),
      },
    ]);
    const caller = appRouter.createCaller(createContext(10));

    const messages = await caller.messages.conversation({ requestId: 42, otherUserId: 20 });

    expect(messages[0]).not.toHaveProperty("mediaUrl");
    expect(messages[0]).not.toHaveProperty("mediaStorageKey");
    expect(messages[0]).not.toHaveProperty("mediaSha256");
  });

  it("binds audio playback access to the authenticated conversation participant", async () => {
    vi.mocked(messageDb.getAuthorizedVoiceMessageStorage).mockResolvedValue({
      id: 502,
      requestId: 42,
      senderId: 10,
      receiverId: 20,
      storageKey: "messages/42/10/audio.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 1_024,
      durationMs: 2_000,
    });
    const caller = appRouter.createCaller(createContext(10));

    await expect(caller.messages.voiceAccess({ messageId: 502 })).resolves.toMatchObject({
      messageId: 502,
      mimeType: "audio/mpeg",
      sizeBytes: 1_024,
      durationMs: 2_000,
    });
    expect(messageDb.getAuthorizedVoiceMessageStorage).toHaveBeenCalledWith(502, 10);
  });

  it("translates only an authorized visible text message and does not persist a translation", async () => {
    vi.mocked(messageDb.getAuthorizedTextMessageForTranslation).mockResolvedValue({
      id: 503,
      requestId: 42,
      senderId: 20,
      receiverId: 10,
      content: "Usta yolda.",
    });
    vi.mocked(translateMessageOnDemand).mockResolvedValue({
      status: "translated",
      targetLanguage: "en",
      translatedText: "The professional is on the way.",
    });
    const caller = appRouter.createCaller(createContext(10));

    await expect(caller.messages.translate({ messageId: 503, targetLanguage: "en" })).resolves.toEqual({
      messageId: 503,
      targetLanguage: "en",
      translatedText: "The professional is on the way.",
    });
    expect(messageDb.getAuthorizedTextMessageForTranslation).toHaveBeenCalledWith(503, 10);
    expect(translateMessageOnDemand).toHaveBeenCalledWith({ sourceText: "Usta yolda.", targetLanguage: "en" });
  });

  it("does not disclose an inaccessible message or fabricate translation output", async () => {
    vi.mocked(messageDb.getAuthorizedTextMessageForTranslation).mockResolvedValue(null);
    const caller = appRouter.createCaller(createContext(30));

    await expect(caller.messages.translate({ messageId: 503, targetLanguage: "en" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(translateMessageOnDemand).not.toHaveBeenCalled();
  });

  it("fails closed if the translation provider is unavailable and validates language before database access", async () => {
    vi.mocked(messageDb.getAuthorizedTextMessageForTranslation).mockResolvedValue({
      id: 503,
      requestId: 42,
      senderId: 20,
      receiverId: 10,
      content: "Usta yolda.",
    });
    vi.mocked(translateMessageOnDemand).mockResolvedValue({ status: "unavailable", code: "TRANSLATION_UNAVAILABLE" });
    const caller = appRouter.createCaller(createContext(10));

    await expect(caller.messages.translate({ messageId: 503, targetLanguage: "en" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(caller.messages.translate({ messageId: 503, targetLanguage: "xx" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("maps unauthorized read receipts to FORBIDDEN and never trusts a client user id", async () => {
    vi.mocked(messageDb.markConversationRead).mockRejectedValue(
      new Error("MESSAGE_COUNTERPARTY_FORBIDDEN"),
    );
    const caller = appRouter.createCaller(createContext(30));

    await expect(
      caller.messages.markRead({ requestId: 42, otherUserId: 20 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(messageDb.markConversationRead).toHaveBeenCalledWith(42, 30, 20);
  });

  it("requires a positive request id for every conversation operation", async () => {
    const caller = appRouter.createCaller(createContext(10));

    await expect(
      caller.messages.conversation({ requestId: 0, otherUserId: 20 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.messages.send({ requestId: 0, receiverId: 20, content: "Merhaba" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(messageDb.getConversation).not.toHaveBeenCalled();
    expect(messageDb.sendMessage).not.toHaveBeenCalled();
  });
});

describe("masked communication router security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects anonymous proxy-session operations before database access", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });

    await expect(caller.maskedCommunications.status({ requestId: 42, channel: "phone" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.maskedCommunications.create({ requestId: 42, channel: "message" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.maskedCommunications.release({ requestId: 42, channel: "phone" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(messageDb.getMaskedCommunicationSession).not.toHaveBeenCalled();
    expect(messageDb.createMaskedCommunicationSession).not.toHaveBeenCalled();
    expect(messageDb.releaseMaskedCommunicationSession).not.toHaveBeenCalled();
  });

  it("derives proxy-session access from the authenticated participant and exposes no real number", async () => {
    vi.mocked(messageDb.getMaskedCommunicationSession).mockResolvedValue({
      id: 80,
      requestId: 42,
      channel: "phone",
      status: "not_configured",
      expiresAt: null,
      releasedAt: null,
      createdAt: new Date(),
    } as never);
    const caller = appRouter.createCaller(createContext(10));

    await expect(caller.maskedCommunications.status({ requestId: 42, channel: "phone" })).resolves.toMatchObject({
      readiness: { configured: false, code: "NOT_CONFIGURED" },
      session: { id: 80, status: "not_configured" },
    });
    expect(messageDb.getMaskedCommunicationSession).toHaveBeenCalledWith({
      requestId: 42,
      channel: "phone",
      actorUserId: 10,
    });
  });

  it("maps third-party proxy-session access to FORBIDDEN", async () => {
    vi.mocked(messageDb.createMaskedCommunicationSession).mockRejectedValue(
      new Error("MASKED_COMMUNICATION_FORBIDDEN"),
    );
    const caller = appRouter.createCaller(createContext(30));

    await expect(caller.maskedCommunications.create({ requestId: 42, channel: "message" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(messageDb.createMaskedCommunicationSession).toHaveBeenCalledWith({
      requestId: 42,
      channel: "message",
      actorUserId: 30,
    });
  });

  it("requires a valid positive request id and supported channel", async () => {
    const caller = appRouter.createCaller(createContext(10));

    await expect(caller.maskedCommunications.status({ requestId: 0, channel: "phone" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.maskedCommunications.status({ requestId: 42, channel: "video" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(messageDb.getMaskedCommunicationSession).not.toHaveBeenCalled();
  });
});
