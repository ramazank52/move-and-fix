/**
 * MoveOS REST compatibility adapter.
 *
 * REST istemcileri, mobil uygulamayla aynı platform oturumunu kullanarak
 * gerçek `owner` tRPC prosedürlerine erişir. Bu katman asla owner token,
 * owner parolası veya örnek yönetim bağlamı üretmez.
 */

import type { Express, Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { createContext } from "./context";
import { ownerRouter } from "./ownerRouter";
import { securityAuditLog } from "./security";

type OwnerProcedure =
  | "logout"
  | "requestMfa"
  | "verifyMfa"
  | "dashboard"
  | "users"
  | "getUser"
  | "updateUser"
  | "categories"
  | "createCategory"
  | "updateCategory"
  | "archiveCategory"
  | "aiCommand"
  | "wallet"
  | "withdrawFunds"
  | "analytics"
  | "services"
  | "getService"
  | "countryCompliance"
  | "createCountryJurisdiction"
  | "createCountryCompliancePackage"
  | "transitionCountryCompliancePackage"
  | "registerCountryOfficialSource"
  | "saveCountryLaunchGate"
  | "enableCountryProfessionalMarketplace"
  | "settlementPolicies"
  | "createSettlementPolicy"
  | "retireSettlementPolicy"
  | "cancellationCases"
  | "changeOrders"
  | "reviewCancellationCase"
  | "riskFlags"
  | "reviewRiskFlag"
  | "featureFlags"
  | "setFeatureFlag";

async function requireMoveOsAdmin(req: Request, res: Response): Promise<User | null> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (user.role !== "admin") {
      res.status(403).json({ error: "MoveOS için yönetici yetkisi gerekli", code: "FORBIDDEN" });
      return null;
    }
    return user;
  } catch {
    res.status(401).json({ error: "Ortak platform oturumu gerekli", code: "UNAUTHORIZED" });
    return null;
  }
}

async function callOwnerProcedure<T>(
  req: Request,
  res: Response,
  user: User,
  procedure: OwnerProcedure,
  input?: unknown,
): Promise<T> {
  const context = await createContext({ req, res, info: {} as never });
  if (!context.user || context.user.id !== user.id) {
    throw new Error("Ortak platform oturumu yeniden doğrulanamadı");
  }
  const caller = ownerRouter.createCaller(context);
  // tRPC'nin dinamik REST köprüsünde yöntem adı runtime'da seçilir.
  const result = input === undefined
    ? await (caller[procedure] as () => Promise<unknown>)()
    : await (caller[procedure] as (value: unknown) => Promise<unknown>)(input);
  return result as T;
}

function statusForOwnerError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND") return 404;
  if (code === "PRECONDITION_FAILED") return 412;
  if (code === "TOO_MANY_REQUESTS") return 429;
  if (code === "BAD_REQUEST" || code === "PARSE_ERROR") return 400;
  if (code === "CONFLICT") return 409;
  return 500;
}

function sendOwnerError(res: Response, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  res.status(statusForOwnerError(error)).json({ error: message });
}

