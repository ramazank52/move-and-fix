import { createRequire } from "node:module";
import Stripe from "stripe";

import { ENV } from "../_core/env";

const require = createRequire(import.meta.url);

export type CheckoutProvider = "iyzico" | "stripe";

export class GatewayCheckoutError extends Error {
  constructor(
    public readonly code:
      | "GATEWAY_NOT_CONFIGURED"
      | "GATEWAY_TIMEOUT"
      | "GATEWAY_REJECTED"
      | "GATEWAY_INVALID_RESPONSE"
      | "GATEWAY_INVALID_INPUT",
    message: string,
  ) {
    super(message);
    this.name = "GatewayCheckoutError";
  }
}

export interface CheckoutBuyer {
  id: number;
  name: string;
  email: string;
  gsmNumber?: string;
  identityNumber?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  ipAddress: string;
  registrationDate?: Date | null;
  lastLoginDate?: Date | null;
}

export interface GatewayCheckoutInput {
  provider: CheckoutProvider;
  paymentId: number;
  requestId: number;
  requestTitle: string;
  amount: number;
  currency: "TRY";
  idempotencyKey: string;
  buyer: CheckoutBuyer;
}

export interface GatewayCheckoutResult {
  provider: CheckoutProvider;
  gatewayTransactionId: string;
  status: "requires_action";
  clientSecret?: string;
  paymentPageUrl?: string;
  checkoutToken?: string;
}

interface StripePaymentIntentLike {
  id: string;
  client_secret: string | null;
}

interface StripeClientLike {
  paymentIntents: {
    create(
      params: Record<string, unknown>,
      options: { idempotencyKey: string },
    ): Promise<StripePaymentIntentLike>;
  };
}

interface IyzicoCheckoutResponse {
  status?: string;
  errorMessage?: string;
  token?: string;
  paymentPageUrl?: string;
  conversationId?: string;
}

interface IyzicoClientLike {
  checkoutFormInitialize: {
    create(
      request: Record<string, unknown>,
      callback: (error: unknown, result: IyzicoCheckoutResponse) => void,
    ): void;
  };
}

interface IyzicoConstructor {
  new (config: { apiKey: string; secretKey: string; uri: string }): IyzicoClientLike;
}

export interface GatewayCheckoutConfig {
  timeoutMs: number;
  callbackBaseUrl: string;
  stripeSecretKey: string;
  iyzicoApiKey: string;
  iyzicoSecretKey: string;
  iyzicoBaseUrl: string;
}

interface GatewayCheckoutDependencies {
  stripeFactory?: (secretKey: string) => StripeClientLike;
  iyzicoFactory?: (config: {
    apiKey: string;
    secretKey: string;
    uri: string;
  }) => IyzicoClientLike;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "MoveFix", surname: "Kullanıcısı" };
  if (parts.length === 1) return { name: parts[0], surname: "Kullanıcısı" };
  return { name: parts.slice(0, -1).join(" "), surname: parts.at(-1) ?? "Kullanıcısı" };
}

function iyzicoDate(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString().slice(0, 19).replace("T", " ") : undefined;
}

function assertIyzicoPaymentPageUrl(value: string, configuredBaseUrl: string): string {
  const candidate = new URL(value);
  const provider = new URL(configuredBaseUrl);
  if (candidate.protocol !== "https:" || candidate.hostname !== provider.hostname) {
    throw new GatewayCheckoutError("GATEWAY_INVALID_RESPONSE", "iyzico ödeme yönlendirmesi doğrulanamadı");
  }
  return candidate.toString();
}

function ensurePositiveTryAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10_000_000) {
    throw new GatewayCheckoutError(
      "GATEWAY_INVALID_INPUT",
      "Ödeme tutarı güvenli aralığın dışında",
    );
  }
}

function normalizedBaseUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && ENV.isProduction) return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new GatewayCheckoutError("GATEWAY_TIMEOUT", "Ödeme sağlayıcısı zaman aşımına uğradı"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mapGatewayFailure(error: unknown): never {
  if (error instanceof GatewayCheckoutError) throw error;
  throw new GatewayCheckoutError(
    "GATEWAY_REJECTED",
    "Ödeme sağlayıcısı işlemi başlatamadı",
  );
}

export class GatewayCheckoutService {
  private readonly config: GatewayCheckoutConfig;
  private readonly dependencies: GatewayCheckoutDependencies;

  constructor(
    config: Partial<GatewayCheckoutConfig> = {},
    dependencies: GatewayCheckoutDependencies = {},
  ) {
    this.config = {
      timeoutMs: config.timeoutMs ?? ENV.paymentGatewayTimeoutMs,
      callbackBaseUrl: config.callbackBaseUrl ?? ENV.paymentCallbackBaseUrl,
      stripeSecretKey: config.stripeSecretKey ?? ENV.stripeSecretKey,
      iyzicoApiKey: config.iyzicoApiKey ?? ENV.iyzicoApiKey,
      iyzicoSecretKey: config.iyzicoSecretKey ?? ENV.iyzicoSecretKey,
      iyzicoBaseUrl: config.iyzicoBaseUrl ?? ENV.iyzicoBaseUrl,
    };
    this.dependencies = dependencies;
  }

  isConfigured(provider: CheckoutProvider) {
    if (provider === "stripe") return Boolean(this.config.stripeSecretKey);
    return Boolean(
      this.config.iyzicoApiKey &&
        this.config.iyzicoSecretKey &&
        normalizedBaseUrl(this.config.callbackBaseUrl),
    );
  }

  async initialize(input: GatewayCheckoutInput): Promise<GatewayCheckoutResult> {
    ensurePositiveTryAmount(input.amount);
    if (input.currency !== "TRY") {
      throw new GatewayCheckoutError("GATEWAY_INVALID_INPUT", "Desteklenmeyen para birimi");
    }
    if (!this.isConfigured(input.provider)) {
      throw new GatewayCheckoutError(
        "GATEWAY_NOT_CONFIGURED",
        `${input.provider} ödeme sağlayıcısı yapılandırılmamış`,
      );
    }

    return input.provider === "stripe"
      ? this.initializeStripe(input)
      : this.initializeIyzico(input);
  }

  private async initializeStripe(input: GatewayCheckoutInput): Promise<GatewayCheckoutResult> {
    const factory =
      this.dependencies.stripeFactory ??
      ((secretKey: string) => new Stripe(secretKey) as unknown as StripeClientLike);
    const client = factory(this.config.stripeSecretKey);

    try {
      const intent = await withTimeout(
        client.paymentIntents.create(
          {
            amount: input.amount * 100,
            currency: input.currency.toLowerCase(),
            automatic_payment_methods: { enabled: true },
            description: input.requestTitle.slice(0, 240),
            receipt_email: input.buyer.email,
            metadata: {
              internalPaymentId: String(input.paymentId),
              requestId: String(input.requestId),
              userId: String(input.buyer.id),
            },
          },
          { idempotencyKey: `${input.idempotencyKey}:stripe` },
        ),
        this.config.timeoutMs,
      );

      if (!intent.id || !intent.client_secret) {
        throw new GatewayCheckoutError(
          "GATEWAY_INVALID_RESPONSE",
          "Stripe ödeme oturumu eksik yanıt döndürdü",
        );
      }

      return {
        provider: "stripe",
        gatewayTransactionId: intent.id,
        clientSecret: intent.client_secret,
        status: "requires_action",
      };
    } catch (error) {
      return mapGatewayFailure(error);
    }
  }

  private async initializeIyzico(input: GatewayCheckoutInput): Promise<GatewayCheckoutResult> {
    const callbackBaseUrl = normalizedBaseUrl(this.config.callbackBaseUrl);
    if (!callbackBaseUrl) {
      throw new GatewayCheckoutError(
        "GATEWAY_NOT_CONFIGURED",
        "iyzico callback adresi yapılandırılmamış",
      );
    }
    const requiredBuyerFields = [
      input.buyer.gsmNumber,
      input.buyer.identityNumber,
      input.buyer.address,
      input.buyer.city,
    ];
    if (requiredBuyerFields.some((value) => !value?.trim())) {
      throw new GatewayCheckoutError(
        "GATEWAY_INVALID_INPUT",
        "iyzico için telefon, kimlik ve fatura adresi bilgileri gereklidir",
      );
    }

    const Iyzico = require("iyzipay") as IyzicoConstructor;
    const factory =
      this.dependencies.iyzicoFactory ??
      ((config: { apiKey: string; secretKey: string; uri: string }) => new Iyzico(config));
    const client = factory({
      apiKey: this.config.iyzicoApiKey,
      secretKey: this.config.iyzicoSecretKey,
      uri: this.config.iyzicoBaseUrl,
    });
    const person = splitName(input.buyer.name);
    const amount = input.amount.toFixed(2);
    const address = {
      contactName: input.buyer.name,
      city: input.buyer.city,
      country: "Turkey",
      address: input.buyer.address,
      zipCode: input.buyer.zipCode ?? "34000",
    };

    const request: Record<string, unknown> = {
      locale: "tr",
      conversationId: `movefix:${input.paymentId}`,
      price: amount,
      paidPrice: amount,
      currency: input.currency,
      basketId: `request:${input.requestId}`,
      paymentGroup: "PRODUCT",
      callbackUrl: `${callbackBaseUrl}/api/payment/webhooks/iyzico/callback`,
      enabledInstallments: [1],
      buyer: {
        id: String(input.buyer.id),
        name: person.name,
        surname: person.surname,
        gsmNumber: input.buyer.gsmNumber,
        email: input.buyer.email,
        identityNumber: input.buyer.identityNumber,
        ...(iyzicoDate(input.buyer.lastLoginDate) ? { lastLoginDate: iyzicoDate(input.buyer.lastLoginDate) } : {}),
        ...(iyzicoDate(input.buyer.registrationDate) ? { registrationDate: iyzicoDate(input.buyer.registrationDate) } : {}),
        registrationAddress: input.buyer.address,
        ip: input.buyer.ipAddress,
        city: input.buyer.city,
        country: "Turkey",
        zipCode: input.buyer.zipCode ?? "34000",
      },
      shippingAddress: address,
      billingAddress: address,
      basketItems: [
        {
          id: `service:${input.requestId}`,
          name: input.requestTitle,
          category1: "Profesyonel Hizmet",
          itemType: "VIRTUAL",
          price: amount,
        },
      ],
    };

    try {
      const response = await withTimeout(
        new Promise<IyzicoCheckoutResponse>((resolve, reject) => {
          client.checkoutFormInitialize.create(request, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        }),
        this.config.timeoutMs,
      );

      if (
        response.status !== "success" ||
        !response.token ||
        !response.paymentPageUrl ||
        response.conversationId !== `movefix:${input.paymentId}`
      ) {
        throw new GatewayCheckoutError(
          response.status === "failure" ? "GATEWAY_REJECTED" : "GATEWAY_INVALID_RESPONSE",
          response.errorMessage || "iyzico ödeme oturumu eksik yanıt döndürdü",
        );
      }

      return {
        provider: "iyzico",
        gatewayTransactionId: response.token,
        checkoutToken: response.token,
        paymentPageUrl: assertIyzicoPaymentPageUrl(response.paymentPageUrl, this.config.iyzicoBaseUrl),
        status: "requires_action",
      };
    } catch (error) {
      return mapGatewayFailure(error);
    }
  }
}

export const gatewayCheckoutService = new GatewayCheckoutService();
