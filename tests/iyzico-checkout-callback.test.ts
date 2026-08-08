import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getPaymentByIyzicoCheckoutToken: vi.fn(),
  resolvePaymentForGatewayWebhook: vi.fn(),
}));

const processorMocks = vi.hoisted(() => ({
  processVerifiedPaymentWebhook: vi.fn(),
}));

vi.mock("../server/db", () => dbMocks);
vi.mock("../server/payments/PaymentWebhookProcessor", () => processorMocks);

import {
  IyzicoCheckoutCallbackError,
  IyzicoCheckoutCallbackService,
} from "../server/payments/IyzicoCheckoutCallbackService";

const secretKey = "test-secret-key";
const checkoutToken = "checkout-token-123";
const payment = {
  id: 42,
  requestId: 100,
  userId: 7,
  amount: "125.00",
  currency: "TRY",
  status: "pending",
  gatewayProvider: "iyzico",
  gatewayCheckoutToken: checkoutToken,
};

function signedResponse(overrides: Record<string, unknown> = {}) {
  const response = {
    status: "success",
    paymentStatus: "SUCCESS",
    paymentId: "iyzi-payment-1",
    currency: "TRY",
    basketId: "request:100",
    conversationId: "movefix:42",
    paidPrice: "125.00",
    price: "125.00",
    token: checkoutToken,
    ...overrides,
  } as Record<string, unknown> & { signature?: string };
  response.signature = createHmac("sha256", secretKey)
    .update(
      [
        response.paymentStatus,
        response.paymentId,
        response.currency,
        response.basketId,
        response.conversationId,
        response.paidPrice,
        response.price,
        response.token,
      ]
        .map(String)
        .join(":"),
      "utf8",
    )
    .digest("hex");
  return response;
}

function createService(
  retrieve: (request: Record<string, unknown>, callback: (error: unknown, result: never) => void) => void,
  timeoutMs = 100,
) {
  return new IyzicoCheckoutCallbackService(
    {
      timeoutMs,
      apiKey: "test-api-key",
      secretKey,
      baseUrl: "https://sandbox-api.iyzipay.com",
    },
    {
      iyzicoFactory: () => ({ checkoutForm: { retrieve } }),
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.getPaymentByIyzicoCheckoutToken.mockResolvedValue(payment);
  dbMocks.resolvePaymentForGatewayWebhook.mockResolvedValue({
    ...payment,
    gatewayPaymentId: "iyzi-payment-1",
  });
  processorMocks.processVerifiedPaymentWebhook.mockResolvedValue({
    received: true,
    duplicated: false,
    paymentId: 42,
    paymentStatus: "held",
  });
});

describe("iyzico hosted checkout callback", () => {
  it("tokenı ödeme kaydına bağlar, retrieve imzasını doğrular ve durable processorü çağırır", async () => {
    const retrieve = vi.fn((_request, callback) => callback(null, signedResponse() as never));
    const service = createService(retrieve);

    const result = await service.process(checkoutToken);

    expect(retrieve).toHaveBeenCalledWith(
      { locale: "tr", conversationId: "movefix:42", token: checkoutToken },
      expect.any(Function),
    );
    expect(dbMocks.resolvePaymentForGatewayWebhook).toHaveBeenCalledWith({
      provider: "iyzico",
      gatewayPaymentId: "iyzi-payment-1",
      internalPaymentId: 42,
    });
    const rawEvent = processorMocks.processVerifiedPaymentWebhook.mock.calls[0][1] as string;
    expect(rawEvent).not.toContain(checkoutToken);
    expect(JSON.parse(rawEvent)).toMatchObject({
      paymentId: "iyzi-payment-1",
      paymentConversationId: "movefix:42",
      status: "SUCCESS",
      paidPrice: "125.00",
      currency: "TRY",
    });
    expect(result).toMatchObject({ paymentId: 42, paymentStatus: "held" });
  });

  it("retrieve yanıt imzası geçersizse gateway referansı ve escrow durumunu değiştirmez", async () => {
    const retrieve = vi.fn((_request, callback) =>
      callback(null, { ...signedResponse(), signature: "00".repeat(32) } as never),
    );

    await expect(createService(retrieve).process(checkoutToken)).rejects.toMatchObject({
      code: "CALLBACK_SIGNATURE_INVALID",
      httpStatus: 401,
    });
    expect(dbMocks.resolvePaymentForGatewayWebhook).not.toHaveBeenCalled();
    expect(processorMocks.processVerifiedPaymentWebhook).not.toHaveBeenCalled();
  });

  it("token, conversation veya basket ödeme kaydıyla eşleşmezse fail-closed reddeder", async () => {
    const retrieve = vi.fn((_request, callback) =>
      callback(null, signedResponse({ basketId: "request:999" }) as never),
    );

    await expect(createService(retrieve).process(checkoutToken)).rejects.toMatchObject({
      code: "CALLBACK_PAYMENT_MISMATCH",
      httpStatus: 409,
    });
    expect(processorMocks.processVerifiedPaymentWebhook).not.toHaveBeenCalled();
  });

  it("iyzico retrieve yanıt vermediğinde timeout ile kapanır", async () => {
    const retrieve = vi.fn(() => undefined);

    await expect(createService(retrieve, 5).process(checkoutToken)).rejects.toMatchObject({
      code: "CALLBACK_TIMEOUT",
      httpStatus: 504,
    });
  });

  it("credential eksikken sağlayıcı çağrısı yapmadan açık blocker döndürür", async () => {
    const service = new IyzicoCheckoutCallbackService(
      { timeoutMs: 10, apiKey: "", secretKey: "", baseUrl: "https://sandbox-api.iyzipay.com" },
      { iyzicoFactory: vi.fn() },
    );

    await expect(service.process(checkoutToken)).rejects.toBeInstanceOf(
      IyzicoCheckoutCallbackError,
    );
    await expect(service.process(checkoutToken)).rejects.toMatchObject({
      code: "CALLBACK_NOT_CONFIGURED",
      httpStatus: 503,
    });
    expect(dbMocks.getPaymentByIyzicoCheckoutToken).not.toHaveBeenCalled();
  });
});
