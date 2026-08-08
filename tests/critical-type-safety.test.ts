import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSafeLogEntry,
  maskSensitiveData,
  safeJSONStringify,
} from '../server/_core/dataMasking';
import {
  BatchRetryProcessor,
  NotificationRetryService,
  type RetryableNotification,
} from '../server/_core/notificationRetry';

describe('Critical #1: type-safe sensitive-data masking', () => {
  it('masks nested records and array entries without changing public fields', () => {
    const input = {
      name: 'Move User',
      password: 'super-secret',
      nested: {
        accessToken: 'token-value-123',
        enabled: false,
      },
      recipients: [
        { email: 'user@example.com', role: 'customer' },
        null,
      ],
    };

    const result = maskSensitiveData(input);

    expect(result).toEqual({
      name: 'Move User',
      password: 'su********et',
      nested: {
        accessToken: 'to***********23',
        enabled: false,
      },
      recipients: [
        { email: 'us************om', role: 'customer' },
        null,
      ],
    });
  });

  it('accepts unknown primitives and produces deterministic JSON text', () => {
    expect(createSafeLogEntry(false)).toBe(false);
    expect(maskSensitiveData(undefined)).toBeUndefined();
    expect(safeJSONStringify(undefined)).toBe('undefined');
  });
});

describe('Critical #1: type-safe notification retry timer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts and stops the batch processor without leaking an interval', () => {
    vi.useFakeTimers();
    const retryService = new NotificationRetryService();
    const processor = new BatchRetryProcessor(retryService);

    processor.start(1_000);
    expect(() => processor.stop()).not.toThrow();
    expect(() => processor.stop()).not.toThrow();
  });

  it('keeps notification payloads as runtime-validated unknown data', () => {
    const notification: RetryableNotification = {
      id: 'notification-1',
      type: 'push',
      userId: 'user-1',
      data: { title: 'Test', nested: ['safe'] },
      retryCount: 0,
      status: 'pending',
      createdAt: new Date('2026-08-07T00:00:00.000Z'),
    };

    const retryService = new NotificationRetryService({ jitterFactor: 0 });
    retryService.addToRetryQueue(notification);

    expect(retryService.getStats()).toEqual({
      pending: 1,
      failed: 0,
      totalRetries: 1,
    });
  });
});
