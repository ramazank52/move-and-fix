import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";

// CDP doğrulama betiğinde `ws` transitive çalışma zamanı bağımlılığı kullanılır.
// @ts-expect-error — tek kullanımlık doğrulama betiği için paket tipleri kurulu değil.
import WebSocket from "ws";

import { providers, serviceRequests } from "../drizzle/schema";
import {
  getDb,
  getServiceCategoryBySlug,
  getUserByOpenId,
  upsertUser,
} from "../server/db";
import { COOKIE_NAME } from "../shared/const";

type SessionSdk = {
  createSessionToken: (
    openId: string,
    options: { name: string; expiresInMs: number },
  ) => Promise<string>;
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type SessionUser = {
  openId: string;
  name: string;
};

type ScreenSpec = {
  number: string;
  label: string;
  path: string;
  expected: string;
  role: "customer" | "provider" | "opportunity-provider";
  output: string;
};

const previewUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:8081";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3000";
const renderRequestId = Number(process.env.VERIFY_REQUEST_ID ?? 180002);

if (!Number.isInteger(renderRequestId) || renderRequestId <= 0) {
  throw new Error("VERIFY_REQUEST_ID pozitif tam sayı olmalıdır");
}

const customer: SessionUser = {
  openId: "test-customer-open-id",
  name: "Ahmet Müşteri",
};

const provider: SessionUser = {
  openId: "test-provider-open-id",
  name: "Mehmet Usta",
};

const opportunityProvider: SessionUser = {
  openId: "verify-opportunity-provider",
  name: "Move&Fix Render Ustası",
};

const opportunityCustomer: SessionUser = {
  openId: "verify-opportunity-customer",
  name: "Move&Fix Render Müşterisi",
};

const screens: ScreenSpec[] = [
  { number: "01", label: "Ana Sayfa", path: "/", expected: "Mehmet Usta", role: "customer", output: "01-home.png" },
  { number: "02", label: "Keşfet", path: "/explore", expected: "Kategoriler", role: "customer", output: "02-explore.png" },
  { number: "03", label: "MoveAI", path: "/ai-assistant", expected: "MoveAI", role: "customer", output: "03-moveai.png" },
  { number: "04", label: "Hizmet Talebi", path: "/create-service?categoryId=ac", expected: "Beyaz Eşya", role: "customer", output: "04-create-service.png" },
  { number: "05", label: "Profesyonel Listesi", path: "/category/plumbing", expected: "Mehmet Usta", role: "customer", output: "05-professionals.png" },
  { number: "06", label: "Teklifler", path: `/compare-providers?requestId=${renderRequestId}`, expected: "Mehmet Usta", role: "customer", output: "06-offers.png" },
  { number: "07", label: "Ödeme", path: `/payment/checkout?requestId=${renderRequestId}`, expected: "Hizmet bedeli", role: "customer", output: "07-payment.png" },
  { number: "08", label: "Aktif İş", path: `/tracking/live?requestId=${renderRequestId}`, expected: "Hizmet Detayı", role: "customer", output: "08-tracking.png" },
  { number: "09", label: "İşlerim", path: "/my-jobs", expected: "İşlerim", role: "customer", output: "09-my-jobs.png" },
  { number: "10", label: "Mesajlar", path: "/messages", expected: "Mesajlar", role: "customer", output: "10-messages.png" },
  { number: "11", label: "MoveWallet", path: "/wallet", expected: "MoveWallet", role: "customer", output: "11-wallet.png" },
  { number: "12", label: "Profil", path: "/profile", expected: "Kişisel Bilgiler", role: "customer", output: "12-profile.png" },
  { number: "13", label: "Profesyonel Dashboard", path: "/provider-dashboard", expected: "Bugünkü Kazanç", role: "provider", output: "13-provider-dashboard.png" },
  { number: "14", label: "Yeni İş Fırsatları", path: "/provider-opportunities", expected: "Teklif Ver", role: "opportunity-provider", output: "14-provider-opportunities.png" },
];

let sessionSdk: SessionSdk;

const cleanupOpportunityFixture = async () => {
  const database = await getDb();
  if (!database) return;
  const providerUser = await getUserByOpenId(opportunityProvider.openId);
  const customerUser = await getUserByOpenId(opportunityCustomer.openId);
  if (customerUser) {
    await database.delete(serviceRequests).where(eq(serviceRequests.userId, customerUser.id));
  }
  if (providerUser) {
    await database.delete(providers).where(eq(providers.userId, providerUser.id));
  }
};

const setupOpportunityFixture = async () => {
  await cleanupOpportunityFixture();
  await upsertUser({
    openId: opportunityProvider.openId,
    name: opportunityProvider.name,
    email: "render-provider@movefix.invalid",
    loginMethod: "render-verification",
    role: "user",
  });
  await upsertUser({
    openId: opportunityCustomer.openId,
    name: opportunityCustomer.name,
    email: "render-customer@movefix.invalid",
    loginMethod: "render-verification",
    role: "user",
  });

  const database = await getDb();
  const providerUser = await getUserByOpenId(opportunityProvider.openId);
  const customerUser = await getUserByOpenId(opportunityCustomer.openId);
  const category = await getServiceCategoryBySlug("hvac");
  if (!database || !providerUser || !customerUser || !category) {
    throw new Error("14 ekranı için izole render fixture’ı hazırlanamadı");
  }

  await database.insert(providers).values({
    userId: providerUser.id,
    displayName: opportunityProvider.name,
    bio: "Klima bakım ve onarım uzmanı",
    categoryId: category.id,
    rating: 48,
    completedJobs: 127,
    moveScore: 92,
    isVerified: 1,
    isPremium: 1,
    isAvailable: 1,
  });
  await database.insert(serviceRequests).values({
    userId: customerUser.id,
    categoryId: category.id,
    title: "Klima bakımı gerekiyor",
    description: "Salon kliması yeterince soğutmuyor; bakım ve gaz kontrolü talep ediyorum.",
    address: "Kadıköy, İstanbul",
    budgetMin: 900,
    budgetMax: 1400,
    distanceKm: 4,
    estimatedPrice: 1100,
  });
};

const connect = async (targetUrl: string) => {
  const createResponse = await fetch(
    `http://127.0.0.1:9334/json/new?${encodeURIComponent(targetUrl)}`,
    { method: "PUT" },
  );
  if (!createResponse.ok) throw new Error(`CDP hedefi açılamadı: ${createResponse.status}`);
  const target = (await createResponse.json()) as { webSocketDebuggerUrl: string };
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });

  let nextId = 1;
  const pending = new Map<number, Pending>();
  socket.on("message", (raw: Buffer) => {
    const message = JSON.parse(raw.toString()) as {
      id?: number;
      result?: unknown;
      error?: { message?: string };
    };
    if (!message.id) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message ?? "CDP hatası"));
    else waiter.resolve(message.result);
  });

  const send = <T>(method: string, params: Record<string, unknown> = {}) =>
    new Promise<T>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  return { socket, send };
};

