import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");
const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("login Safari theme regression contract", () => {
  it("does not force the platform appearance and writes the provider-selected scheme to the web root", () => {
    const provider = readProjectFile("lib/theme-provider.tsx");

    expect(provider).not.toContain("Appearance.setColorScheme");
    expect(provider).toContain('root.dataset.theme = scheme');
    expect(provider).toContain('root.classList.toggle("dark", scheme === "dark")');
    expect(provider).toContain("if (!hasStoredPreference)");
  });

  it("binds login heading and subtitle to the authoritative semantic palette, not class theme output", () => {
    const login = readProjectFile("app/login.tsx");

    expect(login).toContain('style={{ color: colors.foreground, fontSize: 30, fontWeight: "700" }}');
    expect(login).toContain('style={{ color: colors.muted, marginTop: 8, textAlign: "center", fontSize: 16, lineHeight: 24 }}');
    expect(login).not.toContain('className="text-3xl font-bold text-foreground"');
    expect(login).not.toContain('className="mt-2 text-center text-base leading-6 text-muted"');
  });
});