export function registerOwnerRestRoutes(app: Express) {
  // Eski, sabit owner parolası/OTP endpointleri üretimde kapalıdır.
  app.post("/api/owner/login", (_req, res) => {
    res.status(410).json({
      error: "MoveOS yalnız ortak platform oturumuyla açılır; ayrı owner giriş endpointi kaldırıldı.",
      code: "GONE",
    });
  });
  app.post("/api/owner/verify-2fa", (_req, res) => {
    res.status(410).json({
      error: "MoveOS doğrulaması ortak platform hesabı üzerinden yürütülür.",
      code: "GONE",
    });
  });

  app.post("/api/owner/mfa/request", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "requestMfa"));
    } catch (error) {
      sendOwnerError(res, error, "Yönetici MFA kodu gönderilemedi");
    }
  });

  app.post("/api/owner/mfa/verify", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "verifyMfa", { code: req.body?.code }));
    } catch (error) {
      sendOwnerError(res, error, "Yönetici MFA kodu doğrulanamadı");
    }
  });

  app.post("/api/owner/logout", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "logout"));
    } catch (error) {
      sendOwnerError(res, error, "Çıkış işlemi tamamlanamadı");
    }
  });

  app.get("/api/owner/dashboard", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "dashboard"));
    } catch (error) {
      sendOwnerError(res, error, "Dashboard verileri alınamadı");
    }
  });

  app.get("/api/owner/users", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      const input = {
        role: typeof req.query.role === "string" ? req.query.role : undefined,
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };
      res.json(await callOwnerProcedure(req, res, user, "users", input));
    } catch (error) {
      sendOwnerError(res, error, "Kullanıcılar alınamadı");
    }
  });

  app.get("/api/owner/users/:userId", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "getUser", { userId: Number(req.params.userId) }));
    } catch (error) {
      sendOwnerError(res, error, "Kullanıcı alınamadı");
    }
  });

  app.put("/api/owner/users/:userId", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      const input = {
        userId: Number(req.params.userId),
        name: req.body?.name,
        role: req.body?.role,
      };
      res.json(await callOwnerProcedure(req, res, user, "updateUser", input));
    } catch (error) {
      sendOwnerError(res, error, "Kullanıcı güncellenemedi");
    }
  });

  app.delete("/api/owner/users/:userId", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    securityAuditLog.log("owner.user_delete_blocked", req.ip || "unknown", "failure", String(user.id));
    res.status(412).json({
      error: "Kullanıcı silme için geri alınabilir arşivleme ve KVKK saklama politikası modellenmeden işlem başlatılamaz.",
      code: "PRECONDITION_FAILED",
    });
  });

  app.get("/api/owner/categories", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "categories"));
    } catch (error) {
      sendOwnerError(res, error, "Kategoriler alınamadı");
    }
  });

  app.post("/api/owner/categories", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "createCategory", req.body));
    } catch (error) {
      sendOwnerError(res, error, "Kategori oluşturulamadı");
    }
  });

  app.put("/api/owner/categories/:categoryId", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(
        await callOwnerProcedure(req, res, user, "updateCategory", {
          ...req.body,
          categoryId: Number(req.params.categoryId),
        }),
      );
    } catch (error) {
      sendOwnerError(res, error, "Kategori güncellenemedi");
    }
  });

  app.delete("/api/owner/categories/:categoryId", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(
        await callOwnerProcedure(req, res, user, "archiveCategory", {
          categoryId: Number(req.params.categoryId),
        }),
      );
    } catch (error) {
      sendOwnerError(res, error, "Kategori arşivlenemedi");
    }
  });

  app.post("/api/owner/ai-command", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "aiCommand", { command: req.body?.command }));
    } catch (error) {
      sendOwnerError(res, error, "AI komut işlenemedi");
    }
  });

  app.get("/api/owner/wallet", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "wallet"));
    } catch (error) {
      sendOwnerError(res, error, "Platform finans özeti alınamadı");
    }
  });

  app.post("/api/owner/wallet/withdraw", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "withdrawFunds", req.body));
    } catch (error) {
      sendOwnerError(res, error, "Platform para çekme işlemi başlatılamadı");
    }
  });

  app.get("/api/owner/settlement-policies", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(
        await callOwnerProcedure(req, res, user, "settlementPolicies", {
          limit: req.query.limit ? Number(req.query.limit) : 20,
          offset: req.query.offset ? Number(req.query.offset) : 0,
          status: typeof req.query.status === "string" ? req.query.status : undefined,
        }),
      );
    } catch (error) {
      sendOwnerError(res, error, "Settlement policy kayıtları alınamadı");
    }
  });

  app.post("/api/owner/settlement-policies", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "createSettlementPolicy", req.body));
    } catch (error) {
      sendOwnerError(res, error, "Settlement policy oluşturulamadı");
    }
  });

  app.post("/api/owner/settlement-policies/:policyId/retire", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "retireSettlementPolicy", { policyId: Number(req.params.policyId) }));
    } catch (error) {
      sendOwnerError(res, error, "Settlement policy emekliye ayrılamadı");
    }
  });

  app.get("/api/owner/cancellation-cases", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(
        await callOwnerProcedure(req, res, user, "cancellationCases", {
          limit: req.query.limit ? Number(req.query.limit) : 20,
          offset: req.query.offset ? Number(req.query.offset) : 0,
          status: typeof req.query.status === "string" ? req.query.status : undefined,
        }),
      );
    } catch (error) {
      sendOwnerError(res, error, "İptal inceleme kayıtları alınamadı");
    }
  });

  app.get("/api/owner/change-orders", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(
        await callOwnerProcedure(req, res, user, "changeOrders", {
          limit: req.query.limit ? Number(req.query.limit) : 20,
          offset: req.query.offset ? Number(req.query.offset) : 0,
          status: typeof req.query.status === "string" ? req.query.status : undefined,
        }),
      );
    } catch (error) {
      sendOwnerError(res, error, "Change order denetim kayıtları alınamadı");
    }
  });

  app.post("/api/owner/cancellation-cases/:requestId/review", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(
        await callOwnerProcedure(req, res, user, "reviewCancellationCase", {
          ...req.body,
          requestId: Number(req.params.requestId),
        }),
      );
    } catch (error) {
      sendOwnerError(res, error, "İptal kaydı çözümlenemedi");
    }
  });

  app.get("/api/owner/risk-flags", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(
        await callOwnerProcedure(req, res, user, "riskFlags", {
          limit: req.query.limit ? Number(req.query.limit) : 50,
        }),
      );
    } catch (error) {
      sendOwnerError(res, error, "Risk kayıtları alınamadı");
    }
  });

  app.post("/api/owner/risk-flags/:riskFlagId/review", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(
        await callOwnerProcedure(req, res, user, "reviewRiskFlag", {
          ...req.body,
          riskFlagId: Number(req.params.riskFlagId),
        }),
      );
    } catch (error) {
      sendOwnerError(res, error, "Risk kaydı incelenemedi");
    }
  });

  app.get("/api/owner/feature-flags", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(
        await callOwnerProcedure(req, res, user, "featureFlags", {
          limit: req.query.limit ? Number(req.query.limit) : 100,
        }),
      );
    } catch (error) {
      sendOwnerError(res, error, "Feature flag kayıtları alınamadı");
    }
  });

  app.post("/api/owner/feature-flags", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "setFeatureFlag", req.body));
    } catch (error) {
      sendOwnerError(res, error, "Feature flag güncellenemedi");
    }
  });

  app.get("/api/owner/analytics", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      const input = {
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
      };
      res.json(await callOwnerProcedure(req, res, user, "analytics", input));
    } catch (error) {
      sendOwnerError(res, error, "Analitik verileri alınamadı");
    }
  });

  app.get("/api/owner/services", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(
        await callOwnerProcedure(req, res, user, "services", {
          limit: req.query.limit ? Number(req.query.limit) : 20,
          offset: req.query.offset ? Number(req.query.offset) : 0,
        }),
      );
    } catch (error) {
      sendOwnerError(res, error, "Hizmetler alınamadı");
    }
  });

  app.get("/api/owner/services/:serviceId", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "getService", { serviceId: Number(req.params.serviceId) }));
    } catch (error) {
      sendOwnerError(res, error, "Hizmet talebi alınamadı");
    }
  });

  app.get("/api/owner/compliance/countries", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "countryCompliance"));
    } catch (error) {
      sendOwnerError(res, error, "Ülke uyum paketleri alınamadı");
    }
  });

  app.post("/api/owner/compliance/countries", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "createCountryJurisdiction", req.body));
    } catch (error) {
      sendOwnerError(res, error, "Ülke yargı alanı oluşturulamadı");
    }
  });

  app.post("/api/owner/compliance/countries/:jurisdictionId/packages", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "createCountryCompliancePackage", { ...req.body, jurisdictionId: Number(req.params.jurisdictionId) }));
    } catch (error) {
      sendOwnerError(res, error, "Uyum paketi oluşturulamadı");
    }
  });

  app.post("/api/owner/compliance/packages/:packageId/status", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "transitionCountryCompliancePackage", { ...req.body, packageId: Number(req.params.packageId) }));
    } catch (error) {
      sendOwnerError(res, error, "Uyum paketi durumu güncellenemedi");
    }
  });

  app.post("/api/owner/compliance/countries/:jurisdictionId/sources", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "registerCountryOfficialSource", { ...req.body, jurisdictionId: Number(req.params.jurisdictionId) }));
    } catch (error) {
      sendOwnerError(res, error, "Resmî kaynak kaydedilemedi");
    }
  });

  app.put("/api/owner/compliance/countries/:jurisdictionId/gate", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "saveCountryLaunchGate", { ...req.body, jurisdictionId: Number(req.params.jurisdictionId) }));
    } catch (error) {
      sendOwnerError(res, error, "Ülke açma kapısı kaydedilemedi");
    }
  });

  app.post("/api/owner/compliance/countries/:jurisdictionId/enable", async (req, res) => {
    const user = await requireMoveOsAdmin(req, res);
    if (!user) return;
    try {
      res.json(await callOwnerProcedure(req, res, user, "enableCountryProfessionalMarketplace", { jurisdictionId: Number(req.params.jurisdictionId) }));
    } catch (error) {
      sendOwnerError(res, error, "Profesyonel pazaryeri etkinleştirilemedi");
    }
  });

  console.log("[MoveOS REST] Registered shared-session /api/owner/* routes");
}
