/**
 * End-to-End (E2E) Tests — Rewritten
 *
 * Bu test dosyası, Move&Fix sisteminin tam kullanıcı yolculuğunu
 * gerçek HTTP istekleriyle uçtan uca doğrular.
 *
 * Eski test dosyası, mevcut olmayan REST endpoint'lere (/api/auth/register, /api/orders vb.)
 * gidiyordu. Bu sürüm, gerçek API yüzeyiyle (tRPC + owner REST adapter) çalışır.
 *
 * Test edilen akışlar:
 * 1. Owner login + dashboard (MoveOS admin)
 * 2. Kategori yönetimi (liste + oluşturma)
 * 3. AI komut işleme
 * 4. Cüzdan ve para çekme
 * 5. Analitik raporlar
 * 6. Kullanıcı yönetimi
 * 7. Health check + security headers
 * 8. tRPC public endpoints
 * 9. Hata senaryoları
 * 10. 2FA verification
 * 11. Logout
 */

import { describe, it, expect } from "vitest";
import http from "http";

const API_BASE = "http://127.0.0.1:3000";
const OWNER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvd25lciIsImVtYWlsIjoib3duZXJAbW92ZWZpeC5jb20iLCJyb2xlIjoib3duZXIifQ.mock";

function httpRequest(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; body: unknown; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      `${API_BASE}${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(chunks);
          } catch {
            parsed = chunks;
          }
          resolve({
            status: res.statusCode ?? 0,
            body: parsed,
            headers: res.headers,
          });
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

describe("E2E: Complete User Journey", () => {
  // ── 1. Owner Authentication ──

  describe("1. Owner Authentication", () => {
    it("should login with correct credentials", async () => {
      const res = await httpRequest("POST", "/api/owner/login", {
        email: "owner@movefix.com",
        password: "password123",
      });
      expect(res.status).toBe(200);
      const body = res.body as { token: string; user: { id: string; email: string; role: string }; requires2FA: boolean };
      expect(body.token).toBeTruthy();
      expect(body.user.email).toBe("owner@movefix.com");
      expect(body.user.role).toBe("owner");
    });

    it("should reject wrong password", async () => {
      const res = await httpRequest("POST", "/api/owner/login", {
        email: "owner@movefix.com",
        password: "wrongpass",
      });
      expect(res.status).toBe(401);
    });

    it("should reject short password (Zod validation)", async () => {
      const res = await httpRequest("POST", "/api/owner/login", {
        email: "test@test.com",
        password: "123",
      });
      expect(res.status).toBe(400);
    });

    it("should reject missing fields", async () => {
      const res = await httpRequest("POST", "/api/owner/login", { email: "test@test.com" });
      expect(res.status).toBe(400);
    });
  });

  // ── 2. Dashboard ──

  describe("2. Dashboard", () => {
    it("should return dashboard data with auth", async () => {
      const res = await httpRequest("GET", "/api/owner/dashboard", undefined, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
      const body = res.body as { dailyRevenue: number; activeUsers: number; systemStatus: string };
      expect(body.dailyRevenue).toBeGreaterThan(0);
      expect(body.activeUsers).toBeGreaterThan(0);
      expect(body.systemStatus).toBe("healthy");
    });

    it("should reject without auth", async () => {
      const res = await httpRequest("GET", "/api/owner/dashboard");
      expect(res.status).toBe(401);
    });
  });

  // ── 3. Category Management ──

  describe("3. Category Management", () => {
    it("should list categories", async () => {
      const res = await httpRequest("GET", "/api/owner/categories", undefined, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
      const body = res.body as Array<{ id: number; name: string; commission: number }>;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it("should create a category", async () => {
      const res = await httpRequest("POST", "/api/owner/categories", {
        name: "Bahçe Bakımı",
        description: "Bahçe bakım hizmetleri",
        commission: 12,
      }, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
      const body = res.body as { id: number; name: string; active: boolean };
      expect(body.name).toBe("Bahçe Bakımı");
      expect(body.active).toBe(true);
    });
  });

  // ── 4. AI Command ──

  describe("4. AI Command", () => {
    it("should process category creation command", async () => {
      const res = await httpRequest("POST", "/api/owner/ai-command", {
        command: "Yeni kategori ekle: Bahçe Tasarımı",
      }, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
      const body = res.body as { response: string; action: string };
      expect(body.response).toBeTruthy();
      expect(body.action).toBeTruthy();
    });

    it("should process commission update command", async () => {
      const res = await httpRequest("POST", "/api/owner/ai-command", {
        command: "Komisyon oranını güncelle",
      }, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
      const body = res.body as { response: string; action: string };
      expect(body.action).toBe("update_commission");
    });
  });

  // ── 5. Wallet & Withdrawal ──

  describe("5. Wallet & Withdrawal", () => {
    it("should return wallet info", async () => {
      const res = await httpRequest("GET", "/api/owner/wallet", undefined, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
      const body = res.body as { balance: number; totalEarnings: number; bankAccounts: unknown[] };
      expect(body.balance).toBeGreaterThan(0);
      expect(body.totalEarnings).toBeGreaterThan(0);
      expect(body.bankAccounts.length).toBeGreaterThan(0);
    });

    it("should process withdrawal", async () => {
      const res = await httpRequest("POST", "/api/owner/wallet/withdraw", {
        amount: 5000,
        bankAccountId: "1",
      }, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; transactionId: string; status: string };
      expect(body.success).toBe(true);
      expect(body.transactionId).toBeTruthy();
      expect(body.status).toBe("pending");
    });

    it("should reject withdrawal without amount", async () => {
      const res = await httpRequest("POST", "/api/owner/wallet/withdraw", {
        bankAccountId: "1",
      }, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(400);
    });
  });

  // ── 6. Analytics ──

  describe("6. Analytics", () => {
    it("should return analytics data", async () => {
      const res = await httpRequest("GET", "/api/owner/analytics", undefined, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
      const body = res.body as { totalOrders: number; totalRevenue: number; topCategories: unknown[] };
      expect(body.totalOrders).toBeGreaterThan(0);
      expect(body.topCategories.length).toBeGreaterThan(0);
    });
  });

  // ── 7. User Management ──

  describe("7. User Management", () => {
    it("should list users", async () => {
      const res = await httpRequest("GET", "/api/owner/users", undefined, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
      const body = res.body as { total: number; users: unknown[] };
      expect(body.total).toBeGreaterThan(0);
      expect(body.users.length).toBeGreaterThan(0);
    });

    it("should get a single user", async () => {
      const res = await httpRequest("GET", "/api/owner/users/1", undefined, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
      const body = res.body as { id: string };
      expect(body.id).toBe("1");
    });
  });

  // ── 8. Health & Security ──

  describe("8. Health & Security", () => {
    it("should return health status", async () => {
      const res = await httpRequest("GET", "/api/health");
      expect(res.status).toBe(200);
      const body = res.body as { ok: boolean; timestamp: number };
      expect(body.ok).toBe(true);
    });

    it("should include security headers", async () => {
      const res = await httpRequest("GET", "/api/health");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["content-security-policy"]).toBeTruthy();
    });
  });

  // ── 9. tRPC Public Endpoints ──

  describe("9. tRPC Public Endpoints", () => {
    it("should return auth.me (unauthenticated)", async () => {
      const res = await httpRequest("GET", "/api/trpc/auth.me");
      expect(res.status).toBe(200);
      const body = res.body as { result: { data: { json: unknown } } };
      expect(body.result).toBeDefined();
    });

    it("should return nearby providers", async () => {
      const res = await httpRequest("GET", "/api/trpc/providers.nearby?input=%7B%22json%22%3A%7B%22lat%22%3A%2241.0082%22%2C%22lng%22%3A%2228.9784%22%7D%7D");
      expect(res.status).toBe(200);
    });
  });

  // ── 10. Error Scenarios ──

  describe("10. Error Scenarios", () => {
    it("should return 404 for unknown endpoint", async () => {
      const res = await httpRequest("GET", "/api/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  // ── 11. 2FA ──

  describe("11. 2FA Verification", () => {
    it("should verify with correct OTP", async () => {
      const res = await httpRequest("POST", "/api/owner/verify-2fa", {
        email: "owner@movefix.com",
        otpCode: "123456",
      });
      expect(res.status).toBe(200);
      const body = res.body as { token: string; user: { role: string } };
      expect(body.token).toBeTruthy();
      expect(body.user.role).toBe("owner");
    });

    it("should reject wrong OTP", async () => {
      const res = await httpRequest("POST", "/api/owner/verify-2fa", {
        email: "owner@movefix.com",
        otpCode: "000000",
      });
      expect(res.status).toBe(401);
    });
  });

  // ── 12. Logout ──

  describe("12. Logout", () => {
    it("should logout successfully", async () => {
      const res = await httpRequest("POST", "/api/owner/logout", {}, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(200);
    });
  });
});
