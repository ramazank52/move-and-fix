import "./load-env.js";

import { mkdir, writeFile } from "node:fs/promises";

// Geçici doğrulama betiği; `ws` çalışma zamanı bağımlılığı transitive olarak mevcut.
// @ts-expect-error — bu tek kullanımlık betik için transitive paketin tipleri kurulu değil.
import WebSocket from "ws";

import { COOKIE_NAME } from "../shared/const";

type SessionSdk = {
  createSessionToken: (
    openId: string,
    options: { name: string; expiresInMs: number },
  ) => Promise<string>;
};

let sessionSdk: SessionSdk;

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

const previewUrl = process.env.PREVIEW_URL;
if (!previewUrl) throw new Error("PREVIEW_URL zorunludur");

const customer = {
  openId: "test-customer-open-id",
  name: "Ahmet Müşteri",
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
    const response = await send<{
      result: { value?: string };
    }>("Runtime.evaluate", {
      expression: "document.body?.innerText ?? ''",
      returnByValue: true,
    });
    const text = response.result.value ?? "";
    lastText = text;
    const locationResponse = await send<{
      result: { value?: string };
    }>("Runtime.evaluate", {
      expression: "window.location.href",
      returnByValue: true,
    });
    lastUrl = locationResponse.result.value ?? "";
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
    `${expected} içeriği zamanında render edilmedi; url=${lastUrl}; ekran=${lastText.slice(0, 180).replaceAll("\n", " | ")}`,
  );
};

const capture = async (path: string, expected: string, outputName: string) => {
  const targetUrl = new URL(path, previewUrl).toString();
  const { socket, send } = await connect("about:blank");
  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    const token = await sessionSdk.createSessionToken(customer.openId, {
      name: customer.name,
      expiresInMs: 10 * 60 * 1000,
    });
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) throw new Error("EXPO_PUBLIC_API_BASE_URL zorunludur");
    const apiUrl = new URL("/api/auth/me", apiBaseUrl);
    const authResponse = await fetch(apiUrl, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
    });
    if (!authResponse.ok) {
      throw new Error(`Oturum ön kontrolü başarısız: HTTP ${authResponse.status}`);
    }
    const host = new URL(previewUrl).hostname;
    const cookieDomain = `.${host.split(".").slice(-3).join(".")}`;
    await send("Network.setCookie", {
      name: COOKIE_NAME,
      value: token,
      domain: cookieDomain,
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
    });

    await send("Page.navigate", { url: targetUrl });
    await waitForContent(send, expected);
    await new Promise((resolve) => setTimeout(resolve, 750));

    const dimensions = await send<{
      result: { value: { width: number; height: number } };
    }>("Runtime.evaluate", {
      expression:
        "({ width: Math.max(document.documentElement.scrollWidth, 390), height: Math.max(document.documentElement.scrollHeight, 844) })",
      returnByValue: true,
    });
    const { width, height } = dimensions.result.value;
    const screenshot = await send<{ data: string }>("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    await writeFile(outputName, Buffer.from(screenshot.data, "base64"));
  } finally {
    socket.close();
  }
};

const main = async () => {
  const module = await import("../server/_core/sdk");
  sessionSdk = module.sdk;
  await mkdir(".verification", { recursive: true });
  await capture("/my-jobs", "İşlerim", ".verification/09-my-jobs.png");
  await capture("/messages", "Mesajlar", ".verification/10-messages.png");
  console.log("09–10 authenticated render görselleri oluşturuldu.");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Render doğrulaması başarısız");
  process.exitCode = 1;
});
