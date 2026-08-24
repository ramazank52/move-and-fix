import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export type ThemeHarnessPreflight = {
  approved: boolean;
  environment: "development" | "test" | "staging";
  runId: string;
  blockers: string[];
  previewHost: string;
  apiHost: string;
};

export type ThemeHarnessRoute = {
  route: string;
  source: string;
  role: "public" | "customer" | "provider" | "owner_admin";
  dynamic: boolean;
};

const PRODUCTION_MARKERS = /(^|[-_.])(prod|production)([-_.]|$)|moveandfix\.app/i;

function parseAllowedPreviewHost(raw: string | undefined, label: string): string {
  if (!raw) throw new Error(`${label} is required for the theme runtime harness`);
  const host = new URL(raw).hostname.toLowerCase();
  const allowed = host === "localhost" || host === "127.0.0.1" || host.endsWith(".manus.computer");
  if (!allowed || PRODUCTION_MARKERS.test(host)) {
    throw new Error(`${label} is not an approved non-production hostname`);
  }
  return host;
}

/**
 * Refuses before any database mutation. An explicit staging acknowledgement is
 * deliberately required in addition to non-production host/Node checks.
 */
export function assertThemeHarnessPreflight(env: NodeJS.ProcessEnv, runId: string): ThemeHarnessPreflight {
  const blockers: string[] = [];
  const nodeEnv = env.NODE_ENV;
  const harnessEnvironment = env.HARNESS_ENVIRONMENT;

  if (nodeEnv === "production") blockers.push("NODE_ENV_PRODUCTION");
  if (!harnessEnvironment || !["development", "test", "staging"].includes(harnessEnvironment)) {
    blockers.push("HARNESS_ENVIRONMENT_NOT_EXPLICIT_NON_PRODUCTION");
  }
  if (env.HARNESS_ALLOW_STAGING !== "1") blockers.push("HARNESS_ALLOW_STAGING_NOT_ACKNOWLEDGED");
  if (!env.DATABASE_URL) blockers.push("DATABASE_URL_MISSING");
  if (env.DATABASE_URL && PRODUCTION_MARKERS.test(env.DATABASE_URL)) blockers.push("DATABASE_URL_PRODUCTION_MARKER");

  let previewHost = "unavailable";
  let apiHost = "unavailable";
  try {
    previewHost = parseAllowedPreviewHost(env.PREVIEW_URL, "PREVIEW_URL");
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : "PREVIEW_URL_INVALID");
  }
  try {
    apiHost = parseAllowedPreviewHost(env.EXPO_PUBLIC_API_BASE_URL, "EXPO_PUBLIC_API_BASE_URL");
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : "EXPO_PUBLIC_API_BASE_URL_INVALID");
  }

  if (!/^theme-[a-z0-9-]{8,}$/i.test(runId)) blockers.push("RUN_ID_INVALID");

  return {
    approved: blockers.length === 0,
    environment: (harnessEnvironment as ThemeHarnessPreflight["environment"]) ?? "development",
    runId,
    blockers,
    previewHost,
    apiHost,
  };
}

export function classifyThemeHarnessRoute(source: string): ThemeHarnessRoute["role"] {
  const normalized = source.replaceAll("\\", "/").toLowerCase();
  if (/(^|\/)(admin|owner|moveos)(\/|\.|$)/.test(normalized)) return "owner_admin";
  if (/(^|\/)(provider|professional)(?:[._/-]|$)/.test(normalized)) return "provider";
  if (/(login|register|forgot-password|reset-password|onboarding)/.test(normalized)) return "public";
  return "customer";
}

function routeFromSource(source: string): string {
  const withoutExtension = source.replace(/\.(tsx|ts)$/, "");
  const segments = withoutExtension.split("/").filter((segment) => !segment.startsWith("("));
  const terminal = segments.at(-1);
  if (terminal === "index") segments.pop();
  return `/${segments.join("/")}`.replace(/\/+$/, "") || "/";
}

async function listRouteFiles(root: string, directory = root): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const collected: string[] = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await listRouteFiles(root, absolute)));
      continue;
    }
    if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name) && !entry.name.startsWith("_")) {
      collected.push(relative(root, absolute));
    }
  }
  return collected;
}

export async function deriveThemeHarnessRoutes(appDirectory: string): Promise<ThemeHarnessRoute[]> {
  const files = await listRouteFiles(appDirectory);
  return files
    .map((source) => ({
      route: routeFromSource(source.split(sep).join("/")),
      source: `app/${source.split(sep).join("/")}`,
      role: classifyThemeHarnessRoute(source),
      dynamic: /\[[^\]]+\]/.test(source),
    }))
    .sort((left, right) => left.route.localeCompare(right.route) || left.source.localeCompare(right.source));
}
