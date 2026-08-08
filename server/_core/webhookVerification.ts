/**
 * Payment webhook signature verification.
 *
 * Security invariants:
 * - Stripe is verified against the unmodified raw request body.
 * - iyzico uses X-IYZ-SIGNATURE-V3 and provider-defined ordered fields.
 * - Missing credentials fail closed; no development/mock success path exists.
 * - Durable replay protection is implemented by payment_webhook_events in db.ts.
 */

import crypto from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const STRIPE_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export interface WebhookVerificationConfig {
  iyzico?: {
    secretKey: string;
  };
  stripe?: {
    signingSecret: string;
  };
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  provider?: "iyzico" | "stripe";
}

export interface IyzicoDirectWebhookPayload {
  iyziEventType: string;
  paymentId: string;
  paymentConversationId: string;
  status: string;
  iyziReferenceCode?: string;
}

function safeHexEqual(received: string, expected: string): boolean {
  if (!/^[a-f0-9]+$/i.test(received) || received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(received.toLowerCase(), "utf8"),
    Buffer.from(expected.toLowerCase(), "utf8"),
  );
}

function parseIyzicoDirectPayload(payload: string): IyzicoDirectWebhookPayload | null {
  try {
    const parsed = JSON.parse(payload) as Partial<IyzicoDirectWebhookPayload>;
    const requiredFields: Array<keyof IyzicoDirectWebhookPayload> = [
      "iyziEventType",
      "paymentId",
      "paymentConversationId",
      "status",
    ];

    if (requiredFields.some((field) => typeof parsed[field] !== "string" || !parsed[field])) {
      return null;
    }

    return parsed as IyzicoDirectWebhookPayload;
  } catch {
    return null;
  }
}

export class WebhookVerificationService {
  constructor(private readonly config: WebhookVerificationConfig) {}

  verifyIyzicoSignature(payload: string, signature: string): VerificationResult {
    const secretKey = this.config.iyzico?.secretKey;
    if (!secretKey) {
      return {
        valid: false,
        error: "iyzico webhook secret is not configured",
        provider: "iyzico",
      };
    }

    const body = parseIyzicoDirectPayload(payload);
    if (!body) {
      return {
        valid: false,
        error: "Invalid iyzico direct webhook payload",
        provider: "iyzico",
      };
    }

    // Official V3 direct-format source order:
    // secretKey + iyziEventType + paymentId + paymentConversationId + status
    const source = [
      secretKey,
      body.iyziEventType,
      body.paymentId,
      body.paymentConversationId,
      body.status,
    ].join("");
    const expected = crypto.createHmac("sha256", secretKey).update(source).digest("hex");

    return {
      valid: safeHexEqual(signature, expected),
      provider: "iyzico",
      ...(!safeHexEqual(signature, expected) ? { error: "Invalid iyzico signature" } : {}),
    };
  }

  verifyStripeSignature(payload: string, signatureHeader: string): VerificationResult {
    const signingSecret = this.config.stripe?.signingSecret;
    if (!signingSecret) {
      return {
        valid: false,
        error: "Stripe webhook signing secret is not configured",
        provider: "stripe",
      };
    }

    const parts = signatureHeader.split(",").map((part) => part.trim());
    const timestampValue = parts.find((part) => part.startsWith("t="))?.slice(2);
    const signatures = parts
      .filter((part) => part.startsWith("v1="))
      .map((part) => part.slice(3));
    const timestamp = Number(timestampValue);

    if (!Number.isFinite(timestamp) || signatures.length === 0) {
      return {
        valid: false,
        error: "Invalid Stripe signature header",
        provider: "stripe",
      };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestamp) > STRIPE_TIMESTAMP_TOLERANCE_SECONDS) {
      return {
        valid: false,
        error: "Stripe signature timestamp is outside the allowed tolerance",
        provider: "stripe",
      };
    }

    const expected = crypto
      .createHmac("sha256", signingSecret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    const valid = signatures.some((signature) => safeHexEqual(signature, expected));

    return {
      valid,
      provider: "stripe",
      ...(!valid ? { error: "Invalid Stripe signature" } : {}),
    };
  }

  verify(
    payload: string,
    signature: string,
    provider: "iyzico" | "stripe",
  ): VerificationResult {
    return provider === "iyzico"
      ? this.verifyIyzicoSignature(payload, signature)
      : this.verifyStripeSignature(payload, signature);
  }
}

export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

export function webhookVerificationMiddleware(
  verificationService: WebhookVerificationService,
  provider: "iyzico" | "stripe",
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawRequest = req as RawBodyRequest;
    const headerName = provider === "iyzico" ? "x-iyz-signature-v3" : "stripe-signature";
    const signature = req.header(headerName);

    if (!signature) {
      res.status(401).json({ error: "Missing webhook signature" });
      return;
    }

    if (!rawRequest.rawBody) {
      res.status(400).json({ error: "Webhook raw body is required" });
      return;
    }

    const result = verificationService.verify(
      rawRequest.rawBody.toString("utf8"),
      signature,
      provider,
    );

    if (!result.valid) {
      const misconfigured = result.error?.includes("not configured") ?? false;
      res.status(misconfigured ? 503 : 401).json({
        error: misconfigured ? "Webhook provider is not configured" : "Invalid webhook signature",
      });
      return;
    }

    next();
  };
}

/**
 * @deprecated Replay protection must use the durable payment_webhook_events table.
 * Retained only to avoid breaking older imports while they are migrated.
 */
export class WebhookReplayProtection {
  isProcessed(_webhookId: string): boolean {
    return false;
  }

  markProcessed(_webhookId: string): void {
    // Intentionally empty: in-memory replay state is unsafe in multi-instance deployments.
  }

  cleanup(): void {
    // Durable records are managed by the database retention policy.
  }
}

export const webhookReplayProtection = new WebhookReplayProtection();
