import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";

import { ENV } from "../_core/env";
import * as db from "../db";
import { processVerifiedPaymentWebhook } from "./PaymentWebhookProcessor";

const require = createRequire(import.meta.url);

export class IyzicoCheckoutCallbackError extends Error {
  constructor(
    public readonly code:
      | "CALLBACK_NOT_CONFIGURED"
      | "CALLBACK_INVALID_TOKEN"
      | "CALLBACK_PAYMENT_NOT_FOUND"
      | "CALLBACK_TIMEOUT"
      | "CALLBACK_REJECTED"
      | "CALLBACK_INVALID_RESPONSE"
      | "CALLBACK_SIGNATURE_INVALID"
      | "CALLBACK_PAYMENT_MISMATCH",
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = "IyzicoCheckoutCallbackError";
  }
}

interface IyzicoCheckoutRetrieveResponse {
  status?: string;
  errorMessage?: string;
  paymentStatus?: string;
  paymentId?: string;
  currency?: string;
  basketId?: string;
  conversationId?: string;
  paidPrice?: number | string;
  price?: number | string;
  token?: string;
  signature?: string;
}

interface IyzicoRetrieveClientLike {
  checkoutForm: {
    retrieve(
      request: Record<string, unknown>,
      callback: (error: unknown, result: IyzicoCheckoutRetrieveResponse) => void,
    ): void;
  };
}

interface IyzicoConstructor {
  new (config: { apiKey: string; secretKey: string; uri: string }): IyzicoRetrieveClientLike;
}

type CallbackConfig = {
  timeoutMs: number;
  apiKey: string;
  secretKey: string;
  baseUrl: string;
};

type CallbackDependencies = {
  iyzicoFactory?: (config: {
    apiKey: string;
    secretKey: string;
    uri: string;
  }) => IyzicoRetrieveClientLike;
};

function secureEqualHex(expected: string, actual: string) {
  if (!/^[a-f\d]+$/i.test(actual) || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

function verifyRetrieveSignature(
  response: IyzicoCheckoutRetrieveResponse,
  secretKey: string,
) {
  const fields = [
    response.paymentStatus,
    response.paymentId,
    response.currency,
    response.basketId,
    response.conversationId,
    response.paidPrice,
    response.price,
    response.token,
  ];
  if (fields.some((value) => value == null || String(value).trim() === "") || !response.signature) {
    return false;
  }
  const expected = createHmac("sha256", secretKey)
    .update(fields.map(String).join(":"), "utf8")
    .digest("hex");
  return secureEqualHex(expected, response.signature.trim());
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new IyzicoCheckoutCallbackError("CALLBACK_TIMEOUT", "iyzico yanıtı zaman aşımına uğradı", 504)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class IyzicoCheckoutCallbackService {
  private readonly config: CallbackConfig;
  private readonly dependencies: CallbackDependencies;

  constructor(
    config: Partial<CallbackConfig> = {},
    dependencies: CallbackDependencies = {},
  ) {
    this.config = {
      timeoutMs: config.timeoutMs ?? ENV.paymentGatewayTimeoutMs,
      apiKey: config.apiKey ?? ENV.iyzicoApiKey,
      secretKey: config.secretKey ?? ENV.iyzicoSecretKey,
      baseUrl: config.baseUrl ?? ENV.iyzicoBaseUrl,
    };
    this.dependencies = dependencies;
  }

  async process(checkoutToken: string) {
    const token = checkoutToken.trim();
    if (!token || token.length > 512) {
      throw new IyzicoCheckoutCallbackError(
        "CALLBACK_INVALID_TOKEN",
        "iyzico checkout tokenı geçersiz",
        400,
      );
    }
    if (!this.config.apiKey || !this.config.secretKey) {
      throw new IyzicoCheckoutCallbackError(
        "CALLBACK_NOT_CONFIGURED",
        "iyzico callback doğrulaması yapılandırılmamış",
        503,
      );
    }

    let payment: Awaited<ReturnType<typeof db.getPaymentByIyzicoCheckoutToken>>;
    try {
      payment = await db.getPaymentByIyzicoCheckoutToken(token);
    } catch (error) {
      if (error instanceof Error && error.message === "PAYMENT_NOT_FOUND") {
        throw new IyzicoCheckoutCallbackError(
          "CALLBACK_PAYMENT_NOT_FOUND",
          "Checkout tokenına bağlı ödeme bulunamadı",
          404,
        );
      }
      throw error;
    }

    const Iyzico = require("iyzipay") as IyzicoConstructor;
    const factory =
      this.dependencies.iyzicoFactory ??
      ((config: { apiKey: string; secretKey: string; uri: string }) => new Iyzico(config));
    const client = factory({
      apiKey: this.config.apiKey,
      secretKey: this.config.secretKey,
      uri: this.config.baseUrl,
    });
    const conversationId = `movefix:${payment.id}`;

    const response = await withTimeout(
      new Promise<IyzicoCheckoutRetrieveResponse>((resolve, reject) => {
        client.checkoutForm.retrieve(
          { locale: "tr", conversationId, token },
          (error, result) => (error ? reject(error) : resolve(result)),
        );
      }),
      this.config.timeoutMs,
    ).catch((error: unknown) => {
      if (error instanceof IyzicoCheckoutCallbackError) throw error;
      throw new IyzicoCheckoutCallbackError(
        "CALLBACK_REJECTED",
        "iyzico checkout sonucu alınamadı",
        502,
      );
    });

    if (response.status !== "success") {
      throw new IyzicoCheckoutCallbackError(
        "CALLBACK_REJECTED",
        response.errorMessage || "iyzico checkout sonucu reddedildi",
        502,
      );
    }
    if (!verifyRetrieveSignature(response, this.config.secretKey)) {
      throw new IyzicoCheckoutCallbackError(
        "CALLBACK_SIGNATURE_INVALID",
        "iyzico checkout yanıt imzası doğrulanamadı",
        401,
      );
    }
    if (
      response.token !== token ||
      response.conversationId !== conversationId ||
      response.basketId !== `request:${payment.requestId}` ||
      !response.paymentId ||
      !response.paymentStatus ||
      !response.currency
    ) {
      throw new IyzicoCheckoutCallbackError(
        "CALLBACK_PAYMENT_MISMATCH",
        "iyzico checkout yanıtı ödeme kaydıyla eşleşmiyor",
        409,
      );
    }

    await db.resolvePaymentForGatewayWebhook({
      provider: "iyzico",
      gatewayPaymentId: response.paymentId,
      internalPaymentId: payment.id,
    });

    const callbackFingerprint = createHash("sha256").update(token, "utf8").digest("hex");
    const normalizedEvent = JSON.stringify({
      iyziEventType: "CHECKOUT_FORM_CALLBACK",
      iyziReferenceCode: `checkout:${callbackFingerprint}:${response.paymentStatus.toUpperCase()}`,
      paymentId: response.paymentId,
      paymentConversationId: conversationId,
      status: response.paymentStatus,
      paidPrice: response.paidPrice,
      price: response.price,
      currency: response.currency,
    });
    return processVerifiedPaymentWebhook("iyzico", normalizedEvent);
  }
}

export const iyzicoCheckoutCallbackService = new IyzicoCheckoutCallbackService();
