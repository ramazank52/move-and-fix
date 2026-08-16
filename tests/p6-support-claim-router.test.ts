import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({
  createSupportTicket: vi.fn(),
  listOwnSupportTickets: vi.fn(),
  getOwnSupportTicket: vi.fn(),
  createInsuranceClaim: vi.fn(),
  listOwnInsuranceClaims: vi.fn(),
}));

import * as db from "../server/db";
import { appRouter } from "../server/routers";

function createContext(authenticated = true) {
  return {
    user: authenticated
      ? { id: 97, openId: "p6-user-97", email: "p6@example.test", name: "P6 User", role: "user" }
      : null,
    req: { protocol: "https", hostname: "localhost", headers: {} },
    res: {},
  } as never;
}

describe("P6 destek ve claim router sözleşmesi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("destek kaydını oturumdaki kullanıcıya bağlar", async () => {
    vi.mocked(db.createSupportTicket).mockResolvedValue({ id: 41 } as never);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.support.create({
      requestId: 12,
      category: "payment",
      priority: "high",
      subject: "Tahsilat inceleme talebi",
      description: "Ödeme durumunun yetkili ekip tarafından incelenmesini istiyorum.",
    })).resolves.toEqual({ id: 41 });

    expect(db.createSupportTicket).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 12,
      createdByUserId: 97,
      category: "payment",
    }));
  });

  it("oturumsuz destek ve claim isteklerini veri katmanına ulaşmadan reddeder", async () => {
    const caller = appRouter.createCaller(createContext(false));

    await expect(caller.support.mine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.insuranceClaims.create({
      requestId: 12,
      claimantRole: "customer",
      category: "property_damage",
      description: "Olay kaydı için hasar inceleme talebidir.",
      incidentAt: new Date("2026-08-16T08:00:00.000Z"),
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.listOwnSupportTickets).not.toHaveBeenCalled();
    expect(db.createInsuranceClaim).not.toHaveBeenCalled();
  });

  it("claim kaydına kullanıcı sahipliğini ve kanıt kimliklerini iletir", async () => {
    vi.mocked(db.createInsuranceClaim).mockResolvedValue({ id: 72, status: "submitted" } as never);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.insuranceClaims.create({
      requestId: 12,
      claimantRole: "customer",
      category: "property_damage",
      description: "Teslimat sırasında oluşan hasar için kanıtlı inceleme talep ediyorum.",
      incidentAt: new Date("2026-08-16T08:00:00.000Z"),
      mediaIds: [101, 102],
    })).resolves.toEqual({ id: 72, status: "submitted" });

    expect(db.createInsuranceClaim).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 12,
      openedByUserId: 97,
      mediaIds: [101, 102],
    }));
  });

  it("boş destek içeriğini veri katmanına ulaşmadan doğrulama hatasıyla reddeder", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.support.create({
      category: "other",
      subject: "Destek",
      description: " ",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.createSupportTicket).not.toHaveBeenCalled();
  });
});
