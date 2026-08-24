import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildOpportunityNotificationIntent } from "../server/matching/OpportunityNotificationPolicy";

describe("opportunity outbox worker contract", () => {
  const schema = readFileSync(join(process.cwd(), "drizzle/schema.ts"), "utf8");
  const dbSource = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");
  const worker = readFileSync(join(process.cwd(), "server/matching/OpportunityOutboxWorker.ts"), "utf8");

  it("uses an idempotent provider/request/type key and a provider-only deep link", () => {
    const intent = buildOpportunityNotificationIntent({ requestId: 17, providerId: 23, type: "opportunity_available", reasonCode: "ELIGIBLE" });
    expect(intent.idempotencyKey).toBe("opportunity:opportunity_available:17:23");
    expect(intent.deepLink).toBe("/provider-opportunities?requestId=17");
    expect(intent).not.toHaveProperty("customerEmail");
  });

  it("defines lease, retry, dead-letter and revoke state without external delivery", () => {
    expect(schema).toContain('"processing"');
    expect(schema).toContain('"dead_letter"');
    expect(schema).toContain("claimUntil");
    expect(dbSource).toContain("claimMarketplaceOpportunityNotifications");
    expect(dbSource).toContain("retryOrDeadLetterMarketplaceOpportunityNotification");
    expect(dbSource).toContain("revokeMarketplaceOpportunityNotifications");
    expect(worker).toContain("deliverMarketplaceOpportunityInApp");
    expect(worker).not.toMatch(/sendPush|sendSms|sendEmail|NotificationService/);
  });

  it("stores only a generic in-app title/body and request deep link", () => {
    expect(dbSource).toContain('title: input.eventType === "opportunity_available" ? "Yeni iş fırsatı"');
    expect(dbSource).toContain("Uygun olduğunuz yeni bir iş fırsatı var.");
    expect(dbSource).not.toContain("customerEmail");
    expect(dbSource).not.toContain("customerPhone");
  });

  it("requires explicit private staging opt-in for automatic worker lifecycle", () => {
    const serverSource = readFileSync(join(process.cwd(), "server/_core/index.ts"), "utf8");
    expect(worker).toContain('input.runtime !== "private_staging"');
    expect(serverSource).toContain('MARKETPLACE_OUTBOX_WORKER_ENABLED === "true"');
    expect(serverSource).toContain("MARKETPLACE_OUTBOX_RUNTIME");
    expect(serverSource).toContain('process.once("SIGTERM", stopOutboxWorker)');
  });

  it("revokes queued or leased opportunities in the offer acceptance transaction", () => {
    const acceptance = dbSource.slice(dbSource.indexOf("export async function acceptOffer"), dbSource.indexOf("export async function rejectOffer"));
    expect(acceptance).toContain("REQUEST_ASSIGNED");
    expect(acceptance).toContain("marketplaceOpportunityNotifications");
    expect(acceptance).toContain('["queued", "processing"]');
  });
});
