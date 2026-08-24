import { describe, expect, it } from "vitest";

// theme.config.js is intentionally the runtime source of truth used by NativeWind
// and the useColors palette builder.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { themeColors } = require("../theme.config");

function luminance(hex: string) {
  const channels = hex.match(/[A-Fa-f0-9]{2}/g)!.map((value: string) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((channel: number) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("login signup semantic theme token", () => {
  it("uses opaque white in dark mode and the semantic foreground primary text in light mode", () => {
    expect(themeColors.authSignupText.dark).toBe("#FFFFFF");
    expect(themeColors.authSignupText.light).toBe(themeColors.foreground.light);
    expect(contrastRatio(themeColors.authSignupText.dark, themeColors.background.dark)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(themeColors.authSignupText.light, themeColors.background.light)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the login heading and semantic muted subtitle at WCAG AA contrast in both schemes", () => {
    for (const scheme of ["light", "dark"] as const) {
      expect(contrastRatio(themeColors.foreground[scheme], themeColors.background[scheme])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(themeColors.muted[scheme], themeColors.background[scheme])).toBeGreaterThanOrEqual(4.5);
    }
  });
});
