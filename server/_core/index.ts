import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { timingSafeEqual } from "crypto";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerOwnerRestRoutes } from "./ownerRestAdapter";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { setupSwaggerDocs } from "./swagger";
import { healthChecker, healthCheckMiddleware } from "./health";
import { rateLimiters, requestIdMiddleware, CSRFProtection } from "./security";
import { registerPaymentWebhookRoutes } from "../payments/registerPaymentWebhookRoutes";
import { ENV } from "./env";
import { createCompletionAutoReleaseResponse } from "./completion-auto-release-response";
import * as db from "../db";

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

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Request ID middleware — every request gets a unique ID for tracing
  app.use(requestIdMiddleware);

  // Response compression
  app.use(compression());

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
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

  // CSRF protection — token endpoint (for cookie-based web clients like MoveOS)
  const csrf = new CSRFProtection();
  app.get("/api/csrf-token", (req, res) => {
    // Use a session-based ID from cookie or generate a temporary one
    const sessionId = (req as any).id || req.socket.remoteAddress || "anonymous";
    const token = csrf.generateToken(sessionId);
    res.json({ token });
  });

  // CSRF protection — state-changing routes (cookie-based requests only, not Bearer/mobile)
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    const isBearerAuth = authHeader && authHeader.startsWith("Bearer ");
    const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
    const isApiRoute = req.path.startsWith("/api/");
    const isTrpc = req.path.startsWith("/api/trpc/");
    const isOAuth = req.path.startsWith("/api/auth/");
    const isOwner = req.path.startsWith("/api/owner/");

    if (isStateChanging && isApiRoute && !isBearerAuth && !isTrpc && !isOAuth && !isOwner) {
      const sessionId = (req as any).id || req.socket.remoteAddress || "anonymous";
      const csrfToken = req.headers["x-csrf-token"] as string;
      if (!csrfToken || !csrf.verifyToken(sessionId, csrfToken)) {
        res.status(403).json({ error: "Invalid CSRF token" });
        return;
      }
    }
    next();
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerOwnerRestRoutes(app);

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

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
