import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    getConversation: vi.fn(),
    getMessageParticipant: vi.fn(),
    markConversationRead: vi.fn(),
    sendMessage: vi.fn(),
  };
});

import * as messageDb from "../server/db";
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
    expect(messageDb.getConversation).not.toHaveBeenCalled();
    expect(messageDb.sendMessage).not.toHaveBeenCalled();
    expect(messageDb.markConversationRead).not.toHaveBeenCalled();
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
        mediaStorageKey: null,
        mediaUrl: null,
        mediaMimeType: null,
        mediaSizeBytes: null,
        mediaDurationMs: null,
        mediaSha256: null,
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
