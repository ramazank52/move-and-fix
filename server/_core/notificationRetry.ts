import { clearInterval, setInterval } from 'node:timers';

/**
 * Notification Retry Mechanism
 * 
 * Implements exponential backoff retry logic for failed notifications
 * Ensures reliable delivery of critical notifications
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

export interface RetryableNotification {
  id: string;
  type: 'push' | 'sms' | 'email' | 'in-app';
  userId: string;
  data: unknown;
  retryCount: number;
  lastRetryAt?: Date;
  nextRetryAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'permanent_failure';
  error?: string;
  createdAt: Date;
}

/**
 * Notification Retry Service
 */
export class NotificationRetryService {
  private retryConfig: RetryConfig;
  private retryQueue = new Map<string, RetryableNotification>();
  private failedNotifications = new Map<string, RetryableNotification>();

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = {
      maxRetries: config.maxRetries ?? 5,
      initialDelayMs: config.initialDelayMs ?? 1000,
      maxDelayMs: config.maxDelayMs ?? 3600000, // 1 hour
      backoffMultiplier: config.backoffMultiplier ?? 2,
      jitterFactor: config.jitterFactor ?? 0.1
    };
  }

  /**
   * Calculate next retry delay using exponential backoff with jitter
   */
  calculateNextRetryDelay(retryCount: number): number {
    // Exponential backoff: delay = initialDelay * (multiplier ^ retryCount)
    let delay = this.retryConfig.initialDelayMs * 
      Math.pow(this.retryConfig.backoffMultiplier, retryCount);

    // Cap at maximum delay
    delay = Math.min(delay, this.retryConfig.maxDelayMs);

    // Add jitter to prevent thundering herd
    const jitter = delay * this.retryConfig.jitterFactor * (Math.random() * 2 - 1);
    delay = Math.max(0, delay + jitter);

    return Math.round(delay);
  }

  /**
   * Add notification to retry queue
   */
  addToRetryQueue(notification: RetryableNotification): void {
    const delay = this.calculateNextRetryDelay(notification.retryCount);
    notification.nextRetryAt = new Date(Date.now() + delay);
    notification.retryCount++;

    this.retryQueue.set(notification.id, notification);

    console.log(`[RETRY] Notification ${notification.id} queued for retry in ${delay}ms (attempt ${notification.retryCount}/${this.retryConfig.maxRetries})`);
  }

  /**
   * Mark notification as failed permanently
   */
  markAsPermanentFailure(
    notification: RetryableNotification,
    error: string
  ): void {
    notification.status = 'permanent_failure';
    notification.error = error;
    this.failedNotifications.set(notification.id, notification);
    this.retryQueue.delete(notification.id);

    console.error(`[RETRY] Notification ${notification.id} marked as permanent failure: ${error}`);
  }

  /**
   * Retry failed notification
   */
  async retryNotification(
    notification: RetryableNotification,
    retryFunction: (notification: RetryableNotification) => Promise<boolean>
  ): Promise<boolean> {
    try {
      if (notification.retryCount >= this.retryConfig.maxRetries) {
        this.markAsPermanentFailure(
          notification,
          `Max retries (${this.retryConfig.maxRetries}) exceeded`
        );
        return false;
      }

      notification.lastRetryAt = new Date();
      const success = await retryFunction(notification);

      if (success) {
        notification.status = 'sent';
        this.retryQueue.delete(notification.id);
        console.log(`[RETRY] Notification ${notification.id} sent successfully on retry ${notification.retryCount}`);
        return true;
      } else {
        // Retry failed, add back to queue
        this.addToRetryQueue(notification);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if error is permanent (e.g., invalid email, invalid phone)
      if (this.isPermanentError(errorMessage)) {
        this.markAsPermanentFailure(notification, errorMessage);
        return false;
      }

      // Temporary error, retry
      this.addToRetryQueue(notification);
      return false;
    }
  }

  /**
   * Check if error is permanent (should not retry)
   */
  private isPermanentError(error: string): boolean {
    const permanentErrors = [
      'invalid_email',
      'invalid_phone',
      'user_not_found',
      'invalid_token',
      'unauthorized',
      'forbidden',
      'not_found',
      'invalid_request',
      'rate_limit_exceeded' // Actually temporary, but handled separately
    ];

    return permanentErrors.some(err => error.toLowerCase().includes(err));
  }

  /**
   * Get notifications ready for retry
   */
  getReadyForRetry(): RetryableNotification[] {
    const now = new Date();
    const ready: RetryableNotification[] = [];

    for (const [, notification] of this.retryQueue) {
      if (notification.nextRetryAt && notification.nextRetryAt <= now) {
        ready.push(notification);
      }
    }

    return ready;
  }

  /**
   * Process retry queue
   */
  async processRetryQueue(
    retryFunction: (notification: RetryableNotification) => Promise<boolean>
  ): Promise<{ succeeded: number; failed: number }> {
    const ready = this.getReadyForRetry();
    let succeeded = 0;
    let failed = 0;

    for (const notification of ready) {
      const success = await this.retryNotification(notification, retryFunction);
      if (success) {
        succeeded++;
      } else {
        failed++;
      }

      // Add small delay between retries to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[RETRY] Processed ${ready.length} notifications: ${succeeded} succeeded, ${failed} failed`);

    return { succeeded, failed };
  }

  /**
   * Get retry statistics
   */
  getStats(): {
    pending: number;
    failed: number;
    totalRetries: number;
  } {
    let totalRetries = 0;

    for (const notification of this.retryQueue.values()) {
      totalRetries += notification.retryCount;
    }

    return {
      pending: this.retryQueue.size,
      failed: this.failedNotifications.size,
      totalRetries
    };
  }

  /**
   * Get failed notifications
   */
  getFailedNotifications(): RetryableNotification[] {
    return Array.from(this.failedNotifications.values());
  }

  /**
   * Clear failed notifications older than specified time
   */
  clearOldFailedNotifications(ageMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - ageMs;
    let cleared = 0;

    for (const [id, notification] of this.failedNotifications) {
      if (notification.createdAt.getTime() < cutoff) {
        this.failedNotifications.delete(id);
        cleared++;
      }
    }

    console.log(`[RETRY] Cleared ${cleared} old failed notifications`);
    return cleared;
  }
}

/**
 * Retry decorator for notification functions
 */
export function retryable(
  retryService: NotificationRetryService,
  maxRetries: number = 5
) {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(
      this: unknown,
      ...args: unknown[]
    ) => unknown>
  ): TypedPropertyDescriptor<(
    this: unknown,
    ...args: unknown[]
  ) => unknown> {
    const originalMethod = descriptor.value;

    if (!originalMethod) {
      throw new TypeError('The retryable decorator can only be applied to methods');
    }

    descriptor.value = async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < maxRetries) {
            const delay = retryService.calculateNextRetryDelay(attempt);
            console.warn(
              `[RETRY] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms`,
              lastError.message
            );
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError ?? new Error('Retryable method failed without an error');
    };

    return descriptor;
  };
}

