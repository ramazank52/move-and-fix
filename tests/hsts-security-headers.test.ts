import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../server/_core/index";
import { isTrustedHttpsRequest } from "../server/_core/security";

describe("production HSTS response contract", () => {
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
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = originalNodeEnv;
  });

  it("returns the exact HSTS policy for a production HTTPS request through the trusted proxy", async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { "X-Forwarded-Proto": "https" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains; preload",
    );
  });

  it("does not return HSTS for an HTTP request, even when the server is in production mode", async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("strict-transport-security")).toBeNull();
  });

  it("does not trust spoofed forwarded HTTPS metadata from a non-loopback peer", () => {
    const spoofedRequest = {
      secure: false,
      socket: { remoteAddress: "203.0.113.42" },
      headers: { "x-forwarded-proto": "https" },
    };

    expect(isTrustedHttpsRequest(spoofedRequest as never)).toBe(false);
  });
});

describe("development HSTS response contract", () => {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  const originalNodeEnv = process.env.NODE_ENV;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    mutableEnvironment.NODE_ENV = "development";
    server = createServer(await createApp());
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = originalNodeEnv;
  });

  it("does not return HSTS for a localhost development request claiming HTTPS", async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { "X-Forwarded-Proto": "https" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("strict-transport-security")).toBeNull();
  });
});