const waitForContent = async (
  send: <T>(method: string, params?: Record<string, unknown>) => Promise<T>,
  expected: string,
) => {
  const deadline = Date.now() + 45_000;
  let lastText = "";
  let lastUrl = "";
  while (Date.now() < deadline) {
    const response = await send<{ result: { value?: string } }>("Runtime.evaluate", {
      expression: "document.body?.innerText ?? ''",
      returnByValue: true,
    });
    const text = response.result.value ?? "";
    lastText = text;
    const locationResponse = await send<{ result: { value?: string } }>("Runtime.evaluate", {
      expression: "window.location.href",
      returnByValue: true,
    });
    lastUrl = locationResponse.result.value ?? "";

    if (text.includes("Unmatched Route") || text.includes("Page could not be found")) {
      throw new Error(`Unmatched Route algılandı; url=${lastUrl}`);
    }

    const normalizedText = text.toLocaleLowerCase("tr-TR");
    if (
      text.includes(expected) &&
      !text.includes("Oturum kontrol ediliyor") &&
      !normalizedText.includes("yükleniyor")
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `${expected} içeriği zamanında render edilmedi; url=${lastUrl}; ekran=${lastText.slice(0, 240).replaceAll("\n", " | ")}`,
  );
};

const verifySession = async (token: string, expectedOpenId: string) => {
  const authUrl = new URL("/api/auth/me", apiBaseUrl);
  const response = await fetch(authUrl, {
    headers: { Cookie: `${COOKIE_NAME}=${token}` },
  });
  if (!response.ok) throw new Error(`Oturum ön kontrolü başarısız: HTTP ${response.status}`);
  const body = (await response.json()) as { user?: { openId?: string }; openId?: string };
  const openId = body.user?.openId ?? body.openId;
  if (openId && openId !== expectedOpenId) {
    throw new Error(`Oturum ön kontrolünde beklenmeyen kullanıcı: ${openId}`);
  }
};

const capture = async (spec: ScreenSpec) => {
  const sessionUser = spec.role === "provider"
    ? provider
    : spec.role === "opportunity-provider"
      ? opportunityProvider
      : customer;
  const token = await sessionSdk.createSessionToken(sessionUser.openId, {
    name: sessionUser.name,
    expiresInMs: 15 * 60 * 1000,
  });
  await verifySession(token, sessionUser.openId);

  const targetUrl = new URL(spec.path, previewUrl).toString();
  const { socket, send } = await connect("about:blank");
  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: "dark" }],
    });
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        try {
          localStorage.setItem("movefix:color-scheme", "dark");
          document.documentElement.dataset.theme = "dark";
          document.documentElement.classList.add("dark");
        } catch {}
      `,
    });

    const previewOrigin = new URL(previewUrl).origin;
    const apiOrigin = new URL(apiBaseUrl).origin;
    await send("Storage.clearDataForOrigin", {
      origin: previewOrigin,
      storageTypes: "local_storage",
    });
    await send("Network.clearBrowserCookies");
    const cookieResult = await send<{ success: boolean }>("Network.setCookie", {
      name: COOKIE_NAME,
      value: token,
      url: `${apiOrigin}/`,
      path: "/",
      secure: apiOrigin.startsWith("https://"),
      httpOnly: true,
      sameSite: "Lax",
    });
    if (!cookieResult.success) throw new Error("Authenticated render cookie ayarlanamadı");

    await send("Page.navigate", { url: targetUrl });
    await waitForContent(send, spec.expected);
    await send("Runtime.evaluate", {
      expression: "document.fonts?.ready ?? Promise.resolve()",
      awaitPromise: true,
    });
    await send("Runtime.evaluate", {
      expression: "window.scrollTo(0, 0)",
    });
    await new Promise((resolve) => setTimeout(resolve, 750));
    const screenshot = await send<{ data: string }>("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: 390, height: 844, scale: 1 },
    });
    await writeFile(`.verification/${spec.output}`, Buffer.from(screenshot.data, "base64"));
    console.log(`${spec.number}/14 ${spec.label}: PASS`);
  } finally {
    try {
      await send("Page.close");
    } catch {
      // Hedef zaten kapanmış olabilir.
    }
    socket.close();
  }
};

const main = async () => {
  const module = await import("../server/_core/sdk");
  sessionSdk = module.sdk;
  await mkdir(".verification", { recursive: true });
  await setupOpportunityFixture();
  try {
    for (const screen of screens) {
      await capture(screen);
    }
  } finally {
    await cleanupOpportunityFixture();
  }
  console.log("01–14 authenticated render görselleri oluşturuldu; Unmatched Route: 0.");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Render doğrulaması başarısız");
  process.exitCode = 1;
});
