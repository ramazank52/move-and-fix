import crypto from "node:crypto";

import * as db from "../db";

export type PaymentWebhookProvider = "iyzico" | "stripe";

type NormalizedPaymentEvent = {
  eventId: string;
  eventType: string;
  gatewayPaymentId: string;
  internalPaymentId?: number;
  amountMinor?: number;
  refundAmountMinor?: number;
  currency?: string;
  nextStatus?: "held" | "refunded";
};

export class PaymentWebhookProcessingError extends Error {
  constructor(
    public readonly code:
      | "INVALID_PAYLOAD"
      | "PAYLOAD_MISMATCH"
      | "PAYMENT_NOT_FOUND"
      | "PAYMENT_MISMATCH"
      | "PROCESSING_FAILED",
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = "PaymentWebhookProcessingError";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PaymentWebhookProcessingError(
      "INVALID_PAYLOAD",
      `Webhook alanı eksik veya geçersiz: ${key}`,
      400,
    );
  }
  return value.trim();
}

function parseInternalPaymentId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return undefined;
  const match = value.trim().match(/^(?:movefix:)?(\d+)$/);
  if (!match) return undefined;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

function parseAmountMinor(value: unknown, alreadyMinor = false): number | undefined {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numberValue) || numberValue < 0) return undefined;
  const minor = alreadyMinor ? numberValue : numberValue * 100;
  return Number.isSafeInteger(Math.round(minor)) ? Math.round(minor) : undefined;
}

function parseStripeEvent(parsed: Record<string, unknown>): NormalizedPaymentEvent {
  const data = asRecord(parsed.data);
  const object = asRecord(data?.object);
  if (!data || !object) {
    throw new PaymentWebhookProcessingError("INVALID_PAYLOAD", "Stripe event nesnesi geçersiz", 400);
  }

  const eventType = requiredString(parsed, "type");
  const metadata = asRecord(object.metadata) ?? {};
  const isRefundEvent = eventType === "charge.refunded" || eventType === "refund.succeeded";
  const paymentIntentReference = typeof object.payment_intent === "string" ? object.payment_intent : undefined;
  const nextStatus =
    eventType === "payment_intent.succeeded"
      ? "held"
      : eventType === "payment_intent.payment_failed" || eventType === "payment_intent.canceled"
        ? "refunded"
        : isRefundEvent
          ? "refunded"
        : undefined;

  return {
    eventId: requiredString(parsed, "id"),
    eventType,
    gatewayPaymentId: paymentIntentReference ?? requiredString(object, "id"),
    internalPaymentId: parseInternalPaymentId(metadata.internalPaymentId),
    amountMinor: parseAmountMinor(
      object.amount_received ?? object.amount ?? object.amount_capturable,
      true,
    ),
    refundAmountMinor: isRefundEvent
      ? parseAmountMinor(object.amount_refunded ?? object.amount, true)
      : undefined,
    currency: typeof object.currency === "string" ? object.currency.toUpperCase() : undefined,
    nextStatus,
  };
}

function parseIyzicoEvent(parsed: Record<string, unknown>): NormalizedPaymentEvent {
  const eventType = requiredString(parsed, "iyziEventType");
  const status = requiredString(parsed, "status").toUpperCase();
  const internalPaymentId = parseInternalPaymentId(parsed.paymentConversationId);
  if (!internalPaymentId) {
    throw new PaymentWebhookProcessingError(
      "INVALID_PAYLOAD",
      "iyzico paymentConversationId geçersiz",
      400,
    );
  }

  return {
    eventId: requiredString(parsed, "iyziReferenceCode"),
    eventType,
    gatewayPaymentId: requiredString(parsed, "paymentId"),
    internalPaymentId,
    amountMinor: parseAmountMinor(parsed.paidPrice ?? parsed.price),
    currency: typeof parsed.currency === "string" ? parsed.currency.toUpperCase() : undefined,
    nextStatus: status === "SUCCESS" ? "held" : status === "FAILURE" ? "refunded" : undefined,
  };
}

function parseEvent(provider: PaymentWebhookProvider, rawPayload: string): NormalizedPaymentEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    throw new PaymentWebhookProcessingError("INVALID_PAYLOAD", "Webhook JSON gövdesi geçersiz", 400);
  }
  const record = asRecord(parsed);
  if (!record) {
    throw new PaymentWebhookProcessingError("INVALID_PAYLOAD", "Webhook gövdesi nesne olmalıdır", 400);
  }
  return provider === "stripe" ? parseStripeEvent(record) : parseIyzicoEvent(record);
}

