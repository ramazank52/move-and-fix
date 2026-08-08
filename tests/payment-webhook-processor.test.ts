import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  claimPaymentWebhookEvent: vi.fn(),
  completePaymentWebhookEvent: vi.fn(),
  resolvePaymentForGatewayWebhook: vi.fn(),
  transitionPaymentFromVerifiedWebhook: vi.fn(),
}));

vi.mock("../server/db", () => dbMocks);

import {
  PaymentWebhookProcessingError,
  processVerifiedPaymentWebhook,
} from "../server/payments/PaymentWebhookProcessor";

const payment = {
  id: 42,
  requestId: 100,
  userId: 7,
  amount: "125.00",
  currency: "TRY",
  status: "pending",
  gatewayProvider: "stripe",
  gatewayPaymentId: "pi_123",
};

function stripePayload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "evt_123",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_123",
        amount_received: 12_500,
        currency: "try",
        metadata: { internalPaymentId: "42" },
      },
    },
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.claimPaymentWebhookEvent.mockResolvedValue({
    claimed: true,
    duplicated: false,
    event: { status: "processing" },
  });
  dbMocks.resolvePaymentForGatewayWebhook.mockResolvedValue(payment);
  dbMocks.transitionPaymentFromVerifiedWebhook.mockResolvedValue({
    duplicated: false,
    payment: { ...payment, status: "held" },
  });
  dbMocks.completePaymentWebhookEvent.mockResolvedValue({ success: true });
});

describe("payment webhook processor", () => {
  it("Stripe başarılı ödemesini tutar ve para birimini doğrulayıp escrow held durumuna taşır", async () => {
    const result = await processVerifiedPaymentWebhook("stripe", stripePayload());

    expect(dbMocks.claimPaymentWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "stripe", eventId: "evt_123" }),
    );
    expect(dbMocks.resolvePaymentForGatewayWebhook).toHaveBeenCalledWith({
      provider: "stripe",
      gatewayPaymentId: "pi_123",
      internalPaymentId: 42,
    });
    expect(dbMocks.transitionPaymentFromVerifiedWebhook).toHaveBeenCalledWith({
      paymentId: 42,
      nextStatus: "held",
    });
    expect(dbMocks.completePaymentWebhookEvent).toHaveBeenCalledWith({
      provider: "stripe",
      eventId: "evt_123",
      status: "processed",
    });
    expect(result).toMatchObject({ received: true, duplicated: false, paymentStatus: "held" });
  });

  it("işlenmiş aynı event tekrar geldiğinde ödeme geçişini ikinci kez çalıştırmaz", async () => {
    dbMocks.claimPaymentWebhookEvent.mockResolvedValue({
      claimed: false,
      duplicated: true,
      event: { status: "processed" },
    });

    const result = await processVerifiedPaymentWebhook("stripe", stripePayload());

    expect(result).toMatchObject({ received: true, duplicated: true, status: "processed" });
    expect(dbMocks.resolvePaymentForGatewayWebhook).not.toHaveBeenCalled();
    expect(dbMocks.transitionPaymentFromVerifiedWebhook).not.toHaveBeenCalled();
  });

  it("aynı event kimliği farklı payload hash ile kullanılırsa replay’i reddeder", async () => {
    dbMocks.claimPaymentWebhookEvent.mockRejectedValue(
      new Error("PAYMENT_WEBHOOK_PAYLOAD_MISMATCH"),
    );

    await expect(processVerifiedPaymentWebhook("stripe", stripePayload())).rejects.toMatchObject({
      code: "PAYLOAD_MISMATCH",
      httpStatus: 409,
    });
    expect(dbMocks.resolvePaymentForGatewayWebhook).not.toHaveBeenCalled();
  });

  it("gateway tutarı server-derived ödeme tutarıyla eşleşmezse işlemi fail-closed reddeder", async () => {
    const payload = JSON.parse(stripePayload()) as {
      data: { object: { amount_received: number } };
    };
    payload.data.object.amount_received = 1;

    await expect(
      processVerifiedPaymentWebhook("stripe", JSON.stringify(payload)),
    ).rejects.toBeInstanceOf(PaymentWebhookProcessingError);
    await expect(
      processVerifiedPaymentWebhook("stripe", JSON.stringify(payload)),
    ).rejects.toMatchObject({ code: "PAYMENT_MISMATCH", httpStatus: 409 });

    expect(dbMocks.transitionPaymentFromVerifiedWebhook).not.toHaveBeenCalled();
    expect(dbMocks.completePaymentWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
  });

  it("iyzico başarılı eventini kalıcı referans koduyla claim eder", async () => {
    dbMocks.resolvePaymentForGatewayWebhook.mockResolvedValue({
      ...payment,
      gatewayProvider: "iyzico",
      gatewayPaymentId: "iyzi_payment_1",
    });
    const payload = JSON.stringify({
      iyziEventType: "CHECKOUT_FORM_AUTH",
      paymentId: "iyzi_payment_1",
      paymentConversationId: "movefix:42",
      status: "SUCCESS",
      iyziReferenceCode: "iyzi_ref_1",
      paidPrice: "125.00",
      currency: "TRY",
    });

    await processVerifiedPaymentWebhook("iyzico", payload);

    expect(dbMocks.claimPaymentWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "iyzico", eventId: "iyzi_ref_1" }),
    );
    expect(dbMocks.transitionPaymentFromVerifiedWebhook).toHaveBeenCalledWith({
      paymentId: 42,
      nextStatus: "held",
    });
  });

  it("gateway başarısızlık eventini yalnızca izinli refund geçişine dönüştürür", async () => {
    const parsed = JSON.parse(stripePayload()) as {
      type: string;
      data: { object: { amount_received: number } };
    };
    parsed.type = "payment_intent.payment_failed";
    dbMocks.transitionPaymentFromVerifiedWebhook.mockResolvedValue({
      duplicated: false,
      payment: { ...payment, status: "refunded" },
    });

    await processVerifiedPaymentWebhook("stripe", JSON.stringify(parsed));

    expect(dbMocks.transitionPaymentFromVerifiedWebhook).toHaveBeenCalledWith({
      paymentId: 42,
      nextStatus: "refunded",
    });
  });

  it("durum değiştirmeyen sağlayıcı eventlerini güvenle processed olarak işaretler", async () => {
    const parsed = JSON.parse(stripePayload()) as { type: string };
    parsed.type = "payment_intent.processing";

    const result = await processVerifiedPaymentWebhook("stripe", JSON.stringify(parsed));

    expect(result).toMatchObject({ received: true, ignored: true });
    expect(dbMocks.resolvePaymentForGatewayWebhook).not.toHaveBeenCalled();
    expect(dbMocks.transitionPaymentFromVerifiedWebhook).not.toHaveBeenCalled();
    expect(dbMocks.completePaymentWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processed" }),
    );
  });
});
