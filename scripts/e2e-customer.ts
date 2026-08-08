/**
 * Customer E2E Test — Tam hizmet akışı doğrulaması
 * Akış: auth.me → requests.create → offers.create → offers.accept → payments.create → jobs.updateStatus → messages.send → jobs.complete → jobs.review
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

  // 1. Auth — verify customer session
  log("auth.me — Customer oturum doğrula");
  const me = await tRPC("auth.me", "GET", customerToken);
  console.log("User:", me?.id, me?.name, me?.email);
  if (!me?.id) throw new Error("auth.me failed — no user");

  // 2. requests.create — Hizmet talebi oluştur
  log("requests.create — Yeni hizmet talebi");
  const request = await tRPC("requests.create", "POST", customerToken, {
    categoryId: 1,
    title: "Banyoda su sızıntısı",
    description: "Banyo musluğundan sürekli su damlıyor, acil müdahale lazım",
    address: "Kadıköy, İstanbul",
    latitude: "40.9923",
    longitude: "29.0244",
    budgetMin: 200,
    budgetMax: 500,
  });
  console.log("Request created:", request);
  const requestId = typeof request === "number" ? request : (request as any)?.id;
  if (!requestId) throw new Error("requests.create failed — no request ID");

  // 3. offers.create — Provider teklif ver (provider token ile)
  // Provider user ID = 3 (Mehmet Usta)
  log("offers.create — Provider teklif ver");
  const offer = await tRPC("offers.create", "POST", providerToken, {
    requestId,
    providerId: 3, // provider user id (Mehmet Usta = user 3)
    price: 350,
    message: "Bugün gelebilirim, tahmini 2 saat sürer",
    estimatedTime: "2 saat",
  });
  console.log("Offer created:", offer);
  const offerId = typeof offer === "number" ? offer : (offer as any)?.id;
  if (!offerId) throw new Error("offers.create failed — no offer ID");

  // 4. offers.accept — Customer teklifi kabul et
  log("offers.accept — Teklifi kabul et");
  const accepted = await tRPC("offers.accept", "POST", customerToken, { offerId });
  console.log("Offer accepted:", accepted);

  // 5. payments.create — Ödeme oluştur
  log("payments.create — Ödeme oluştur");
  const payment = await tRPC("payments.create", "POST", customerToken, {
    requestId,
    providerId: 3,
    amount: 350,
  });
  console.log("Payment created:", payment);
  const paymentId = typeof payment === "number" ? payment : (payment as any)?.id;
  if (!paymentId) throw new Error("payments.create failed — no payment ID");

  // 6. payments.updateStatus — Ödeme durumu: held (escrow)
  log("payments.updateStatus — Ödeme escrow'da tutuluyor");
  const payStatus = await tRPC("payments.updateStatus", "POST", customerToken, {
    paymentId,
    status: "held",
  });
  console.log("Payment status updated:", payStatus);

  // 7. jobs.updateStatus — İş durumu: active
  log("jobs.updateStatus — İş aktif");
  const jobActive = await tRPC("jobs.updateStatus", "POST", customerToken, {
    requestId,
    status: "active",
  });
  console.log("Job active:", jobActive);

  // 8. messages.send — Mesaj gönder
  log("messages.send — Mesaj gönder");
  const message = await tRPC("messages.send", "POST", customerToken, {
    receiverId: 2,
    content: "Merhaba, ne zaman gelebilirsiniz?",
    requestId,
  });
  console.log("Message sent:", message);

  // 9. jobs.complete — İş tamamlandı (provider tarafından)
  log("jobs.complete — İş tamamlandı (provider token ile)");
  const jobComplete = await tRPC("jobs.complete", "POST", providerToken, { requestId });
  console.log("Job completed:", jobComplete);

  // 10. jobs.review — Değerlendirme yap
  log("jobs.review — Değerlendirme yap");
  const review = await tRPC("jobs.review", "POST", customerToken, {
    requestId,
    providerId: 3,
    rating: 5,
    comment: "Çok hızlı ve temiz iş çıkardı, teşekkürler!",
  });
  console.log("Review created:", review);

  // 11. payments.list — Ödeme geçmişi
  log("payments.list — Ödeme geçmişi");
  const payments = await tRPC("payments.list", "GET", customerToken);
  console.log("Payments:", payments);

  // 12. requests.list — Talep geçmişi
  log("requests.list — Talep geçmişi");
  const requests = await tRPC("requests.list", "GET", customerToken);
  console.log("Requests:", requests);

  console.log("\n✅ CUSTOMER E2E: TÜM ADIMLAR BAŞARILI");
}

main().catch((e) => {
  console.error("\n❌ CUSTOMER E2E FAILED:", e.message);
  process.exit(1);
});
