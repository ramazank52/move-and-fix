import {
  claimMarketplaceOpportunityNotifications,
  deliverMarketplaceOpportunityInApp,
  retryOrDeadLetterMarketplaceOpportunityNotification,
} from "../db";

/**
 * Explicitly invoked worker primitive. It only writes the in-app inbox; it does
 * not call push, SMS, email or any external provider. Scheduling is deliberately
 * absent until a private staging runtime and reviewed migration exist.
 */
export async function processOpportunityOutboxBatch(limit = 25) {
  const claimed = await claimMarketplaceOpportunityNotifications({ limit });
  let delivered = 0;
  let retried = 0;
  let deadLettered = 0;
  for (const intent of claimed) {
    try {
      await deliverMarketplaceOpportunityInApp(intent);
      delivered += 1;
    } catch (error) {
      const code = error instanceof Error ? error.message : "OPPORTUNITY_OUTBOX_DELIVERY_FAILED";
      const result = await retryOrDeadLetterMarketplaceOpportunityNotification({ id: intent.id, claimToken: intent.claimToken, errorCode: code });
      if (result.deadLetter) deadLettered += 1;
      else retried += 1;
    }
  }
  return { claimed: claimed.length, delivered, retried, deadLettered } as const;
}
