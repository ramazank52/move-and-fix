/**
 * Development/staging-only visual harness scaffold.
 *
 * This script deliberately refuses to mutate when environment separation is
 * not explicit. It has no production build import path. Fixture rows are
 * tagged with one run ID and the cleanup query only targets exact IDs emitted
 * to its private /tmp manifest. Screenshot execution is intentionally not
 * enabled by default: a configured non-native visual backend is required.
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";

import { providers, users } from "../drizzle/schema";
import { getDb, getServiceCategoryBySlug, getUserByOpenId, upsertUser } from "../server/db";
import { assertThemeHarnessPreflight, deriveThemeHarnessRoutes } from "./theme-runtime-harness-lib";

type FixtureManifest = {
  runId: string;
  createdAt: string;
  expiresAt: string;
  loginMethod: string;
  customerOpenId: string;
  providerOpenId: string;
  providerUserId?: number;
};

const fixtureRoot = "/tmp/movefix-theme-runtime-harness";
const runId = process.env.THEME_HARNESS_RUN_ID ?? `theme-${randomUUID()}`;
const manifestPath = join(fixtureRoot, `${runId}.json`);
const fixtureTag = `theme-runtime-harness:${runId}`;
const ttlMs = 30 * 60 * 1000;

async function writeManifest(manifest: FixtureManifest) {
  await mkdir(fixtureRoot, { recursive: true, mode: 0o700 });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
}

async function readManifest(): Promise<FixtureManifest | null> {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as FixtureManifest;
  } catch {
    return null;
  }
}

async function scopedCounts(manifest: FixtureManifest) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const customer = await db.select({ id: users.id }).from(users).where(and(eq(users.openId, manifest.customerOpenId), eq(users.loginMethod, manifest.loginMethod)));
  const provider = await db.select({ id: users.id }).from(users).where(and(eq(users.openId, manifest.providerOpenId), eq(users.loginMethod, manifest.loginMethod)));
  const providerRecords = provider.length
    ? await db.select({ id: providers.id }).from(providers).where(eq(providers.userId, provider[0].id))
    : [];
  return { users: customer.length + provider.length, providers: providerRecords.length };
}

async function cleanupExactRun(manifest: FixtureManifest) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const before = await scopedCounts(manifest);
  const provider = await getUserByOpenId(manifest.providerOpenId);
  if (provider?.loginMethod === manifest.loginMethod) {
    await db.delete(providers).where(eq(providers.userId, provider.id));
  }
  // Every delete is constrained by both the exact openId and run-specific tag.
  await db.delete(users).where(and(eq(users.openId, manifest.customerOpenId), eq(users.loginMethod, manifest.loginMethod)));
  await db.delete(users).where(and(eq(users.openId, manifest.providerOpenId), eq(users.loginMethod, manifest.loginMethod)));
  const after = await scopedCounts(manifest);
  if (after.users !== 0 || after.providers !== 0) throw new Error("SCOPED_CLEANUP_ORPHANS_REMAIN");
  await rm(manifestPath, { force: true });
  return { before, after };
}

async function recoverCurrentRunIfPresent() {
  const manifest = await readManifest();
  if (!manifest) return null;
  // Crash recovery is still scoped to the exact persisted run ID.
  return cleanupExactRun(manifest);
}

async function createFixture() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const manifest: FixtureManifest = {
    runId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    loginMethod: fixtureTag,
    customerOpenId: `${runId}-customer`,
    providerOpenId: `${runId}-provider`,
  };
  const existing = await scopedCounts(manifest);
  if (existing.users !== 0 || existing.providers !== 0) throw new Error("RUN_ID_COLLISION_OR_ORPHAN");
  await writeManifest(manifest);
  await upsertUser({
    openId: manifest.customerOpenId,
    name: `Synthetic Customer ${runId.slice(-8)}`,
    email: `${runId}-customer@theme-harness.invalid`,
    loginMethod: manifest.loginMethod,
    role: "user",
  });
  await upsertUser({
    openId: manifest.providerOpenId,
    name: `Synthetic Provider ${runId.slice(-8)}`,
    email: `${runId}-provider@theme-harness.invalid`,
    loginMethod: manifest.loginMethod,
    role: "user",
  });
  const providerUser = await getUserByOpenId(manifest.providerOpenId);
  const category = await getServiceCategoryBySlug("hvac");
  if (!providerUser || !category) throw new Error("FIXTURE_PREREQUISITE_UNAVAILABLE");
  manifest.providerUserId = providerUser.id;
  await writeManifest(manifest);
  await db.insert(providers).values({
    userId: providerUser.id,
    displayName: `Synthetic Provider ${runId.slice(-8)}`,
    bio: `Synthetic theme harness fixture ${runId}`,
    categoryId: category.id,
    rating: 50,
    completedJobs: 0,
    moveScore: 0,
    isVerified: 0,
    isPremium: 0,
    isAvailable: 0,
  });
  return manifest;
}

async function main() {
  const preflight = assertThemeHarnessPreflight(process.env, runId);
  const report = {
    preflight,
    fixtureMode: process.argv.includes("--fixture-smoke"),
    visualBackend: process.env.THEME_HARNESS_VISUAL_BACKEND ?? "NOT_CONFIGURED",
    routes: await deriveThemeHarnessRoutes(join(process.cwd(), "app")),
    before: null as unknown,
    cleanup: null as unknown,
    status: "BLOCKED_PRECHECK" as "BLOCKED_PRECHECK" | "PASS_FIXTURE_CLEANUP" | "BLOCKED_VISUAL_BACKEND",
  };

  if (!preflight.approved) {
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 2;
    return;
  }

  await recoverCurrentRunIfPresent();
  if (!process.argv.includes("--fixture-smoke")) {
    report.status = "BLOCKED_VISUAL_BACKEND";
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const manifest = await createFixture();
  try {
    report.before = await scopedCounts(manifest);
    // A visual backend is intentionally an explicit later dependency. No
    // unapproved browser/native automation or external delivery runs here.
    report.status = "PASS_FIXTURE_CLEANUP";
  } finally {
    report.cleanup = await cleanupExactRun(manifest);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (error) => {
  const manifest = await readManifest();
  if (manifest) {
    try {
      await cleanupExactRun(manifest);
    } catch {
      // The private manifest preserves exact IDs for an explicit recovery run.
    }
  }
  console.error(error instanceof Error ? error.message : "THEME_HARNESS_FAILED");
  process.exitCode = 1;
});
