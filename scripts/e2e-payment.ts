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
  const res = await fetch(`${API}/api/trpc/${procedure}`, {
    method,
    headers,
    body: body ? JSON.stringify({ json: body }) : undefined,
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
    providerId: 3,
    price: 350,
    message: "Test offer",
  });
  const offerId = typeof offer === "number" ? offer : (offer as any)?.id;
  console.log("Offer ID:", offerId);

  // 3. Customer accepts offer
  log("offers.accept — Teklif kabul");
  await tRPC("offers.accept", "POST", customerToken, { offerId });

  // 4. Create payment
  log("payments.create — Ödeme oluştur");
  const payment = await tRPC("payments.create", "POST", customerToken, {
    requestId,
    providerId: 3,
    amount: 350,
  });
  const paymentId = typeof payment === "number" ? payment : (payment as any)?.id;
  console.log("Payment ID:", paymentId);

  // 5. Update payment status — held (escrow)
  log("payments.updateStatus — Escrow (held)");
  const heldStatus = await tRPC("payments.updateStatus", "POST", customerToken, {
    paymentId,
    status: "held",
  });
  console.log("Held:", heldStatus);

  // 6. Update payment status — completed (release to provider)
  log("payments.updateStatus — Tamamlandı (release)");
  const completedStatus = await tRPC("payments.updateStatus", "POST", customerToken, {
    paymentId,
    status: "released",
  });
  console.log("Released:", completedStatus);

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
  const stripeKey = process.env.STRIPE_API_KEY ? "SET" : "NOT SET";
  console.log(`IYZICO_API_KEY: ${iyzicoKey}`);
  console.log(`IYZICO_SECRET_KEY: ${iyzicoSecret}`);
  console.log(`STRIPE_API_KEY: ${stripeKey}`);

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