/**
 * Batch retry processor for notifications
 */
export class BatchRetryProcessor {
  private retryService: NotificationRetryService;
  private processingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(retryService: NotificationRetryService) {
    this.retryService = retryService;
  }

  /**
   * Start batch processing
   */
  start(
    intervalMs: number = 30000, // 30 seconds
    retryFunction?: (notification: RetryableNotification) => Promise<boolean>
  ): void {
    if (this.processingInterval) {
      console.warn('[RETRY] Batch processor already running');
      return;
    }

    console.log(`[RETRY] Starting batch retry processor (interval: ${intervalMs}ms)`);

    this.processingInterval = setInterval(async () => {
      if (retryFunction) {
        await this.retryService.processRetryQueue(retryFunction);
      }

      // Clean up old failed notifications
      this.retryService.clearOldFailedNotifications();

      // Log stats
      const stats = this.retryService.getStats();
      if (stats.pending > 0 || stats.failed > 0) {
        console.log('[RETRY] Stats:', stats);
      }
    }, intervalMs);
  }

  /**
   * Stop batch processing
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('[RETRY] Batch retry processor stopped');
    }
  }
}

// Export singleton
export const notificationRetryService = new NotificationRetryService();
export const batchRetryProcessor = new BatchRetryProcessor(notificationRetryService);
