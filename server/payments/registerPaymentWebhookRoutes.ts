import express, { type Application, type NextFunction, type Request, type Response } from "express";

import { ENV } from "../_core/env";
import {
  type RawBodyRequest,
  WebhookVerificationService,
  webhookVerificationMiddleware,
} from "../_core/webhookVerification";
import {
  PaymentWebhookProcessingError,
  processVerifiedPaymentWebhook,
  type PaymentWebhookProvider,
} from "./PaymentWebhookProcessor";
import {
  IyzicoCheckoutCallbackError,
  iyzicoCheckoutCallbackService,
} from "./IyzicoCheckoutCallbackService";

const verificationService = new WebhookVerificationService({
  ...(ENV.iyzicoWebhookSecret
    ? { iyzico: { secretKey: ENV.iyzicoWebhookSecret } }
    : {}),
  ...(ENV.stripeWebhookSecret
    ? { stripe: { signingSecret: ENV.stripeWebhookSecret } }
    : {}),
});

function captureRawBody(req: Request, res: Response, next: NextFunction) {
  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: "Webhook raw body is required" });
    return;
  }
  (req as RawBodyRequest).rawBody = req.body;
  next();
}

function webhookHandler(provider: PaymentWebhookProvider) {
  return async (req: Request, res: Response) => {
    const rawBody = (req as RawBodyRequest).rawBody;
    if (!rawBody) {
      res.status(400).json({ error: "Webhook raw body is required" });
      return;
    }

    try {
      const result = await processVerifiedPaymentWebhook(provider, rawBody.toString("utf8"));
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof PaymentWebhookProcessingError) {
        res.status(error.httpStatus).json({ error: error.code });
        return;
      }
      console.error(`[payment-webhook] ${provider} processing failed`, {
        requestId: (req as Request & { id?: string }).id,
        error: error instanceof Error ? error.message : "unknown",
      });
      res.status(500).json({ error: "PROCESSING_FAILED" });
    }
  };
}

export function registerPaymentWebhookRoutes(app: Application) {
  const rawJson = express.raw({ type: "application/json", limit: "1mb" });

  app.post(
    "/api/payment/webhooks/stripe",
    rawJson,
    captureRawBody,
    webhookVerificationMiddleware(verificationService, "stripe"),
    webhookHandler("stripe"),
  );

  app.post(
    "/api/payment/webhooks/iyzico",
    rawJson,
    captureRawBody,
    webhookVerificationMiddleware(verificationService, "iyzico"),
    webhookHandler("iyzico"),
  );

  app.post(
    "/api/payment/webhooks/iyzico/callback",
    express.urlencoded({ extended: false, limit: "32kb" }),
    express.json({ limit: "32kb" }),
    async (req: Request, res: Response) => {
      const body = typeof req.body === "object" && req.body !== null ? req.body : {};
      const token = typeof body.token === "string" ? body.token : "";
      try {
        const result = await iyzicoCheckoutCallbackService.process(token);
        if (ENV.paymentMobileReturnUrl) {
          const returnUrl = new URL(ENV.paymentMobileReturnUrl);
          returnUrl.searchParams.set("status", "success");
          if ("paymentId" in result && typeof result.paymentId === "number") {
            returnUrl.searchParams.set("paymentId", String(result.paymentId));
          }
          res.redirect(303, returnUrl.toString());
          return;
        }
        res.status(200).json(result);
      } catch (error) {
        if (error instanceof IyzicoCheckoutCallbackError) {
          res.status(error.httpStatus).json({ error: error.code });
          return;
        }
        if (error instanceof PaymentWebhookProcessingError) {
          res.status(error.httpStatus).json({ error: error.code });
          return;
        }
        console.error("[payment-callback] iyzico processing failed", {
          requestId: (req as Request & { id?: string }).id,
          error: error instanceof Error ? error.message : "unknown",
        });
        res.status(500).json({ error: "PROCESSING_FAILED" });
      }
    },
  );
}
