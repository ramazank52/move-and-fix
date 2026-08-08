/**
 * Move&Fix merkezi hata sözleşmesi.
 *
 * Uygulama katmanları yalnızca `unknown` yakalar ve bu modüldeki yardımcılarla
 * güvenli biçimde daraltır. Böylece HTTP, tRPC, worker ve servis akışları aynı
 * hata kodlarını, kategorileri ve yeniden-deneme bilgisini paylaşır.
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  PAYMENT = 'payment',
  UNKNOWN = 'unknown',
}

export type ErrorContext = Readonly<Record<string, unknown>>;

export interface AppErrorOptions {
  code?: string;
  statusCode?: number;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  retryable?: boolean;
  context?: ErrorContext;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly retryable: boolean;
  readonly context?: ErrorContext;
  readonly cause?: unknown;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.statusCode = options.statusCode ?? 500;
    this.category = options.category ?? ErrorCategory.UNKNOWN;
    this.severity = options.severity ?? ErrorSeverity.MEDIUM;
    this.retryable = options.retryable ?? false;
    this.context = options.context;
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      context,
      cause,
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', context?: ErrorContext, cause?: unknown) {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      context,
      cause,
    });
  }
}

/** Kısa ad, servis ve router katmanlarında okunabilirlik için sağlanır. */
export class AuthError extends AuthenticationError {}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied', context?: ErrorContext, cause?: unknown) {
    super(message, {
      code: 'AUTHORIZATION_ERROR',
      statusCode: 403,
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      context,
      cause,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: ErrorContext, cause?: unknown) {
    super(`${resource} not found`, {
      code: 'NOT_FOUND_ERROR',
      statusCode: 404,
      category: ErrorCategory.NOT_FOUND,
      severity: ErrorSeverity.LOW,
      context,
      cause,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super(message, {
      code: 'CONFLICT_ERROR',
      statusCode: 409,
      category: ErrorCategory.CONFLICT,
      severity: ErrorSeverity.MEDIUM,
      context,
      cause,
    });
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, context?: ErrorContext) {
    super(`Rate limit exceeded. Retry after ${retryAfterSeconds} seconds`, {
      code: 'RATE_LIMIT_ERROR',
      statusCode: 429,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      context: { ...context, retryAfterSeconds },
    });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    options: Pick<AppErrorOptions, 'retryable' | 'context' | 'cause'> = {},
  ) {
    super(`External service error: ${service} - ${message}`, {
      code: 'EXTERNAL_SERVICE_ERROR',
      statusCode: 502,
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.HIGH,
      retryable: options.retryable ?? true,
      context: { ...options.context, service },
      cause: options.cause,
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super(`Database error: ${message}`, {
      code: 'DATABASE_ERROR',
      statusCode: 500,
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      context,
      cause,
    });
  }
}

export class PaymentError extends AppError {
  constructor(
    message: string,
    options: Pick<AppErrorOptions, 'retryable' | 'context' | 'cause'> = {},
  ) {
    super(`Payment error: ${message}`, {
      code: 'PAYMENT_ERROR',
      statusCode: 402,
      category: ErrorCategory.PAYMENT,
      severity: ErrorSeverity.HIGH,
      retryable: options.retryable ?? false,
      context: options.context,
      cause: options.cause,
    });
  }
}

function hasStringMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (hasStringMessage(error)) {
    return error.message;
  }

  return fallback;
}

export interface NormalizeErrorOptions extends AppErrorOptions {
  message?: string;
}

export function normalizeError(
  error: unknown,
  options: NormalizeErrorOptions = {},
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError(getErrorMessage(error, options.message ?? 'Unexpected error'), {
    code: options.code ?? 'UNKNOWN_ERROR',
    statusCode: options.statusCode ?? 500,
    category: options.category ?? ErrorCategory.UNKNOWN,
    severity: options.severity ?? ErrorSeverity.HIGH,
    retryable: options.retryable ?? false,
    context: options.context,
    cause: error,
  });
}

export function isRetryableError(error: unknown): boolean {
  return error instanceof AppError && error.retryable;
}
