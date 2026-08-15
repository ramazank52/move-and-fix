/**
 * Payment API Doğrulama Testi
 * Mock/sandbox akışları test eder. Gerçek credential yok — BLOCKER olarak işaretlenir.
 */
import "dotenv/config";

const API = "http://127.0.0.1:3000";
const tokens = JSON.parse(require("fs").readFileSync("/tmp/test-tokens.json", "utf8"));

async function tRPC(procedure: string, method: "GET" | "POST", token: string, body?: unknown) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
  const query = method === "GET" && body
    ? `?input=${encodeURIComponent(JSON.stringify({ json: body }))}`
    : "";
  const res = await fetch(`${API}/api/trpc/${procedure}${query}`, {
    method,
    headers,
    body: method === "POST" && body ? JSON.stringify({ json: body }) : undefined,
  });
  const data = await res.json() as any;
  if (data.error) {
    throw new Error(`tRPC ${procedure} error: ${JSON.stringify(data.error.json?.message || data.error)}`);
  }
  return data.result?.data?.json;
}

async function main() {
  const customerToken = tokens.customer;
  const providerToken = tokens.provider;
  let step = 0;
  const log = (msg: string, data?: unknown) => {
    step++;
    console.log(`\n[STEP ${step}] ${msg}`);
    if (data !== undefined) console.log(JSON.stringify(data, null, 2));
  };

  // 1. Create a service request
  log("requests.create — Hizmet talebi oluştur");
  const request = await tRPC("requests.create", "POST", customerToken, {
    categoryId: 1,
    title: "Payment test request",
    description: "Payment escrow test",
    budgetMin: 200,
    budgetMax: 500,
  });
  const requestId = typeof request === "number" ? request : (request as any)?.id;
  console.log("Request ID:", requestId);

  // 2. Provider gives offer
  log("offers.create — Provider teklif ver");
  const offer = await tRPC("offers.create", "POST", providerToken, {
    requestId,
    price: 350,
    message: "Test offer",
    estimatedTime: "2 saat",
  });
  const offerId = typeof offer === "number" ? offer : (offer as any)?.id;
  console.log("Offer ID:", offerId);

  // 3. Customer accepts offer
  log("offers.accept — Teklif kabul");
  await tRPC("offers.accept", "POST", customerToken, { offerId });

  // 4. Server-derived quote; client amount/provider is never accepted
  log("payments.quote — Server-derived amount/provider/commission");
  const quote = await tRPC("payments.quote", "GET", customerToken, { requestId });
  console.log("Quote:", quote);

  const idempotencyKey = `payment-e2e-${requestId}-${Date.now()}`;
  log("payments.create — Güvenli pending ödeme niyeti");
  const payment = await tRPC("payments.create", "POST", customerToken, {
    requestId,
    idempotencyKey,
    providerId: 999,
    amount: 1,
    commissionRateBps: 0,
  });
  const paymentId = (payment as any)?.payment?.id;
  console.log("Payment ID:", paymentId);
  if (!paymentId) throw new Error("payments.create failed — no payment ID");
  if ((payment as any)?.payment?.amount !== (quote as any)?.amount) {
    throw new Error("Amount tampering protection failed");
  }

  // 5. Same idempotency key must return the same payment
  log("payments.create — Duplicate idempotency replay");
  const duplicate = await tRPC("payments.create", "POST", customerToken, {
    requestId,
    idempotencyKey,
  });
  if ((duplicate as any)?.payment?.id !== paymentId || !(duplicate as any)?.duplicated) {
    throw new Error("Idempotency protection failed");
  }
  console.log("Duplicate safely returned existing payment:", paymentId);

  // 6. Pending payment cannot be released; gateway webhook must first confirm held
  log("payments.release — Pending ödeme için release reddi");
  let releaseBlocked = false;
  try {
    await tRPC("payments.release", "POST", customerToken, { paymentId });
  } catch (error) {
    releaseBlocked = true;
    console.log("Release correctly blocked:", error instanceof Error ? error.message : error);
  }
  if (!releaseBlocked) {
    throw new Error("Invalid release unexpectedly succeeded");
  }

  // 7. List payments
  log("payments.list — Ödeme geçmişi");
  const payments = await tRPC("payments.list", "GET", customerToken);
  console.log("Payments:", Array.isArray(payments) ? `${payments.length} payments` : payments);
  if (Array.isArray(payments)) {
    for (const p of payments) {
      console.log(`  - Payment #${p.id}: ${p.amount}₺ [${p.status}] for request #${p.requestId}`);
    }
  }

  // 8. Check env vars for real payment credentials
  log("Payment credential check");
  const iyzicoKey = process.env.IYZICO_API_KEY ? "SET" : "NOT SET";
  const iyzicoSecret = process.env.IYZICO_SECRET_KEY ? "SET" : "NOT SET";
  const stripeKey = process.env.STRIPE_SECRET_KEY ? "SET" : "NOT SET";
  console.log(`IYZICO_API_KEY: ${iyzicoKey}`);
  console.log(`IYZICO_SECRET_KEY: ${iyzicoSecret}`);
  console.log(`STRIPE_SECRET_KEY: ${stripeKey}`);

  if (iyzicoKey === "NOT SET" || iyzicoSecret === "NOT SET") {
    console.log("⚠️ BLOCKER: iyzico API credentials not configured — real payment flow cannot be tested");
  }
  if (stripeKey === "NOT SET") {
    console.log("⚠️ BLOCKER: Stripe API key not configured — real payment flow cannot be tested");
  }

  console.log("\n✅ PAYMENT E2E: Mock/sandbox akışları başarılı");
  console.log("⚠️ BLOCKER: Gerçek iyzico/Stripe credential'ları gerekli — canlı ödeme testi yapılamadı");
}

main().catch((e) => {
  console.error("\n❌ PAYMENT E2E FAILED:", e.message);
  process.exit(1);
});
