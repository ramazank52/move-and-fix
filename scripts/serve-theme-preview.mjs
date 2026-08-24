import { createServer } from "node:http";
import { renderFixtureDetail, renderGallery } from "./theme-preview-fixtures.mjs";

const port = Number(process.env.THEME_PREVIEW_PORT ?? "8082");

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("THEME_PREVIEW_PORT 1024–65535 arasında bir port olmalıdır.");
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const fixtureMatch = /^\/fixture\/(\d{2})$/.exec(url.pathname);
  const html = url.pathname === "/" || url.pathname === "/index.html"
    ? renderGallery()
    : fixtureMatch
      ? renderFixtureDetail(fixtureMatch[1])
      : null;

  if (!html) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "Content-Type": "text/html; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(request.method === "HEAD" ? undefined : html);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Theme preview listening on http://127.0.0.1:${port}`);
});
