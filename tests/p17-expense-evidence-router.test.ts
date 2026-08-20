import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  createJobExpense: vi.fn(),
  listJobExpensesForParticipant: vi.fn(),
}));

import * as expenseDb from "../server/db";
import { appRouter } from "../server/routers";

function createContext(id = 41): TrpcContext {
  return {
    user: {
      id,
      openId: `expense-provider-${id}`,
      email: `expense-provider-${id}@example.test`,
      phone: null,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      name: "Expense Provider",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const validExpense = {
  requestId: 721,
  category: "material" as const,
  amount: 4_500,
  description: "Yedek parça ve montaj malzemesi",
  purchasedAt: new Date("2026-08-20T10:00:00.000Z"),
  media: [
    { mediaId: 11, mediaRole: "receipt" as const },
    { mediaId: 12, mediaRole: "invoice" as const },
    { mediaId: 13, mediaRole: "product" as const },
    { mediaId: 14, mediaRole: "material" as const },
    { mediaId: 15, mediaRole: "video" as const },
  ],
};

describe("P17-14 expense evidence router behavior", () => {
  beforeEach(() => vi.clearAllMocks());

  it("binds semantic evidence roles and persistence ownership to the authenticated provider", async () => {
    vi.mocked(expenseDb.createJobExpense).mockResolvedValue({ id: 901, ...validExpense } as never);
    const caller = appRouter.createCaller(createContext(44));

    await expect(caller.agreements.createExpense(validExpense)).resolves.toMatchObject({ id: 901 });
    expect(expenseDb.createJobExpense).toHaveBeenCalledWith({
      ...validExpense,
      providerUserId: 44,
    });
  });

  it("rejects duplicate media references before persistence", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.agreements.createExpense({
      ...validExpense,
      media: [{ mediaId: 11, mediaRole: "receipt" }, { mediaId: 11, mediaRole: "invoice" }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(expenseDb.createJobExpense).not.toHaveBeenCalled();
  });

  it("denies unauthenticated expense creation and participant reads before data access", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });

    await expect(caller.agreements.createExpense(validExpense)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.agreements.expenses({ requestId: validExpense.requestId })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(expenseDb.createJobExpense).not.toHaveBeenCalled();
    expect(expenseDb.listJobExpensesForParticipant).not.toHaveBeenCalled();
  });
});
