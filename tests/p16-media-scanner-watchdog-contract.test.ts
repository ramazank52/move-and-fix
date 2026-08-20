import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("P16 media scanner watchdog and scheduler-secret contract", () => {
  it("recovers only elapsed dispatched jobs through the existing bounded failure policy", () => {
    const dbSource = source("server/db.ts");
    expect(dbSource).toContain("export async function recoverTimedOutMediaScannerJobs");
    expect(dbSource).toContain('eq(mediaScannerJobs.status, "dispatched")');
    expect(dbSource).toContain("lte(mediaScannerJobs.nextAttemptAt, now)");
    expect(dbSource).toContain('reason: "MEDIA_SCANNER_CALLBACK_TIMEOUT"');
    expect(dbSource).toContain("timeoutOnly: true");
    expect(dbSource).toContain("MEDIA_SCANNER_JOB_NOT_TIMED_OUT");
    expect(dbSource).toContain("decideMediaScannerDispatchFailure");
  });

  it("keeps scanner scheduler authorization separate from callback signing authority", () => {
    const indexSource = source("server/_core/index.ts");
    const environmentSource = source("server/security/EnvironmentContract.ts");
    expect(environmentSource).toContain('mediaScannerCronSecret: { canonicalName: "MEDIA_SCANNER_CRON_SECRET" }');
    expect(indexSource).toContain('app.post("/api/scheduled/media-scanner-watchdog"');
    expect(indexSource).toContain("const configuredSecret = ENV.mediaScannerCronSecret;");
    expect(indexSource).toContain("MEDIA_SCANNER_CRON_NOT_CONFIGURED");
    const dispatchStart = indexSource.indexOf('app.post("/api/scheduled/media-scanner-dispatch"');
    const dispatchEnd = indexSource.indexOf('app.post("/api/scheduled/media-scanner-watchdog"');
    expect(indexSource.slice(dispatchStart, dispatchEnd)).not.toContain("ENV.mediaScannerCallbackSecret");
  });

  it("preserves quarantined media during watchdog recovery and dead-letters only after bounded retries", () => {
    const dbSource = source("server/db.ts");
    expect(dbSource).toContain('quarantineStatus: "scan_failed"');
    expect(dbSource).toContain("operationalReviewRequired: failure.operationalReviewRequired ? 1 : 0");
    expect(dbSource).not.toContain('reason: "MEDIA_SCANNER_CALLBACK_TIMEOUT",\n        now,\n        timeoutOnly: true,\n        accepted: true');
  });
});
