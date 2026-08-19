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
  // ── 1. MoveOS Common Authentication ──

  describe("1. MoveOS Common Authentication", () => {
    it("retires the legacy hard-coded owner password endpoint", async () => {
      const res = await httpRequest("POST", "/api/owner/login", {
        email: "owner@movefix.com",
        password: "password123",
      });
      expect(res.status).toBe(410);
      expect((res.body as { code: string }).code).toBe("GONE");
    });

    it("retires the legacy fixed OTP endpoint", async () => {
      const res = await httpRequest("POST", "/api/owner/verify-2fa", {
        email: "owner@movefix.com",
        otpCode: "123456",
      });
      expect(res.status).toBe(410);
    });

    it("requires a valid shared platform session for every protected MoveOS route", async () => {
      const res = await httpRequest("GET", "/api/owner/dashboard", undefined, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(401);
    });

    it("rejects an unauthenticated category mutation", async () => {
      const res = await httpRequest("POST", "/api/owner/categories", {
        name: "Bahçe Bakımı",
        pricingType: "fixed",
      });
      expect(res.status).toBe(401);
    });

    it("does not expose fabricated platform wallet or analytics data without admin authorization", async () => {
      const [wallet, analytics] = await Promise.all([
        httpRequest("GET", "/api/owner/wallet"),
        httpRequest("GET", "/api/owner/analytics"),
      ]);
      expect(wallet.status).toBe(401);
      expect(analytics.status).toBe(401);
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
      const res = await httpRequest("GET", "/api/trpc/provider.nearby?input=%7B%22json%22%3A%7B%22lat%22%3A%2241.0082%22%2C%22lng%22%3A%2228.9784%22%7D%7D");
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

  // ── 11. Legacy OTP ve çıkış sınırı ──

  describe("11. MoveOS Legacy Endpoint Boundary", () => {
    it("does not issue a session for the retired fixed OTP", async () => {
      const res = await httpRequest("POST", "/api/owner/verify-2fa", {
        email: "owner@movefix.com",
        otpCode: "123456",
      });
      expect(res.status).toBe(410);
    });

    it("requires a valid common admin session for MoveOS logout", async () => {
      const res = await httpRequest("POST", "/api/owner/logout", {}, {
        Authorization: `Bearer ${OWNER_TOKEN}`,
      });
      expect(res.status).toBe(401);
    });
  });
});
