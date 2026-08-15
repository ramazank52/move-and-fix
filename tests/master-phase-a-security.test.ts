import { describe, expect, it } from "vitest";
import {
  CSRFProtection,
  isAllowedCorsOrigin,
  requiresCsrfProtection,
  resolveAllowedOrigins,
  resolveEncryptionKey,
} from "../server/_core/security";
import { getCookieValue } from "../server/_core/cookies";
import { PaymentGatewayService } from "../server/services/PaymentGatewayService";
import { WalletService } from "../server/services/WalletService";
import { requireUnsubscribeSigningSecret } from "../server/_core/emailUnsubscribe";
import { AIService } from "../server/services/AIService";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Master Phase A P0 security contracts", () => {
  it("uses an empty CORS allowlist when production configuration is missing", () => {
    expect(resolveAllowedOrigins({ NODE_ENV: "production" })).toEqual([]);
  });

  it("uses only local development defaults when no development allowlist is configured", () => {
    expect(resolveAllowedOrigins({ NODE_ENV: "development" })).toEqual([
      "http://localhost:3000",
      "http://localhost:8081",
    ]);
    expect(isAllowedCorsOrigin("https://attacker.example", { NODE_ENV: "development" })).toBe(false);
  });

  it("normalizes configured production origins instead of using a public fallback", () => {
    const environment = { NODE_ENV: "production", ALLOWED_ORIGINS: " https://app.moveandfix.app , https://os.moveandfix.app " };
    expect(resolveAllowedOrigins(environment)).toEqual([
      "https://app.moveandfix.app",
      "https://os.moveandfix.app",
    ]);
    expect(isAllowedCorsOrigin("https://app.moveandfix.app", environment)).toBe(true);
    expect(isAllowedCorsOrigin("https://attacker.example", environment)).toBe(false);
  });

  it("refuses a missing production encryption key and never falls back to a static key", () => {
    expect(() => resolveEncryptionKey({ NODE_ENV: "production" })).toThrow("ENCRYPTION_KEY");
    const key = resolveEncryptionKey({ NODE_ENV: "development" });
    expect(key).toHaveLength(64);
    expect(key).not.toBe("default-key");
  });

  it("refuses a missing unsubscribe signing secret instead of using a default", () => {
    expect(() => requireUnsubscribeSigningSecret("")).toThrow("UNSUBSCRIBE_SECRET");
  });

  it("uses the standardized Stripe server variable and keeps it out of the client config contract", () => {
    const envSource = readFileSync(resolve(process.cwd(), "server/_core/env.ts"), "utf8");
    const clientSource = readFileSync(resolve(process.cwd(), "lib/stripe-sdk.native.tsx"), "utf8");
    expect(envSource).toContain("STRIPE_SECRET_KEY");
    expect(envSource).not.toContain("STRIPE_API_KEY");
    expect(clientSource).toContain("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    expect(clientSource).not.toContain("STRIPE_SECRET_KEY");
  });

  it("binds CSRF tokens to a stable cookie session rather than a request identifier", () => {
    const csrf = new CSRFProtection();
    const token = csrf.generateToken("csrf-cookie-session");
    expect(csrf.verifyToken("csrf-cookie-session", token)).toBe(true);
    expect(csrf.verifyToken("a-different-request-id", token)).toBe(false);
  });

  it("requires CSRF for cookie-based tRPC and MoveOS mutations but preserves signed and bearer flows", () => {
    expect(requiresCsrfProtection({ method: "POST", path: "/api/trpc/owner.setFeatureFlag", hasCookieSession: true })).toBe(true);
    expect(requiresCsrfProtection({ method: "DELETE", path: "/api/owner/categories/1", hasCookieSession: true })).toBe(true);
    expect(requiresCsrfProtection({ method: "POST", path: "/api/trpc/auth.logout", hasCookieSession: false })).toBe(false);
    expect(requiresCsrfProtection({ method: "POST", path: "/api/trpc/auth.logout", authorization: "Bearer native-token", hasCookieSession: true })).toBe(false);
    expect(requiresCsrfProtection({ method: "POST", path: "/api/payment/webhooks/stripe", hasCookieSession: true })).toBe(false);
    expect(requiresCsrfProtection({ method: "POST", path: "/api/scheduled/financial-reconciliation", hasCookieSession: true })).toBe(false);
  });

  it("parses only the named session cookie for legacy logout invalidation", () => {
    const req = { headers: { cookie: "theme=dark; session_token=encoded%20session; stale=value" } } as never;
    expect(getCookieValue(req, "session_token")).toBe("encoded session");
    expect(getCookieValue(req, "missing")).toBeNull();
  });

  it("fails closed if an unreferenced legacy payment or wallet class is invoked", async () => {
    const payments = new PaymentGatewayService();
    const wallet = new WalletService();

    await expect(payments.addCard("customer-1", "4111111111111111", "Test User", 12, 2030, "123")).rejects.toThrow("disabled");
    await expect(wallet.recordTransaction({
      userId: "customer-1",
      type: "deposit" as never,
      amount: 250,
      status: "completed" as never,
      description: "must not be persisted by the legacy service",
    })).rejects.toThrow("disabled");
  });

  it("does not claim legacy AI commands were executed when no verified executor exists", async () => {
    const ai = new AIService();
    await expect(ai.approveAndExecute("response-1")).resolves.toMatchObject({
      success: false,
      result: { status: "not_executed" },
    });
  });
});
