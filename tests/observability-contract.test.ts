import { describe, expect, it, vi } from 'vitest';

import {
  createObservabilityEvent,
  deliverApmEvent,
  redactObservabilityData,
} from '../server/_core/observability';
import { StructuredLogger } from '../server/_core/errorHandler';
import { ValidationError } from '../server/_core/errors';

describe('observability contract', () => {
  it('redacts credential-shaped keys and common customer identifiers recursively', () => {
    const value = redactObservabilityData({
      authorization: 'Bearer very-secret-token',
      customer: {
        email: 'customer@example.com',
        phone: '+90 532 123 45 67',
        iban: 'TR12 0006 2000 0000 0009 0000 06',
      },
    });

    expect(value).toEqual({
      authorization: '[REDACTED]',
      customer: { email: '[REDACTED]', phone: '[REDACTED]', iban: '[REDACTED]' },
    });
  });

  it('redacts PII embedded in event text before a JSON sink receives it', () => {
    const event = createObservabilityEvent({
      level: 'error',
      message: 'customer@example.com failed with Bearer abc.def.123',
      context: { detail: 'Call +90 532 123 45 67' },
    });
    const serialized = JSON.stringify(event);

    expect(serialized).not.toContain('customer@example.com');
    expect(serialized).not.toContain('abc.def.123');
    expect(serialized).not.toContain('532 123');
    expect(serialized).toContain('[REDACTED_EMAIL]');
  });

  it('does not retain raw stack or customer context in the in-memory error history', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new StructuredLogger();
    const error = new ValidationError('Email customer@example.com invalid', {
      email: 'customer@example.com',
      password: 'not-for-logs',
    });

    const entry = logger.logError(error, 'req-1');

    expect(entry.stack).toBeUndefined();
    expect(JSON.stringify(entry)).not.toContain('customer@example.com');
    expect(JSON.stringify(entry)).not.toContain('not-for-logs');
  });

  it('fails closed without an APM endpoint and key instead of claiming delivery', async () => {
    const result = await deliverApmEvent(createObservabilityEvent({ level: 'info', message: 'test' }));

    expect(result).toEqual({ delivered: false, reason: 'NOT_CONFIGURED' });
  });
});
