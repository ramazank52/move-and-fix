/// <reference types="vitest/globals" />

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  listJobChangeOrders: vi.fn(),
  createJobChangeOrder: vi.fn(),
  respondToJobChangeOrder: vi.fn(),
  withdrawJobChangeOrder: vi.fn(),
  listExpenseRefundRequestsForParticipant: vi.fn(),
  resolveExpenseRefundRequest: vi.fn(),
  getJobCancellation: vi.fn(),
  openJobCancellation: vi.fn(),
  withdrawJobCancellation: vi.fn(),
}));

import * as agreementDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 55): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `agreement-user-${id}`,
    email: `agreement-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "Agreement Test User",
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

describe("agreement router security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives change-order author and cancellation opener only from the authenticated session", async () => {
    vi.mocked(agreementDb.createJobChangeOrder).mockResolvedValue({ id: 7, status: "requested" } as never);
    vi.mocked(agreementDb.openJobCancellation).mockResolvedValue({ id: 8, status: "requested" } as never);
    const caller = appRouter.createCaller(createContext(73));

    await caller.agreements.createChangeOrder({
      requestId: 42,
      kind: "amount",
      description: "Ek malzeme ve çalışma süresi gerekiyor.",
      amountDelta: 250,
      evidenceMediaIds: [4],
    });
    await caller.agreements.openCancellation({
      requestId: 42,
      reasonCode: "safety",
      description: "Çalışma alanı güvenli olmadığı için iş başlatılamıyor.",
      evidenceMediaIds: [5],
    });

    expect(agreementDb.createJobChangeOrder).toHaveBeenCalledWith({
      requestId: 42,
      userId: 73,
      kind: "amount",
      description: "Ek malzeme ve çalışma süresi gerekiyor.",
      amountDelta: 250,
      evidenceMediaIds: [4],
    });
    expect(agreementDb.openJobCancellation).toHaveBeenCalledWith({
      requestId: 42,
      userId: 73,
      reasonCode: "safety",
      description: "Çalışma alanı güvenli olmadığı için iş başlatılamıyor.",
      evidenceMediaIds: [5],
    });
  });

  it("derives responder and withdrawal identity from the authenticated session", async () => {
    vi.mocked(agreementDb.respondToJobChangeOrder).mockResolvedValue({ id: 7, status: "accepted" } as never);
    vi.mocked(agreementDb.withdrawJobChangeOrder).mockResolvedValue({ success: true, changeOrderId: 7 });
    vi.mocked(agreementDb.withdrawJobCancellation).mockResolvedValue({ success: true, cancellationId: 8 });
    const caller = appRouter.createCaller(createContext(81));

    await caller.agreements.respondToChangeOrder({ changeOrderId: 7, decision: "accepted" });
    await caller.agreements.withdrawChangeOrder({ changeOrderId: 7 });
    await caller.agreements.withdrawCancellation({ requestId: 42 });

    expect(agreementDb.respondToJobChangeOrder).toHaveBeenCalledWith({ changeOrderId: 7, decision: "accepted", userId: 81 });
    expect(agreementDb.withdrawJobChangeOrder).toHaveBeenCalledWith(7, 81);
    expect(agreementDb.withdrawJobCancellation).toHaveBeenCalledWith(42, 81);
  });

  it("derives an expense-refund decision identity only from the authenticated customer session", async () => {
    vi.mocked(agreementDb.resolveExpenseRefundRequest).mockResolvedValue({ id: 91, status: "approved" } as never);
    const caller = appRouter.createCaller(createContext(92));

    await caller.agreements.resolveExpenseRefund({ refundRequestId: 91, decision: "approved" });

    expect(agreementDb.resolveExpenseRefundRequest).toHaveBeenCalledWith({
      refundRequestId: 91,
      decision: "approved",
      customerUserId: 92,
    });
  });

  it("rejects unauthenticated agreement access before database operations", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });
    await expect(caller.agreements.changeOrders({ requestId: 42 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.agreements.openCancellation({
        requestId: 42,
        reasonCode: "other",
        description: "Geçerli bir iptal açıklaması ile gönderildi.",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.agreements.resolveExpenseRefund({ refundRequestId: 5, decision: "rejected" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(agreementDb.listJobChangeOrders).not.toHaveBeenCalled();
    expect(agreementDb.openJobCancellation).not.toHaveBeenCalled();
    expect(agreementDb.resolveExpenseRefundRequest).not.toHaveBeenCalled();
  });

  it("rejects malformed identifiers, duplicate evidence and non-positive amount changes before database access", async () => {
    const caller = appRouter.createCaller(createContext(73));
    await expect(caller.agreements.changeOrders({ requestId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.agreements.resolveExpenseRefund({ refundRequestId: 0, decision: "approved" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.agreements.createChangeOrder({
        requestId: 42,
        kind: "amount",
        description: "Ek malzeme ve çalışma süresi gerekiyor.",
        amountDelta: -1,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.agreements.openCancellation({
        requestId: 42,
        reasonCode: "other",
        description: "Geçerli bir iptal açıklaması ile gönderildi.",
        evidenceMediaIds: [5, 5],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(agreementDb.createJobChangeOrder).not.toHaveBeenCalled();
    expect(agreementDb.openJobCancellation).not.toHaveBeenCalled();
  });

  it("maps authorization, settlement-state and invalid-evidence failures to fail-closed tRPC errors", async () => {
    vi.mocked(agreementDb.createJobChangeOrder).mockRejectedValue(new Error("JOB_AGREEMENT_FORBIDDEN"));
    vi.mocked(agreementDb.respondToJobChangeOrder).mockRejectedValue(new Error("CHANGE_ORDER_NOT_PENDING"));
    vi.mocked(agreementDb.openJobCancellation).mockRejectedValue(new Error("JOB_EVIDENCE_INVALID"));
    vi.mocked(agreementDb.resolveExpenseRefundRequest).mockRejectedValue(new Error("EXPENSE_CUSTOMER_ONLY"));
    const caller = appRouter.createCaller(createContext(73));

    await expect(
      caller.agreements.createChangeOrder({
        requestId: 42,
        kind: "scope",
        description: "İş kapsamı güvenlik nedeniyle yeniden tanımlanmalıdır.",
        amountDelta: 0,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.agreements.respondToChangeOrder({ changeOrderId: 7, decision: "accepted" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await expect(
      caller.agreements.openCancellation({
        requestId: 42,
        reasonCode: "other",
        description: "Geçerli bir iptal açıklaması ile gönderildi.",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.agreements.resolveExpenseRefund({ refundRequestId: 11, decision: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
