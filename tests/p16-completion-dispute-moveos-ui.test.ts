import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("P16 completion dispute MoveOS yüzeyi", () => {
  it("kısmi uzlaşmayı gerçek owner endpointine bağlar ve gateway finalization şartını görünür kılar", async () => {
    const [html, script] = await Promise.all([
      readFile(new URL("../moveos/index.html", import.meta.url), "utf8"),
      readFile(new URL("../moveos/app.js", import.meta.url), "utf8"),
    ]);

    expect(html).toContain('id="completion-disputes-list"');
    expect(html).toContain("MFA + reviewer grant");
    expect(script).toContain("renderCompletionDisputes");
    expect(script).toContain("/api/owner/completion-disputes?limit=20");
    expect(script).toContain("/partial-settlement");
    expect(script).toContain("gateway callback’i");
    expect(script).toContain("Number.isSafeInteger(customerRefundAmount)");
  });
});
