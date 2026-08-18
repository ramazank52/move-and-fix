import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const legacyRoutePath = resolve(process.cwd(), "app/verify/phone.tsx");

describe("legacy phone verification route", () => {
  it("redirects legacy deep links to the canonical server-backed OTP route", () => {
    const source = readFileSync(legacyRoutePath, "utf8");

    expect(source).toContain('Redirect href="/verify-phone"');
    expect(source).not.toMatch(/setTimeout\s*\(/);
    expect(source).not.toMatch(/Telefon Doğrulandı|fake|simulat/i);
  });
});
