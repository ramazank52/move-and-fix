/**
 * Owner REST Adapter
 *
 * MoveOS admin panel (Next.js) REST endpoint'lerini backend tRPC owner prosedürlerine köprüler.
 * MoveOS lib/api.ts şu endpoint'leri çağırır:
 *   POST   /api/owner/login
 *   POST   /api/owner/verify-2fa
 *   POST   /api/owner/logout
 *   GET    /api/owner/dashboard
 *   GET    /api/owner/users
 *   GET    /api/owner/users/:userId
 *   PUT    /api/owner/users/:userId
 *   DELETE /api/owner/users/:userId
 *   GET    /api/owner/categories
 *   POST   /api/owner/categories
 *   PUT    /api/owner/categories/:categoryId
 *   DELETE /api/owner/categories/:categoryId
 *   POST   /api/owner/ai-command
 *   GET    /api/owner/wallet
 *   POST   /api/owner/wallet/withdraw
 *   GET    /api/owner/analytics
 *
 * Bu adapter, tRPC owner router'ını çağırıp sonucu REST formatında döndürür.
 * Owner token doğrulaması Bearer token ile yapılır.
 */

import type { Express, Request, Response } from "express";
import { sdk } from "./sdk";
import { ownerRouter } from "./ownerRouter";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { securityAuditLog } from "./security";
import { AuthError, ValidationError } from "./errors";

type OwnerRouter = typeof ownerRouter;
type OwnerOutput = inferRouterOutputs<OwnerRouter>;
type OwnerInput = inferRouterInputs<OwnerRouter>;

/**
 * Owner token'ını doğrula ve kullanıcı bilgisini döndür.
 * MoveOS login'inden alınan mock token'ı kabul eder veya gerçek Manus session token'ı.
 */
async function authenticateOwner(req: Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  // Mock owner token'ı kabul et (MoveOS development için)
  if (token.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvd25lciI")) {
    return true;
  }

  // Gerçek Manus session token'ı dene
  try {
    await sdk.authenticateRequest(req);
    return true;
  } catch {
    return false;
  }
}

/**
 * Owner yetkilendirme middleware'i
 * Mock owner token veya gerçek admin session token kabul eder.
 */
async function requireOwnerAuth(req: Request, res: Response): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Yetkilendirme gerekli", code: "UNAUTHORIZED" });
    return false;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  // Mock owner token'ı kabul et (MoveOS development için)
  if (token.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvd25lciI")) {
    return true;
  }

  // Gerçek session token doğrula ve admin rolü kontrol et
  try {
    const user = await sdk.authenticateRequest(req);
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin yetkisi gerekli", code: "FORBIDDEN" });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ error: "Geçersiz token", code: "INVALID_TOKEN" });
    return false;
  }
}

/**
 * tRPC prosedürünü çağır ve sonucu döndür.
 * Basit bir in-memory caller — gerçek tRPC context olmadan çalışır.
 */
async function callOwnerProcedure<T>(
  req: Request,
  res: Response,
  procedure: "login" | "verify2FA" | "logout" | "dashboard" | "users" | "getUser" | "categories" | "createCategory" | "updateCategory" | "aiCommand" | "wallet" | "withdrawFunds" | "analytics",
  input?: unknown,
): Promise<T> {
  // tRPC router'ı doğrudan çağır — context gerektirmeyen prosedürler için
  // Bu basit yaklaşım, mock veri döndüren prosedürler için yeterlidir.
  const ctx = { req, res, user: { id: 1, openId: "owner", role: "admin", name: null, email: null, loginMethod: null, lastSignedIn: null } as any };
  const caller = ownerRouter.createCaller(ctx);

  // @ts-expect-error — dynamic procedure call
  const result = input !== undefined ? await caller[procedure](input) : await caller[procedure]();
  return result as T;
}

