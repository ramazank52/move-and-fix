/**
 * HTTP E2E güvenlik senaryoları.
 *
 * MoveOS, mobil uygulamayla aynı imzalı oturumu kullanır. Bu nedenle bu dosya
 * sabit owner parolası/tokeni yerine legacy endpointlerin kapalı kaldığını ve
 * bütün yönetim yüzeylerinin ortak yetkilendirme istediğini doğrular.
 */

import { describe, expect, it } from "vitest";
import http from "http";

const API_BASE = "http://127.0.0.1:3000";
const RETIRED_OWNER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvd25lciJ9.mock";

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
        res.on("data", (chunk) => (chunks += chunk));
        res.on("end", () => {
          let parsed: unknown = chunks;
          try {
            parsed = JSON.parse(chunks);
          } catch {
            // Gövdesiz veya JSON olmayan hata yanıtları kabul edilir.
          }
          resolve({ status: res.statusCode ?? 0, body: parsed, headers: res.headers });
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

describe("E2E HTTP: Ortak oturumlu MoveOS", () => {
  describe("Legacy owner kimliği", () => {
    it("sabit owner parolasıyla token üretmez", async () => {
      const res = await httpRequest("POST", "/api/owner/login", {
        email: "owner@movefix.com",
        password: "password123",
      });
      expect(res.status).toBe(410);
      expect((res.body as { code: string }).code).toBe("GONE");
    });

    it("sabit OTP ile token üretmez", async () => {
      const res = await httpRequest("POST", "/api/owner/verify-2fa", {
        email: "owner@movefix.com",
        otpCode: "123456",
      });
      expect(res.status).toBe(410);
    });
  });

  describe("Yönetim yetki sınırı", () => {
    const protectedCases: Array<{ method: string; path: string; body?: unknown }> = [
      { method: "GET", path: "/api/owner/dashboard" },
      { method: "GET", path: "/api/owner/operations-control?eventLimit=25&caseLimit=25" },
      { method: "GET", path: "/api/owner/users" },
      { method: "GET", path: "/api/owner/categories" },
      { method: "POST", path: "/api/owner/categories", body: { name: "Bahçe Bakımı", pricingType: "fixed" } },
      { method: "GET", path: "/api/owner/services" },
      { method: "GET", path: "/api/owner/wallet" },
      { method: "POST", path: "/api/owner/wallet/withdraw", body: { amount: 500, bankAccountId: "TR000000000000000000000000" } },
      { method: "GET", path: "/api/owner/analytics" },
      { method: "POST", path: "/api/owner/ai-command", body: { command: "Yeni kategori ekle" } },
    ];

    for (const request of protectedCases) {
      it(`${request.method} ${request.path} ortak oturum olmadan reddedilir`, async () => {
        const res = await httpRequest(request.method, request.path, request.body);
        expect(res.status).toBe(401);
      });
    }

    it("eski mock bearer tokenını gerçek yönetici oturumu saymaz", async () => {
      const res = await httpRequest("GET", "/api/owner/dashboard", undefined, {
        Authorization: `Bearer ${RETIRED_OWNER_TOKEN}`,
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Genel HTTP altyapısı", () => {
    it("sağlık kontrolünü ve güvenlik başlıklarını verir", async () => {
      const res = await httpRequest("GET", "/api/health");
      expect(res.status).toBe(200);
      expect((res.body as { ok: boolean }).ok).toBe(true);
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["content-security-policy"]).toBeTruthy();
    });

    it("genel auth.me ve yakın profesyoneller prosedürlerini erişilebilir tutar", async () => {
      const [auth, providers] = await Promise.all([
        httpRequest("GET", "/api/trpc/auth.me"),
        httpRequest("GET", "/api/trpc/provider.nearby?input=%7B%22json%22%3A%7B%22lat%22%3A%2241.0082%22%2C%22lng%22%3A%2228.9784%22%7D%7D"),
      ]);
      expect(auth.status).toBe(200);
      expect(providers.status).toBe(200);
    });

    it("bilinmeyen API rotasını 404 ile döndürür", async () => {
      const res = await httpRequest("GET", "/api/nonexistent");
      expect(res.status).toBe(404);
    });
  });
});
