import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  getPaymentQuote: vi.fn(),
  createPayment: vi.fn(),
  assertPaymentProviderOperational: vi.fn(),
  reservePaymentGateway: vi.fn(),
  approveCompletionProofForPayment: vi.fn(),
  transitionPaymentStatus: vi.fn(),
}));

import * as paymentDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: AuthenticatedUser["role"] = "user", id = 41): TrpcContext {
  return {
    user: {
      id,
      openId: `payment-user-${id}`,
      email: `payment-${id}@example.com`,
      phone: null,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      name: "Payment Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const quote = {
  requestId: 21,
  requestTitle: "Su tesisatı",
  providerId: 9,
  providerName: "Doğrulanmış Usta",
  offerId: 31,
  agreementId: 61,
  completionReviewHours: 48,
  currency: "TRY" as const,
  amount: 850,
  priceGuarantee: {
    id: 81,
    policyVersion: "no_surprise_price_v1",
    guaranteedAmount: 850,
    maximumAmount: 850,
    status: "active" as const,
  },
  commissionRateBps: 1_000,
  commissionAmount: 85,
  providerPayout: 765,
};

describe("payments router security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives quote ownership from the authenticated user", async () => {
    vi.mocked(paymentDb.getPaymentQuote).mockResolvedValue(quote);
    const caller = appRouter.createCaller(createContext("user", 41));

    await expect(caller.payments.quote({ requestId: 21 })).resolves.toEqual(quote);
    expect(paymentDb.getPaymentQuote).toHaveBeenCalledWith(21, 41);
  });

  it("strips client-controlled provider, amount and commission fields", async () => {
    vi.mocked(paymentDb.createPayment).mockResolvedValue({
      payment: { id: 71 } as never,
      duplicated: false,
      quote,
      gatewayReady: false,
      blocker: "PAYMENT_GATEWAY_CREDENTIALS_REQUIRED",
    });
    const caller = appRouter.createCaller(createContext("user", 41));

    await caller.payments.create({
      requestId: 21,
      idempotencyKey: "checkout-21-safe-idempotency-key",
      providerId: 999,
      amount: 1,
      commissionRateBps: 0,
    } as never);

    expect(paymentDb.createPayment).toHaveBeenCalledWith({
      requestId: 21,
      idempotencyKey: "checkout-21-safe-idempotency-key",
      userId: 41,
    });
  });

  it("routes release through proof-based idempotent escrow resolution", async () => {
    vi.mocked(paymentDb.approveCompletionProofForPayment).mockResolvedValue({
      payment: { id: 71, status: "released" } as never,
      resolution: "customer_approved",
    } as never);
    const caller = appRouter.createCaller(createContext("user", 41));

    await caller.payments.release({ paymentId: 71 });

    expect(paymentDb.approveCompletionProofForPayment).toHaveBeenCalledWith({
      paymentId: 71,
      userId: 41,
    });
    expect(paymentDb.transitionPaymentStatus).not.toHaveBeenCalled();
  });

  it("maps cross-user payment access to FORBIDDEN", async () => {
    vi.mocked(paymentDb.approveCompletionProofForPayment).mockRejectedValue(new Error("PAYMENT_FORBIDDEN"));
    const caller = appRouter.createCaller(createContext("user", 42));

    await expect(caller.payments.release({ paymentId: 71 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks refund for non-admin users before the database call", async () => {
    const caller = appRouter.createCaller(createContext("user", 41));

    await expect(caller.payments.refund({ paymentId: 71 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(paymentDb.transitionPaymentStatus).not.toHaveBeenCalled();
  });

  it("blocks an admin refund request until a verified gateway callback settles the payment", async () => {
    const caller = appRouter.createCaller(createContext("admin", 1));

    await expect(caller.payments.refund({ paymentId: 71 })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("doğrulanmış ödeme sağlayıcısı callback"),
    });
    expect(paymentDb.transitionPaymentStatus).not.toHaveBeenCalled();
  });

  it("rejects payment creation without authentication", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });
    await expect(caller.payments.create({
      requestId: 21,
      idempotencyKey: "checkout-21-safe-idempotency-key",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects malformed iyzico buyer data before any gateway reservation", async () => {
    const caller = appRouter.createCaller(createContext("user", 41));

    await expect(caller.payments.initializeGateway({
      paymentId: 71,
      provider: "iyzico",
      buyer: {
        gsmNumber: "555",
        identityNumber: "123",
        address: "kısa",
        city: "İ",
        zipCode: "34A00",
      },
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires iyzico buyer identity fields while allowing Stripe to omit them", async () => {
    const caller = appRouter.createCaller(createContext("user", 41));

    await expect(caller.payments.initializeGateway({
      paymentId: 71,
      provider: "iyzico",
      buyer: {},
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("fails closed before reserving a checkout when the provider scope is not operational", async () => {
    vi.mocked(paymentDb.assertPaymentProviderOperational).mockRejectedValue(
      new Error("PAYMENT_PROVIDER_NOT_CONFIGURED"),
    );
    const caller = appRouter.createCaller(createContext("user", 41));

    await expect(caller.payments.initializeGateway({
      paymentId: 71,
      provider: "stripe",
      buyer: {},
    })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    expect(paymentDb.reservePaymentGateway).not.toHaveBeenCalled();
  });
});