export function registerOwnerRestRoutes(app: Express) {
  // ── Auth ──

  app.post("/api/owner/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email ve şifre gerekli" });
        return;
      }
      const result = await callOwnerProcedure(req, res, "login", { email, password });
      securityAuditLog.log("owner.login", req.ip || "unknown", "success", "owner");
      res.json(result);
    } catch (error) {
      securityAuditLog.log("owner.login", req.ip || "unknown", "failure", undefined, error instanceof Error ? error.message : "Unknown");
      if (error instanceof AuthError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof Error && error.message.includes("Geçersiz")) {
        res.status(401).json({ error: error.message });
      } else {
        // tRPC Zod validation errors come as TRPCError
        const msg = error instanceof Error ? error.message : "Giriş başarısız";
        if (msg.includes("invalid") || msg.includes("expected") || msg.includes("required") || msg.includes("min") || msg.includes("Too small")) {
          res.status(400).json({ error: msg });
        } else {
          res.status(500).json({ error: msg });
        }
      }
    }
  });

  app.post("/api/owner/verify-2fa", async (req: Request, res: Response) => {
    try {
      const { email, otpCode } = req.body;
      if (!email || !otpCode) {
        res.status(400).json({ error: "Email ve OTP kodu gerekli" });
        return;
      }
      const result = await callOwnerProcedure(req, res, "verify2FA", { email, otpCode });
      res.json(result);
    } catch (error) {
      const status = error instanceof Error && error.message.includes("Geçersiz") ? 401 : 500;
      res.status(status).json({ error: error instanceof Error ? error.message : "Doğrulama başarısız" });
    }
  });

  app.post("/api/owner/logout", async (req: Request, res: Response) => {
    res.json({ success: true });
  });

  // ── Dashboard ──

  app.get("/api/owner/dashboard", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    try {
      const result = await callOwnerProcedure(req, res, "dashboard");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Dashboard verileri alınamadı" });
    }
  });

  // ── Users ──

  app.get("/api/owner/users", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    try {
      const filters = {
        role: typeof req.query.role === "string" ? req.query.role : undefined,
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };
      const result = await callOwnerProcedure(req, res, "users", filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Kullanıcılar alınamadı" });
    }
  });

  app.get("/api/owner/users/:userId", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    try {
      const result = await callOwnerProcedure(req, res, "getUser", { userId: req.params.userId });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Kullanıcı alınamadı" });
    }
  });

  app.put("/api/owner/users/:userId", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    // TODO: gerçek DB güncelleme
    res.json({ success: true, userId: req.params.userId, ...req.body });
  });

  app.delete("/api/owner/users/:userId", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    // TODO: gerçek DB silme
    res.json({ success: true, userId: req.params.userId });
  });

  // ── Categories ──

  app.get("/api/owner/categories", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    try {
      const result = await callOwnerProcedure(req, res, "categories");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Kategoriler alınamadı" });
    }
  });

  app.post("/api/owner/categories", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    try {
      const { name, description, commission } = req.body;
      if (!name || !description || commission === undefined) {
        res.status(400).json({ error: "name, description ve commission gerekli" });
        return;
      }
      const result = await callOwnerProcedure(req, res, "createCategory", { name, description, commission });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Kategori oluşturulamadı" });
    }
  });

  app.put("/api/owner/categories/:categoryId", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    try {
      const categoryId = Number(req.params.categoryId);
      const result = await callOwnerProcedure(req, res, "updateCategory", {
        categoryId,
        ...req.body,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Kategori güncellenemedi" });
    }
  });

  app.delete("/api/owner/categories/:categoryId", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    // TODO: gerçek DB silme
    res.json({ success: true, categoryId: req.params.categoryId });
  });

  // ── AI Command ──

  app.post("/api/owner/ai-command", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    try {
      const { command } = req.body;
      if (!command) {
        res.status(400).json({ error: "Komut gerekli" });
        return;
      }
      const result = await callOwnerProcedure(req, res, "aiCommand", { command });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "AI komut işlenemedi" });
    }
  });

  // ── Wallet ──

  app.get("/api/owner/wallet", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    try {
      const result = await callOwnerProcedure(req, res, "wallet");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Cüzdan bilgileri alınamadı" });
    }
  });

  app.post("/api/owner/wallet/withdraw", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    try {
      const { amount, bankAccountId } = req.body;
      if (!amount || !bankAccountId) {
        res.status(400).json({ error: "amount ve bankAccountId gerekli" });
        return;
      }
      const result = await callOwnerProcedure(req, res, "withdrawFunds", { amount, bankAccountId });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Para çekme işlemi başarısız" });
    }
  });

  // ── Analytics ──

  app.get("/api/owner/analytics", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    try {
      const from = typeof req.query.from === "string" ? req.query.from : undefined;
      const to = typeof req.query.to === "string" ? req.query.to : undefined;
      const result = await callOwnerProcedure(req, res, "analytics", { from, to });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Analitik verileri alınamadı" });
    }
  });

  // ── Services (MoveOS lib/api.ts) ──

  app.get("/api/owner/services", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    // TODO: gerçek servis listesi
    res.json({ services: [], total: 0 });
  });

  app.get("/api/owner/services/:serviceId", async (req: Request, res: Response) => {
    if (!(await requireOwnerAuth(req, res))) return;
    // TODO: gerçek servis detayı
    res.json({ id: req.params.serviceId, name: "Servis", status: "active" });
  });

  console.log("[Owner REST Adapter] Registered /api/owner/* routes");
}
