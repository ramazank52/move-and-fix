import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../server/_core/index";

describe("P18 production public-exposure contract", () => {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  const originalNodeEnv = process.env.NODE_ENV;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    mutableEnvironment.NODE_ENV = "production";
    server = createServer(await createApp());
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = originalNodeEnv;
  });

  it("keeps public liveness minimal and closes detailed diagnostics", async () => {
    const liveness = await fetch(`${baseUrl}/api/health`);
    expect(liveness.status).toBe(200);
    expect(await liveness.json()).toEqual({ status: "ok" });

    const detailed = await fetch(`${baseUrl}/api/health/detailed`);
    expect(detailed.status).toBe(404);
    expect(await detailed.json()).toEqual({ error: "NOT_FOUND" });
  });

  it("closes OpenAPI and interactive docs in production without redirecting to a CDN", async () => {
    for (const path of ["/api-docs", "/api-docs/ui"]) {
      const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
      expect(response.status).toBe(404);
      expect(response.headers.get("location")).toBeNull();
      expect(await response.json()).toEqual({ error: "NOT_FOUND" });
    }
  });
});
