/**
 * Professional E2E Test — Usta iş akışı doğrulaması
 * Akış: auth.me → providers.newJobs → offers.create → offers.accept (customer) → jobs.updateStatus (in_progress) → jobs.complete → providers.myJobs → providers.myEarnings
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
  const providerToken = tokens.provider;
  const customerToken = tokens.customer;
  let step = 0;
  const log = (msg: string, data?: unknown) => {
    step++;
    console.log(`\n[STEP ${step}] ${msg}`);
    if (data !== undefined) console.log(JSON.stringify(data, null, 2));
  };

  // 1. auth.me — Provider oturum doğrula
  log("auth.me — Provider oturum doğrula");
  const me = await tRPC("auth.me", "GET", providerToken);
  console.log("Provider User:", me?.id, me?.name, me?.email);
  if (!me?.id) throw new Error("auth.me failed — no provider user");

  // 2. requests.create — Customer yeni talep oluştur (provider'ın görebilmesi için)
  log("requests.create — Customer yeni talep oluştur");
  const request = await tRPC("requests.create", "POST", customerToken, {
    categoryId: 4, // hvac
    title: "Klima bakım ve gaz dolumu",
    description: "Klima soğutmuyor, gaz dolumu ve bakım gerekli",
    address: "Beşiktaş, İstanbul",
    latitude: "41.0438",
    longitude: "29.0070",
    budgetMin: 600,
    budgetMax: 1200,
  });
  const requestId = typeof request === "number" ? request : (request as any)?.id;
  console.log("Request ID:", requestId);

  // 3. providers.newJobs — Provider yeni işleri listele
  log("providers.newJobs — Yeni işleri listele");
  const newJobs = await tRPC("providers.newJobs", "GET", providerToken);
  console.log("New jobs count:", Array.isArray(newJobs) ? newJobs.length : "N/A");
  if (Array.isArray(newJobs)) {
    const matchingJob = newJobs.find((j: any) => j.id === requestId);
    console.log("Matching job found:", matchingJob ? "YES" : "NO");
  }

  // 4. offers.create — Provider teklif ver
  log("offers.create — Teklif ver");
  const offer = await tRPC("offers.create", "POST", providerToken, {
    requestId,
    providerId: 3, // provider user ID
    price: 800,
    message: "Klima bakım + gaz dolumu, aynı gün servis",
    estimatedTime: "1.5 saat",
  });
  const offerId = typeof offer === "number" ? offer : (offer as any)?.id;
  console.log("Offer ID:", offerId);

  // 5. offers.accept — Customer teklifi kabul et
  log("offers.accept — Customer teklifi kabul et");
  const accepted = await tRPC("offers.accept", "POST", customerToken, { offerId });
  console.log("Accepted:", accepted);

  // 6. jobs.updateStatus — Provider işi başlat (in_progress)
  log("jobs.updateStatus — İş başlatıldı (active)");
  const jobStart = await tRPC("jobs.updateStatus", "POST", providerToken, {
    requestId,
    status: "active",
  });
  console.log("Job active:", jobStart);

  // 7. messages.send — Provider customer'a mesaj
  log("messages.send — Provider mesaj gönder");
  const message = await tRPC("messages.send", "POST", providerToken, {
    receiverId: 1,
    content: "Yola çıktım, 30 dakika içinde orada olacağım",
    requestId,
  });
  console.log("Message sent:", message);

  // 8. jobs.complete — Provider işi tamamla
  log("jobs.complete — İş tamamlandı");
  const jobComplete = await tRPC("jobs.complete", "POST", providerToken, { requestId });
  console.log("Job completed:", jobComplete);

  // 9. providers.myJobs — Provider iş geçmişi
  log("providers.myJobs — İş geçmişi");
  const myJobs = await tRPC("providers.myJobs", "GET", providerToken);
  console.log("My jobs:", Array.isArray(myJobs) ? `${myJobs.length} jobs` : myJobs);
  if (Array.isArray(myJobs)) {
    for (const job of myJobs) {
      console.log(`  - Job #${job.id}: ${job.title} [${job.status}]`);
    }
  }

  // 10. providers.myEarnings — Kazanç kontrolü
  log("providers.myEarnings — Kazanç kontrolü");
  const earnings = await tRPC("providers.myEarnings", "GET", providerToken);
  console.log("Earnings:", earnings);

  // 11. providers.myProfile — Provider profil
  log("providers.myProfile — Provider profil");
  const profile = await tRPC("providers.myProfile", "GET", providerToken);
  console.log("Profile:", profile);

  console.log("\n✅ PROFESSIONAL E2E: TÜM ADIMLAR BAŞARILI");
}

main().catch((e) => {
  console.error("\n❌ PROFESSIONAL E2E FAILED:", e.message);
  process.exit(1);
});
