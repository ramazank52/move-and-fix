import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync("server/db.ts", "utf8");
const deliverySection = dbSource.slice(dbSource.indexOf("export async function deliverMarketplaceOpportunityInApp"), dbSource.indexOf("export async function retryOrDeadLetterMarketplaceOpportunityNotification"));
const enforcementSection = dbSource.slice(dbSource.indexOf("export async function recordProviderCapabilityEnforcementEvent"), dbSource.indexOf("export async function configureProviderOnboarding"));
const cancellationSection = dbSource.slice(dbSource.indexOf("export async function reviewJobCancellation"), dbSource.indexOf("export async function rejectOffer"));
const requestCreateSection = dbSource.slice(dbSource.indexOf("export async function createServiceRequest"), dbSource.indexOf("export async function getServiceRequestMeasurementForOwner"));

describe("P33 opportunity outbox lifecycle contracts", () => {
  it("rechecks current request state and central provider eligibility before an in-app delivery", () => {
    expect(deliverySection).toContain('request.status !== "pending"');
    expect(deliverySection).toContain("assertProviderMarketplaceEligibilityForRequest");
    expect(deliverySection).toContain('transition: "OPPORTUNITY_EXPOSURE"');
    expect(deliverySection).toContain("DELIVERY_ELIGIBILITY_RECHECK_FAILED");
    expect(deliverySection).toContain('status: "revoked"');
    expect(deliverySection.indexOf("assertProviderMarketplaceEligibilityForRequest")).toBeLessThan(deliverySection.indexOf("database.insert(inAppNotifications)"));
  });

  it("revokes queued and processing intents atomically when a request cancellation resolves", () => {
    expect(cancellationSection).toContain("REQUEST_CANCELLED");
    expect(cancellationSection).toContain("REQUEST_CANCELLED_REFUND");
    expect(cancellationSection).toContain("REQUEST_CANCELLED_PARTIAL_REFUND");
    expect(cancellationSection).toContain('inArray(marketplaceOpportunityNotifications.status, ["queued", "processing"])');
  });

  it("revokes queued and processing provider intents for suspend/block enforcement but not release", () => {
    expect(enforcementSection).toContain('if (input.action !== "release")');
    expect(enforcementSection).toContain("PROVIDER_ENFORCEMENT_");
    expect(enforcementSection).toContain("eq(marketplaceOpportunityNotifications.providerId, profile.providerId)");
  });

  it("writes a bounded, idempotent in-app opportunity intent only inside the explicit private-staging request-create transaction", () => {
    expect(requestCreateSection).toContain('process.env.MARKETPLACE_OUTBOX_RUNTIME === "private_staging"');
    expect(requestCreateSection).toContain('process.env.MARKETPLACE_OUTBOX_ENQUEUE_ENABLED === "true"');
    expect(requestCreateSection).toContain("if (outboxEnqueueEnabled)");
    expect(requestCreateSection).toContain('reasonCode: "REQUEST_CREATED"');
    expect(requestCreateSection).toContain("onDuplicateKeyUpdate");
    expect(requestCreateSection.indexOf("tx.insert(serviceRequests)")).toBeLessThan(requestCreateSection.indexOf("tx.insert(marketplaceOpportunityNotifications)"));
    expect(requestCreateSection).not.toContain("push");
    expect(requestCreateSection).not.toContain("sendSms");
    expect(requestCreateSection).not.toContain("sendEmail");
  });
});
