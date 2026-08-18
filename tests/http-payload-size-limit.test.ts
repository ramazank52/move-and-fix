import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../server/_core/index";

const JSON_BODY_LIMIT_BYTES = 50 * 1024 * 1024;

describe("HTTP request body size limit", () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    server = createServer(await createApp());
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("returns an explicit 413 JSON response before routing an oversized JSON upload", async () => {
    const result = await new Promise<{ statusCode: number; body: unknown }>((resolve, reject) => {
      const prefix = '{"payload":"';
      const suffix = '"}';
      const oversizedPayloadBytes = JSON_BODY_LIMIT_BYTES + 1;
      const contentLength = Buffer.byteLength(prefix) + oversizedPayloadBytes + Buffer.byteLength(suffix);
      let settled = false;
      const req = request({
        hostname: "127.0.0.1",
        port,
        path: "/api/health",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(contentLength),
        },
      }, (response) => {
        let responseBody = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          responseBody += chunk;
        });
        response.once("end", () => {
          settled = true;
          resolve({
            statusCode: response.statusCode ?? 0,
            body: JSON.parse(responseBody) as unknown,
          });
        });
      });
      req.once("error", (error) => {
        // The server may close the request body after it has returned the 413.
        if (!settled) reject(error);
      });
      req.write(prefix);
      const chunk = Buffer.alloc(1024 * 1024, "a");
      let remaining = oversizedPayloadBytes;
      while (remaining > 0) {
        const nextChunk = remaining >= chunk.length ? chunk : chunk.subarray(0, remaining);
        req.write(nextChunk);
        remaining -= nextChunk.length;
      }
      req.end(suffix);
    });

    expect(result.statusCode).toBe(413);
    expect(result.body).toMatchObject({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "İstek gövdesi en fazla 50 MB olabilir",
      },
    });
  }, 30_000);
});
