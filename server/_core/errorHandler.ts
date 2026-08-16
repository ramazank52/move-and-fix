/**
 * Merkezi hata yönetimi ve yapılandırılmış gözlemlenebilirlik katmanı.
 */

import type { ErrorRequestHandler, Request, RequestHandler } from 'express';

import {
  AppError,
  ErrorCategory,
  type ErrorContext,
  ErrorSeverity,
  normalizeError,
} from './errors';
import { createObservabilityEvent, emitObservabilityEvent, redactObservabilityData } from './observability';

export {
  AppError,
  AuthError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  DatabaseError,
  ErrorCategory,
  ErrorSeverity,
  ExternalServiceError,
  NotFoundError,
  PaymentError,
  RateLimitError,
  ValidationError,
  getErrorMessage,
  isRetryableError,
  normalizeError,
} from './errors';

export interface ErrorLog {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  code: string;
  statusCode: number;
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  stack?: string;
  context?: ErrorContext;
  retryable: boolean;
  retryCount: number;
  userMessage: string;
}

function readRequestString(req: Request, key: string): string | undefined {
  const value = Reflect.get(req, key) as unknown;
  return typeof value === 'string' ? value : undefined;
}

function readRequestUserId(req: Request): string | undefined {
  const user = Reflect.get(req, 'user') as unknown;
  if (typeof user !== 'object' || user === null || !('id' in user)) {
    return undefined;
  }

  const id = user.id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined;
}

export class StructuredLogger {
  private logs: ErrorLog[] = [];
  private readonly maxLogs = 10_000;

  logError(
    error: unknown,
    requestId?: string,
    userId?: string,
    endpoint?: string,
    method?: string,
  ): ErrorLog {
    const appError = normalizeError(error);

    const errorLog: ErrorLog = {
      id: `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      category: appError.category,
      severity: appError.severity,
      message: String(redactObservabilityData(appError.message)),
      code: appError.code,
      statusCode: appError.statusCode,
      userId,
      requestId,
      endpoint,
      method,
      // Raw stack/context can include request payload data and must not be retained.
      stack: undefined,
      context: redactObservabilityData(appError.context) as ErrorContext | undefined,
      retryable: appError.retryable,
      retryCount: 0,
      userMessage: this.getUserMessage(appError),
    };

    this.logs.push(errorLog);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.printLog(errorLog);
    return errorLog;
  }

  logInfo(message: string, data?: ErrorContext, requestId?: string): void {
    emitObservabilityEvent(createObservabilityEvent({ level: 'info', message, requestId, context: data }));
  }

  logWarning(message: string, data?: ErrorContext, requestId?: string): void {
    emitObservabilityEvent(createObservabilityEvent({ level: 'warn', message, requestId, context: data }));
  }

  logDebug(message: string, data?: ErrorContext, requestId?: string): void {
    if (process.env.NODE_ENV === 'development') {
      emitObservabilityEvent(createObservabilityEvent({ level: 'debug', message, requestId, context: data }));
    }
  }

  logRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    requestId?: string,
    userId?: string,
  ): void {
    emitObservabilityEvent(createObservabilityEvent({
      level: 'info',
      message: 'http.request.completed',
      requestId,
      context: { method, endpoint, statusCode, responseTime, userId },
    }));
  }

  private getUserMessage(error: AppError): string {
    const messages: Record<ErrorCategory, string> = {
      [ErrorCategory.VALIDATION]: 'Giriş verilerinizi kontrol edin.',
      [ErrorCategory.AUTHENTICATION]: 'Lütfen giriş yapın.',
      [ErrorCategory.AUTHORIZATION]: 'Bu işlemi yapmaya yetkiniz yok.',
      [ErrorCategory.NOT_FOUND]: 'Aranan kayıt bulunamadı.',
      [ErrorCategory.CONFLICT]: 'Bu işlem yapılamıyor. Lütfen daha sonra tekrar deneyin.',
      [ErrorCategory.RATE_LIMIT]: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.',
      [ErrorCategory.EXTERNAL_SERVICE]: 'Harici servis hatası. Lütfen daha sonra tekrar deneyin.',
      [ErrorCategory.DATABASE]: 'Veritabanı hatası. Lütfen daha sonra tekrar deneyin.',
      [ErrorCategory.PAYMENT]: 'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.',
      [ErrorCategory.UNKNOWN]: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
    };

    return messages[error.category];
  }

  private printLog(errorLog: ErrorLog): void {
    emitObservabilityEvent(createObservabilityEvent({
      level: 'error',
      message: errorLog.message,
      requestId: errorLog.requestId,
      context: {
        severity: errorLog.severity,
        category: errorLog.category,
        code: errorLog.code,
        statusCode: errorLog.statusCode,
        userId: errorLog.userId,
        endpoint: errorLog.endpoint,
        method: errorLog.method,
        retryable: errorLog.retryable,
        context: errorLog.context,
      },
    }));
  }

  getErrorHistory(filters?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    limit?: number;
  }): ErrorLog[] {
    let errors = [...this.logs];

    if (filters?.category) {
      errors = errors.filter(error => error.category === filters.category);
    }
    if (filters?.severity) {
      errors = errors.filter(error => error.severity === filters.severity);
    }

    return errors.slice(-(filters?.limit ?? 100)).reverse();
  }

  getErrorStats() {
    const stats = {
      totalErrors: this.logs.length,
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
      },
      byCategory: {} as Record<ErrorCategory, number>,
      last24Hours: 0,
      criticalErrors: [] as ErrorLog[],
    };
    const oneDayAgo = new Date(Date.now() - 86_400_000);

    for (const log of this.logs) {
      stats.bySeverity[log.severity] += 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] ?? 0) + 1;
      if (log.timestamp > oneDayAgo) stats.last24Hours += 1;
      if (log.severity === ErrorSeverity.CRITICAL) stats.criticalErrors.push(log);
    }

    return stats;
  }

  clearLogs(): void {
    if (process.env.NODE_ENV === 'development') {
      this.logs = [];
    }
  }
}

export const errorMiddleware = (structuredLogger: StructuredLogger): ErrorRequestHandler =>
  (error, req, res, _next) => {
    const requestId = readRequestString(req, 'id') ?? 'unknown';
    const errorLog = structuredLogger.logError(
      error,
      requestId,
      readRequestUserId(req),
      req.path,
      req.method,
    );

    res.status(errorLog.statusCode).json({
      error: {
        id: errorLog.id,
        code: errorLog.code,
        message: errorLog.userMessage,
        requestId,
        timestamp: errorLog.timestamp,
      },
    });
  };

export const requestLoggingMiddleware = (structuredLogger: StructuredLogger): RequestHandler =>
  (req, res, next) => {
    const startTime = Date.now();
    const requestId = readRequestString(req, 'id');

    res.once('finish', () => {
      structuredLogger.logRequest(
        req.method,
        req.path,
        res.statusCode,
        Date.now() - startTime,
        requestId,
        readRequestUserId(req),
      );
    });

    next();
  };

export const logger = new StructuredLogger();
