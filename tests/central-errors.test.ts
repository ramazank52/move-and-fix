import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AppError,
  AuthError,
  ErrorCategory,
  ErrorSeverity,
  ExternalServiceError,
  PaymentError,
  RateLimitError,
  ValidationError,
  getErrorMessage,
  normalizeError,
} from '../server/_core/errors';
import { StructuredLogger } from '../server/_core/errorHandler';

describe('central error contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves typed validation metadata', () => {
    const error = new ValidationError('Tutar geçersiz', { field: 'amount' });

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.context).toEqual({ field: 'amount' });
  });

  it('provides an authentication-specific error', () => {
    const error = new AuthError('Geçersiz kimlik bilgileri');

    expect(error.statusCode).toBe(401);
    expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
  });

  it('marks rate limit failures as retryable', () => {
    const error = new RateLimitError(30);

    expect(error.retryable).toBe(true);
    expect(error.retryAfterSeconds).toBe(30);
    expect(error.context).toEqual({ retryAfterSeconds: 30 });
  });

  it('keeps payment retry policy explicit', () => {
    expect(new PaymentError('Declined').retryable).toBe(false);
    expect(new PaymentError('Timeout', { retryable: true }).retryable).toBe(true);
  });

  it('captures external service name without losing cause', () => {
    const cause = new Error('Connection reset');
    const error = new ExternalServiceError('SMS', cause.message, { cause });

    expect(error.context).toEqual({ service: 'SMS' });
    expect(error.cause).toBe(cause);
  });

  it('normalizes native Error values', () => {
    const source = new Error('Unexpected dependency failure');
    const error = normalizeError(source);

    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe(source.message);
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.cause).toBe(source);
  });

  it('does not re-wrap an existing AppError', () => {
    const source = new ValidationError('Invalid');
    expect(normalizeError(source)).toBe(source);
  });

  it('extracts messages only through a safe unknown guard', () => {
    expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
    expect(getErrorMessage('secret', 'Fallback')).toBe('Fallback');
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
  });

  it('logs unknown failures through the normalized contract', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new StructuredLogger();

    const entry = logger.logError('opaque rejection', 'req-1', 'user-1', '/api/test', 'POST');

    expect(entry.code).toBe('UNKNOWN_ERROR');
    expect(entry.statusCode).toBe(500);
    expect(entry.requestId).toBe('req-1');
    expect(entry.userMessage).toBe('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
  });
});
