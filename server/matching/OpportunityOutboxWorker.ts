import {
  claimMarketplaceOpportunityNotifications,
  deliverMarketplaceOpportunityInApp,
  retryOrDeadLetterMarketplaceOpportunityNotification,
} from "../db";

/**
 * Explicitly invoked worker primitive. It only writes the in-app inbox; it does
 * not call push, SMS, email or any external provider. It is invoked only by the
 * explicit private-staging opt-in lifecycle after the reviewed migration exists.
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

export type OpportunityOutboxWorkerHandle = {
  stop: () => void;
};

/**
 * Starts only when a private staging operator explicitly enables the worker
 * after the reviewed outbox migration has been applied. The worker has no
 * external provider path and never starts in production by default.
 */
export function startOpportunityOutboxWorker(input: {
  enabled: boolean;
  runtime: string | undefined;
  intervalMs: number;
  onError?: (error: unknown) => void;
}): OpportunityOutboxWorkerHandle | null {
  if (!input.enabled || input.runtime !== "private_staging") return null;
  const intervalMs = Math.min(Math.max(Math.floor(input.intervalMs), 1_000), 60_000);
  let stopped = false;
  let running = false;
  const run = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await processOpportunityOutboxBatch();
    } catch (error) {
      input.onError?.(error);
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), intervalMs);
  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}
