import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const appRoot = resolve(process.cwd(), "app");
const blockedProductionMarkers = [
  /SAMPLE_/i,
  /example\.com\/voice/i,
  /\bAhmet Yılmaz\b/i,
  /\bMehmet Demir\b/i,
  /\bAli (Kaya|Çekici)\b/i,
  /placeholder map/i,
];
const legacyCompatibilityRoutes = [
  "/map",
  "/calendar",
  "/history-report",
  "/referral",
  "/notifications",
  "/chat/voice-message",
  "/portfolio/",
  "/service/tracking",
] as const;
const legacyRouteFiles = new Set([
  "map.tsx",
  "calendar.tsx",
  "history-report.tsx",
  "referral.tsx",
  "notifications.tsx",
  "chat/voice-message.tsx",
  "portfolio/[id].tsx",
  "service/tracking.tsx",
]);

function collectProductionRoutes(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const relativePath = relative(appRoot, path);

    if (relativePath === "dev") {
      return [];
    }

    if (statSync(path).isDirectory()) {
      return collectProductionRoutes(path);
    }

    return /\.(?:ts|tsx)$/.test(path) ? [path] : [];
  });
}

describe("production route hygiene", () => {
  it("does not ship known demo identities, audio URLs, sample fixtures, or map placeholders", () => {
    const findings = collectProductionRoutes(appRoot).flatMap((routePath) => {
      const source = readFileSync(routePath, "utf8");
      return blockedProductionMarkers
        .filter((marker) => marker.test(source))
        .map((marker) => `${relative(appRoot, routePath)}:${marker}`);
    });

    expect(findings).toEqual([]);
  });

  it("keeps retired demo routes out of normal production navigation and as data-free redirects only", () => {
    const sources = collectProductionRoutes(appRoot).map((routePath) => ({
      relativePath: relative(appRoot, routePath),
      source: readFileSync(routePath, "utf8"),
    }));

    const activeCallers = sources.flatMap(({ relativePath, source }) => {
      if (legacyRouteFiles.has(relativePath)) return [];
      return legacyCompatibilityRoutes
        .filter((route) => source.includes(`"${route}"`) || source.includes(`'${route}'`))
        .map((route) => `${relativePath}:${route}`);
    });
    const compatibilityRouteViolations = sources
      .filter(({ relativePath }) => legacyRouteFiles.has(relativePath))
      .flatMap(({ relativePath, source }) =>
        source.includes("<Redirect href=") && !blockedProductionMarkers.some((marker) => marker.test(source))
          ? []
          : [relativePath],
      );

    expect(activeCallers).toEqual([]);
    expect(compatibilityRouteViolations).toEqual([]);
  });
});