function assertPaymentMatchesEvent(
  payment: Awaited<ReturnType<typeof db.resolvePaymentForGatewayWebhook>>,
  event: NormalizedPaymentEvent,
) {
  if (!event.nextStatus) return;
  if (event.amountMinor == null || !event.currency) {
    throw new PaymentWebhookProcessingError(
      "PAYMENT_MISMATCH",
      "Ödeme webhook tutarı veya para birimi eksik",
      409,
    );
  }
  const expectedAmountMinor = Math.round(Number(payment.amount) * 100);
  const reportedAmountMinor = event.refundAmountMinor ?? event.amountMinor;
  const amountMatches = event.refundAmountMinor != null
    ? reportedAmountMinor > 0 && reportedAmountMinor <= expectedAmountMinor
    : reportedAmountMinor === expectedAmountMinor;
  if (!amountMatches || event.currency !== "TRY") {
    throw new PaymentWebhookProcessingError(
      "PAYMENT_MISMATCH",
      "Ödeme webhook tutarı veya para birimi eşleşmiyor",
      409,
    );
  }
}

export async function processVerifiedPaymentWebhook(
  provider: PaymentWebhookProvider,
  rawPayload: string,
) {
  const event = parseEvent(provider, rawPayload);
  const payloadHash = crypto.createHash("sha256").update(rawPayload).digest("hex");

  let claim: Awaited<ReturnType<typeof db.claimPaymentWebhookEvent>>;
  try {
    claim = await db.claimPaymentWebhookEvent({
      provider,
      eventId: event.eventId,
      eventType: event.eventType,
      payloadHash,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_WEBHOOK_PAYLOAD_MISMATCH") {
      throw new PaymentWebhookProcessingError(
        "PAYLOAD_MISMATCH",
        "Aynı webhook kimliği farklı gövdeyle tekrar kullanıldı",
        409,
      );
    }
    throw error;
  }

  if (!claim.claimed) {
    return {
      received: true as const,
      duplicated: true as const,
      eventId: event.eventId,
      status: claim.event.status,
    };
  }

  try {
    if (!event.nextStatus) {
      await db.completePaymentWebhookEvent({ provider, eventId: event.eventId, status: "processed" });
      return {
        received: true as const,
        duplicated: claim.duplicated,
        ignored: true as const,
        eventId: event.eventId,
      };
    }

    const payment = await db.resolvePaymentForGatewayWebhook({
      provider,
      gatewayPaymentId: event.gatewayPaymentId,
      internalPaymentId: event.internalPaymentId,
    });
    assertPaymentMatchesEvent(payment, event);
    const partialRefund = event.refundAmountMinor != null && event.refundAmountMinor < Math.round(Number(payment.amount) * 100)
      ? event.refundAmountMinor
      : undefined;
    if (partialRefund != null && partialRefund % 100 !== 0) {
      throw new PaymentWebhookProcessingError(
        "PAYMENT_MISMATCH",
        "Kısmi iade tutarı TRY ana birim sözleşmesiyle eşleşmiyor",
        409,
      );
    }
    const transition = await db.transitionPaymentFromVerifiedWebhook({
      paymentId: payment.id,
      nextStatus: event.nextStatus,
      ...(event.nextStatus === "refunded" ? { gatewayReference: `${provider}:${event.eventId}` } : {}),
      ...(partialRefund != null
        ? { partialRefund: { refundAmount: partialRefund / 100, gatewayReference: `${provider}:${event.eventId}` } }
        : {}),
    });
    await db.completePaymentWebhookEvent({ provider, eventId: event.eventId, status: "processed" });

    return {
      received: true as const,
      duplicated: claim.duplicated || transition.duplicated,
      eventId: event.eventId,
      paymentId: payment.id,
      paymentStatus: transition.payment.status,
    };
  } catch (error) {
    const safeError = error instanceof Error ? error.message : "PAYMENT_WEBHOOK_PROCESSING_FAILED";
    await db.completePaymentWebhookEvent({
      provider,
      eventId: event.eventId,
      status: "failed",
      error: safeError,
    });
    if (error instanceof PaymentWebhookProcessingError) throw error;
    if (safeError === "PAYMENT_NOT_FOUND") {
      throw new PaymentWebhookProcessingError("PAYMENT_NOT_FOUND", "Webhook ödeme kaydı bulunamadı", 404);
    }
    throw new PaymentWebhookProcessingError(
      "PROCESSING_FAILED",
      "Ödeme webhook olayı güvenli biçimde işlenemedi",
      500,
    );
  }
}
