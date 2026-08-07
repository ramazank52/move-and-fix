import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import {
  rateLimiters,
  requestIdMiddleware,
  csrfProtection,
  securityAuditLog,
  corsOptions,
} from "./security";
import { setupSwaggerDocs } from "./swagger";
import { healthChecker, healthCheckMiddleware } from "./health";
import { SECURITY_HEADERS, CORS_CONFIG, BODY_PARSER_CONFIG } from "./config";
import compression from "compression";
import type { Request, Response, NextFunction } from "express";

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

  // ── Security Headers (Issue #18: CSP + Security Headers) ──
  app.use((req, res, next) => {
    res.header("X-Content-Type-Options", SECURITY_HEADERS.xContentTypeOptions);
    res.header("X-Frame-Options", SECURITY_HEADERS.xFrameOptions);
    res.header("X-XSS-Protection", SECURITY_HEADERS.xXSSProtection);
    res.header("Referrer-Policy", SECURITY_HEADERS.referrerPolicy);
    res.header("Permissions-Policy", SECURITY_HEADERS.permissionsPolicy);
    res.header("Content-Security-Policy", SECURITY_HEADERS.contentSecurityPolicy);
    next();
  });

  // ── Request ID ──
  app.use(requestIdMiddleware);

  // ── CORS ──
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const originWhitelist = allowedOrigins.length > 0 ? allowedOrigins : CORS_CONFIG.defaultOrigins;

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && originWhitelist.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", CORS_CONFIG.allowedMethods);
    res.header("Access-Control-Allow-Headers", CORS_CONFIG.allowedHeaders);
    res.header("Access-Control-Allow-Credentials", String(CORS_CONFIG.allowCredentials));

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // ── Response Compression (Issue #23) ──
  app.use(compression());

  // ── General Rate Limiting ──
  app.use(rateLimiters.general);

  app.use(express.json({ limit: BODY_PARSER_CONFIG.jsonLimit }));
  app.use(express.urlencoded({ limit: BODY_PARSER_CONFIG.urlencodedLimit, extended: true }));

  // ── CSRF Protection for state-changing routes ──
  // Cookie-based auth (web) için CSRF token doğrulaması.
  // Bearer token (mobil) istekleri muaf tutulur.
  const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Sadece state-changing metodlar için
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      return next();
    }
    // Bearer token ile gelen mobil istekler muaf
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      return next();
    }
    // OAuth callback ve session establishment muaf
    const exemptPaths = ["/api/oauth/callback", "/api/oauth/mobile", "/api/auth/session", "/api/auth/logout"];
    if (exemptPaths.includes(req.path)) {
      return next();
    }
    // tRPC istekleri için CSRF token header'ı kontrol et
    if (req.path.startsWith("/api/trpc")) {
      const csrfToken = req.headers["x-csrf-token"] as string | undefined;
      const sessionCookie = req.cookies?.["app_session"];
      if (sessionCookie && !csrfToken) {
        // Cookie-based tRPC isteği için CSRF token gerekli
        res.status(403).json({ error: "CSRF token required" });
        return;
      }
      if (sessionCookie && csrfToken) {
        if (!csrfProtection.verifyToken(sessionCookie, csrfToken)) {
          res.status(403).json({ error: "Invalid CSRF token" });
          return;
        }
      }
    }
    next();
  };
  app.use(csrfMiddleware);

  // ── Auth Rate Limiting ──
  app.use("/api/oauth/callback", rateLimiters.login);
  app.use("/api/oauth/mobile", rateLimiters.login);
  app.use("/api/auth/session", rateLimiters.login);

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ── Health Checks ──
  app.use("/api/health/detailed", healthCheckMiddleware(healthChecker));

  // ── Swagger/OpenAPI Documentation ──
  setupSwaggerDocs(app);

  // ── CSRF Token Endpoint ──
  app.get("/api/csrf-token", async (req: Request, res: Response) => {
    try {
      const sessionCookie = req.cookies?.["app_session"];
      if (!sessionCookie) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const token = csrfProtection.generateToken(sessionCookie);
      res.json({ token });
    } catch {
      res.status(500).json({ error: "Failed to generate CSRF token" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

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
