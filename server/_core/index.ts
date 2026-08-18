import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { randomUUID, timingSafeEqual } from "crypto";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerOwnerRestRoutes } from "./ownerRestAdapter";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { setupSwaggerDocs } from "./swagger";
import { healthChecker, healthCheckMiddleware } from "./health";
import {
  CSRF_SESSION_COOKIE_NAME,
  CSRFProtection,
  getCsrfSessionId,
  isAllowedCorsOrigin,
  isTrustedHttpsRequest,
  rateLimiters,
  requestIdMiddleware,
  requiresCsrfProtection,
} from "./security";
import { registerPaymentWebhookRoutes } from "../payments/registerPaymentWebhookRoutes";
import { ENV } from "./env";
import { getCookieValue, getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "../../shared/const";
import { createCompletionAutoReleaseResponse } from "./completion-auto-release-response";
import * as db from "../db";
import { runFinancialReconciliation } from "../payments/FinancialReconciliationService";
import { errorMiddleware, logger, requestLoggingMiddleware } from "./errorHandler";
import { verifyMediaScannerCallbackSignature } from "../security/MediaScannerCallbackSecurity";
import { dispatchOneMediaScannerJob } from "../security/MediaScannerDispatchService";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export async function createApp() {
  const app = express();
  // Production TLS terminates at the loopback reverse proxy. Express must only
  // trust that local proxy before accepting its X-Forwarded-Proto signal.
  app.set("trust proxy", "loopback");

  // Request ID middleware — every request gets a unique ID for tracing
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware(logger));

  // Response compression
  app.use(compression());

  // Same-origin requests are allowed. Every cross-origin browser caller must
  // be configured explicitly, apart from the development-only hosted preview.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const requestHost = req.get("host");
    let originHost: string | undefined;
    try {
      originHost = origin ? new URL(origin).host : undefined;
    } catch {
      originHost = undefined;
    }
    const isSameOrigin = Boolean(originHost && requestHost && originHost === requestHost);

    if (origin && !isSameOrigin && !isAllowedCorsOrigin(origin)) {
      res.status(403).json({ error: "Origin is not allowed" });
      return;
    }

    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token",
    );

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Security headers
  app.use((req, res, next) => {
    res.header("X-Content-Type-Options", "nosniff");
    res.header("X-Frame-Options", "DENY");
    res.header("X-XSS-Protection", "1; mode=block");
    res.header("Referrer-Policy", "strict-origin-when-cross-origin");
    res.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
    );
    // HSTS must never be advertised from HTTP or development responses. The
    // production reverse proxy is trusted only on loopback. Forwarded HTTPS
    // metadata from any other peer cannot cause HSTS to be emitted.
    if (process.env.NODE_ENV === "production" && isTrustedHttpsRequest(req)) {
      res.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }
    next();
  });

  // Rate limiting — general API
  app.use("/api/", rateLimiters.general);

  // Rate limiting — auth endpoints (stricter)
  app.use("/api/auth/", rateLimiters.login);
  app.use("/api/owner/login", rateLimiters.login);

  // Payment webhooks must receive the unmodified raw body before global JSON parsing.
  registerPaymentWebhookRoutes(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Scanner decisions are received from an external adapter, not from a user
  // session. The endpoint remains unavailable until its dedicated signature
  // secret is configured; a missing secret never creates a synthetic clean result.
  app.post("/api/webhooks/media-scanner", async (req, res) => {
    const configuredSecret = ENV.mediaScannerCallbackSecret;
    if (!configuredSecret) {
      res.status(503).json({ error: "MEDIA_SCANNER_NOT_CONFIGURED" });
      return;
    }
    const body = req.body ?? {};
    const payload = {
      mediaClass: body.mediaClass,
      mediaId: body.mediaId,
      sha256: body.sha256,
      outcome: body.outcome,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    };
    const validClass = ["provider_document", "service_request_media", "voice_message", "move_ai_draft_media"].includes(payload.mediaClass);
    const validOutcome = payload.outcome === "clean" || payload.outcome === "blocked";
    const validId = typeof payload.mediaId === "string" && payload.mediaId.length > 0 && payload.mediaId.length <= 96;
    const validHash = typeof payload.sha256 === "string" && /^[a-f0-9]{64}$/i.test(payload.sha256);
    const validReason = payload.reason === undefined || payload.reason.length <= 500;
    if (!validClass || !validOutcome || !validId || !validHash || !validReason) {
      res.status(400).json({ error: "INVALID_MEDIA_SCANNER_CALLBACK" });
      return;
    }
    const signature = typeof req.header("x-media-scanner-signature") === "string"
      ? req.header("x-media-scanner-signature")
      : undefined;
    if (!verifyMediaScannerCallbackSignature({ secret: configuredSecret, signature, payload })) {
      res.status(401).json({ error: "INVALID_MEDIA_SCANNER_SIGNATURE" });
      return;
    }
    try {
      const result = await db.applyMediaScannerOutcome({
        mediaClass: payload.mediaClass,
        mediaId: payload.mediaId,
        sha256: payload.sha256,
        outcome: payload.outcome,
        reason: payload.reason,
      });
      if (!result.accepted) {
        res.status(409).json({ error: result.reason });
        return;
      }
      res.status(200).json({ status: result.idempotent ? "idempotent" : "recorded" });
    } catch (error) {
      console.error("[media-scanner] callback processing failed", {
        requestId: req.header("x-request-id") ?? "unknown",
        error,
      });
      res.status(500).json({ error: "MEDIA_SCANNER_CALLBACK_FAILED" });
    }
  });

  // This scheduler-only bridge drains one durable outbox item. It is unavailable
  // without the scanner trust secret and never creates a clean result: the
  // scanner's separately signed callback remains authoritative.
  app.post("/api/scheduled/media-scanner-dispatch", async (req, res) => {
    const configuredSecret = ENV.mediaScannerCallbackSecret;
    const expectedAuthorization = configuredSecret ? `Bearer ${configuredSecret}` : "";
    const actualAuthorization = String(req.headers.authorization ?? "");
    const hasAuthorizationMatch = expectedAuthorization.length > 0
      && actualAuthorization.length === expectedAuthorization.length
      && timingSafeEqual(Buffer.from(actualAuthorization), Buffer.from(expectedAuthorization));
    if (!hasAuthorizationMatch) {
      res.status(configuredSecret ? 401 : 503).json({
        error: configuredSecret ? "Unauthorized scheduled callback" : "MEDIA_SCANNER_NOT_CONFIGURED",
      });
      return;
    }
    try {
      const result = await dispatchOneMediaScannerJob();
      res.status(result.status === "not_configured" ? 503 : 200).json(result);
    } catch (error) {
      console.error("[media-scanner] dispatch failed", {
        requestId: req.header("x-request-id") ?? "unknown",
        error,
      });
      res.status(500).json({ error: "MEDIA_SCANNER_DISPATCH_FAILED" });
    }
  });

  // The database transition is idempotent; this endpoint is still protected so
  // only the configured scheduler can start automatic escrow resolution.
  app.post("/api/scheduled/completion-auto-release", async (req, res) => {
    const configuredSecret = ENV.completionAutoReleaseSecret;
    const expectedAuthorization = configuredSecret ? `Bearer ${configuredSecret}` : "";
    const actualAuthorization = String(req.headers.authorization ?? "");
    const callbackToken = String(req.body?.token ?? "");
    const hasBearerMatch =
      expectedAuthorization.length > 0 &&
      actualAuthorization.length === expectedAuthorization.length &&
      timingSafeEqual(Buffer.from(actualAuthorization), Buffer.from(expectedAuthorization));
    const hasPayloadMatch =
      configuredSecret.length > 0 &&
      callbackToken.length === configuredSecret.length &&
      timingSafeEqual(Buffer.from(callbackToken), Buffer.from(configuredSecret));
    const matches = hasBearerMatch || hasPayloadMatch;
    if (!matches) {
      res.status(configuredSecret ? 401 : 503).json({
        error: configuredSecret ? "Unauthorized scheduled callback" : "Scheduled callback is not configured",
      });
      return;
    }

    const requestedLimit = Number(req.body?.limit ?? 25);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
      res.status(400).json({ error: "limit must be an integer between 1 and 100" });
      return;
    }

    try {
      const results = await db.autoReleaseDueCompletionProofs(new Date(), requestedLimit);
      const response = createCompletionAutoReleaseResponse(results);
      console.info("[completion-auto-release] processed", {
        requestId: req.header("x-request-id") ?? "unknown",
        ...response.summary,
      });
      res.status(200).json(response);
    } catch (error) {
      console.error("[completion-auto-release] failed", {
        requestId: req.header("x-request-id") ?? "unknown",
        error,
      });
      res.status(500).json({ error: "Completion auto-release processing failed" });
    }
  });

  // The scheduled reconcilier is deliberately fail-closed: a missing secret or
  // gateway credential cannot be reported as a clean financial result.
  app.post("/api/scheduled/financial-reconciliation", async (req, res) => {
    const configuredSecret = ENV.financialReconciliationSecret;
    const expectedAuthorization = configuredSecret ? `Bearer ${configuredSecret}` : "";
    const actualAuthorization = String(req.headers.authorization ?? "");
    const callbackToken = String(req.body?.token ?? "");
    const hasBearerMatch =
      expectedAuthorization.length > 0 &&
      actualAuthorization.length === expectedAuthorization.length &&
      timingSafeEqual(Buffer.from(actualAuthorization), Buffer.from(expectedAuthorization));
    const hasPayloadMatch =
      configuredSecret.length > 0 &&
      callbackToken.length === configuredSecret.length &&
      timingSafeEqual(Buffer.from(callbackToken), Buffer.from(configuredSecret));
    if (!hasBearerMatch && !hasPayloadMatch) {
      res.status(configuredSecret ? 401 : 503).json({
        error: configuredSecret ? "Unauthorized scheduled callback" : "Financial reconciliation is not configured",
      });
      return;
    }

    const provider = req.body?.provider;
    if (provider !== "stripe" && provider !== "iyzico") {
      res.status(400).json({ error: "provider must be stripe or iyzico" });
      return;
    }

    try {
      const result = await runFinancialReconciliation(provider);
      console.info("[financial-reconciliation] completed", {
        requestId: req.header("x-request-id") ?? "unknown",
        ...result,
      });
      res.status(200).json(result);
    } catch (error) {
      console.error("[financial-reconciliation] failed", {
        requestId: req.header("x-request-id") ?? "unknown",
        provider,
        error,
      });
      res.status(500).json({ error: "Financial reconciliation failed" });
    }
  });

  // Retention uses a logical-first purge. Content is hidden before an external
  // storage eraser is asked to remove bytes, and no physical erase is claimed
  // without a confirmed storage-provider acknowledgement.
  app.post("/api/scheduled/document-retention", async (req, res) => {
    const configuredSecret = ENV.documentRetentionSecret;
    const expectedAuthorization = configuredSecret ? `Bearer ${configuredSecret}` : "";
    const actualAuthorization = String(req.headers.authorization ?? "");
    const callbackToken = String(req.body?.token ?? "");
    const hasBearerMatch =
      expectedAuthorization.length > 0 &&
      actualAuthorization.length === expectedAuthorization.length &&
      timingSafeEqual(Buffer.from(actualAuthorization), Buffer.from(expectedAuthorization));
    const hasPayloadMatch =
      configuredSecret.length > 0 &&
      callbackToken.length === configuredSecret.length &&
      timingSafeEqual(Buffer.from(callbackToken), Buffer.from(configuredSecret));
    if (!hasBearerMatch && !hasPayloadMatch) {
      res.status(configuredSecret ? 401 : 503).json({
        error: configuredSecret ? "Unauthorized scheduled callback" : "Document retention is not configured",
      });
      return;
    }

    const requestedLimit = Number(req.body?.limit ?? 100);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 500) {
      res.status(400).json({ error: "limit must be an integer between 1 and 500" });
      return;
    }

    try {
      const dueDocuments = await db.listDueProviderDocumentRetention(new Date(), requestedLimit);
      let logicallyPurged = 0;
      for (const document of dueDocuments) {
        if (await db.logicalPurgeProviderDocument({ id: document.id })) logicallyPurged += 1;
      }
      console.info("[document-retention] processed", {
        requestId: req.header("x-request-id") ?? "unknown",
        dueDocuments: dueDocuments.length,
        logicallyPurged,
        storageErasePending: logicallyPurged,
      });
      res.status(200).json({ dueDocuments: dueDocuments.length, logicallyPurged, storageErasePending: logicallyPurged });
    } catch (error) {
      console.error("[document-retention] failed", { requestId: req.header("x-request-id") ?? "unknown", error });
      res.status(500).json({ error: "Document retention processing failed" });
    }
  });

  // A due credential is never treated as implicitly verified. This callback
  // removes only the credential-linked capability scopes until a reviewer
  // records a new decision; it never auto-enables capability access.
  app.post("/api/scheduled/compliance-reverification", async (req, res) => {
    const configuredSecret = ENV.complianceReverificationSecret;
    const expectedAuthorization = configuredSecret ? `Bearer ${configuredSecret}` : "";
    const actualAuthorization = String(req.headers.authorization ?? "");
    const callbackToken = String(req.body?.token ?? "");
    const hasBearerMatch =
      expectedAuthorization.length > 0 &&
      actualAuthorization.length === expectedAuthorization.length &&
      timingSafeEqual(Buffer.from(actualAuthorization), Buffer.from(expectedAuthorization));
    const hasPayloadMatch =
      configuredSecret.length > 0 &&
      callbackToken.length === configuredSecret.length &&
      timingSafeEqual(Buffer.from(callbackToken), Buffer.from(configuredSecret));
    if (!hasBearerMatch && !hasPayloadMatch) {
      res.status(configuredSecret ? 401 : 503).json({
        error: configuredSecret ? "Unauthorized scheduled callback" : "Compliance reverification is not configured",
      });
      return;
    }

    const requestedLimit = Number(req.body?.limit ?? 100);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 500) {
      res.status(400).json({ error: "limit must be an integer between 1 and 500" });
      return;
    }

    try {
      const dueCredentials = await db.listDueProviderCredentials(new Date());
      const selected = dueCredentials.slice(0, requestedLimit);
      for (const credential of selected) {
        await db.blockCapabilitiesPendingCredentialReverification({
          providerId: credential.providerId,
          jurisdictionId: credential.jurisdictionId,
          credentialId: credential.id,
        });
      }
      console.info("[compliance-reverification] processed", {
        requestId: req.header("x-request-id") ?? "unknown",
        dueCredentials: dueCredentials.length,
        blockedCapabilityScopes: selected.length,
      });
      res.status(200).json({ dueCredentials: dueCredentials.length, blockedCapabilityScopes: selected.length });
    } catch (error) {
      console.error("[compliance-reverification] failed", {
        requestId: req.header("x-request-id") ?? "unknown",
        error,
      });
      res.status(500).json({ error: "Compliance reverification processing failed" });
    }
  });

  // CSRF protection — token endpoint (for cookie-based web clients like MoveOS)
  const csrf = new CSRFProtection();
  app.get("/api/csrf-token", (req, res) => {
    let sessionId = getCsrfSessionId(req);
    if (!sessionId) {
      sessionId = randomUUID();
      res.cookie(CSRF_SESSION_COOKIE_NAME, sessionId, {
        ...getSessionCookieOptions(req),
        maxAge: 60 * 60 * 1000,
      });
    }
    const token = csrf.generateToken(sessionId);
    res.setHeader("Cache-Control", "no-store");
    res.json({ token });
  });

  // CSRF applies to every cookie-authenticated state change, including tRPC
  // and MoveOS. Signed raw-body webhooks and bearer-token native calls use
  // their own verification model and are intentionally excluded.
  app.use((req, res, next) => {
    if (requiresCsrfProtection({
      method: req.method,
      path: req.path,
      authorization: typeof req.headers.authorization === "string" ? req.headers.authorization : undefined,
      hasCookieSession: Boolean(getCookieValue(req, COOKIE_NAME)),
    })) {
      const sessionId = getCsrfSessionId(req);
      const csrfToken = req.headers["x-csrf-token"] as string;
      if (!sessionId || !csrfToken || !csrf.verifyToken(sessionId, csrfToken)) {
        res.status(403).json({ error: "Invalid CSRF token" });
        return;
      }
    }
    next();
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerOwnerRestRoutes(app);
  // MoveOS, mobil uygulamayla aynı backend, oturum ve API sözleşmesini kullanan
  // ayrı bir web arayüzüdür. Statik dosyalar yalnız arayüzü sunar; tüm veri
  // çağrıları ortak, yönetici-korumalı /api/owner/* yollarından yapılır.
  app.use("/moveos", express.static(path.resolve(process.cwd(), "moveos"), { index: "index.html" }));

  // Health check endpoints
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });
  app.get("/api/health/detailed", async (_req, res) => {
    try {
      const status = await healthChecker.getHealthStatus();
      res.json(status);
    } catch (err: unknown) {
      res.status(503).json({ status: "unhealthy", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // API documentation (Swagger/OpenAPI)
  setupSwaggerDocs(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  app.use(errorMiddleware(logger));

  return app;
}

async function startServer() {
  const app = await createApp();
  const server = createServer(app);
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

if (process.env.VITEST !== "true") {
  startServer().catch(console.error);
}
