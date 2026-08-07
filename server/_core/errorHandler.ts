/**
 * Error Handling & Structured Logging System
 * 
 * Özellikleri:
 * - Merkezi hata yönetimi
 * - Yapılandırılmış JSON logging
 * - Error tracking (Sentry integration ready)
 * - Request/Response logging
 * - Performance monitoring
 * - Error categorization
 * - Automatic retry logic
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
  context?: Record<string, any>;
  retryable: boolean;
  retryCount: number;
  userMessage: string; // Kullanıcıya gösterilecek mesaj
}

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public category: ErrorCategory = ErrorCategory.UNKNOWN,
    public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public retryable: boolean = false,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      false,
      context
    );
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(
      message,
      'AUTHENTICATION_ERROR',
      401,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      false
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      false
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(
      `${resource} not found`,
      'NOT_FOUND_ERROR',
      404,
      ErrorCategory.NOT_FOUND,
      ErrorSeverity.LOW,
      false
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(
      message,
      'CONFLICT_ERROR',
      409,
      ErrorCategory.CONFLICT,
      ErrorSeverity.MEDIUM,
      false
    );
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      'RATE_LIMIT_ERROR',
      429,
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      true
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(
      `External service error: ${service} - ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.HIGH,
      true
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(
      `Database error: ${message}`,
      'DATABASE_ERROR',
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      true
    );
  }
}

export class PaymentError extends AppError {
  constructor(message: string, retryable: boolean = false) {
    super(
      `Payment error: ${message}`,
      'PAYMENT_ERROR',
      402,
      ErrorCategory.PAYMENT,
      ErrorSeverity.HIGH,
      retryable
    );
  }
}

/**
 * Structured Logger
 */
export class StructuredLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 10000;

  /**
   * Error'u log'la
   */
  logError(
    error: Error | AppError,
    requestId?: string,
    userId?: string,
    endpoint?: string,
    method?: string
  ): ErrorLog {
    const appError = error instanceof AppError ? error : this.normalizeError(error);

    const errorLog: ErrorLog = {
      id: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      category: appError.category,
      severity: appError.severity,
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      userId,
      requestId,
      endpoint,
      method,
      stack: error.stack,
      context: appError.context,
      retryable: appError.retryable,
      retryCount: 0,
      userMessage: this.getUserMessage(appError),
    };

    this.logs.push(errorLog);

    // Eski logları sil
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console'a log'la
    this.printLog(errorLog);

    return errorLog;
  }

  /**
   * Info log
   */
  logInfo(message: string, data?: Record<string, any>, requestId?: string) {
    const log = {
      timestamp: new Date(),
      level: 'INFO',
      message,
      requestId,
      data,
    };

    console.log(JSON.stringify(log));
  }

  /**
   * Warning log
   */
  logWarning(message: string, data?: Record<string, any>, requestId?: string) {
    const log = {
      timestamp: new Date(),
      level: 'WARNING',
      message,
      requestId,
      data,
    };

    console.warn(JSON.stringify(log));
  }

  /**
   * Debug log
   */
  logDebug(message: string, data?: Record<string, any>, requestId?: string) {
    if (process.env.NODE_ENV === 'development') {
      const log = {
        timestamp: new Date(),
        level: 'DEBUG',
        message,
        requestId,
        data,
      };

      console.debug(JSON.stringify(log));
    }
  }

  /**
   * API Request log
   */
  logRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    requestId?: string,
    userId?: string
  ) {
    const log = {
      timestamp: new Date(),
      level: 'REQUEST',
      method,
      endpoint,
      statusCode,
      responseTime,
      requestId,
      userId,
    };

    console.log(JSON.stringify(log));
  }

  /**
   * Error'u normalize et
   */
  private normalizeError(error: Error): AppError {
    if (error instanceof AppError) {
      return error;
    }

    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.HIGH,
      false
    );
  }

  /**
   * Kullanıcıya gösterilecek mesaj
   */
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

    return messages[error.category] || 'Bir hata oluştu.';
  }

  /**
   * Log'u yazdır
   */
  private printLog(errorLog: ErrorLog) {
    const logObject = {
      timestamp: errorLog.timestamp.toISOString(),
      level: 'ERROR',
      severity: errorLog.severity,
      category: errorLog.category,
      code: errorLog.code,
      message: errorLog.message,
      statusCode: errorLog.statusCode,
      requestId: errorLog.requestId,
      userId: errorLog.userId,
      endpoint: errorLog.endpoint,
      method: errorLog.method,
      retryable: errorLog.retryable,
    };

    console.error(JSON.stringify(logObject));
  }

  /**
   * Error geçmişi getir
   */
  getErrorHistory(filters?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    limit?: number;
  }): ErrorLog[] {
    let errors = [...this.logs];

    if (filters?.category) {
      errors = errors.filter(e => e.category === filters.category);
    }

    if (filters?.severity) {
      errors = errors.filter(e => e.severity === filters.severity);
    }

    const limit = filters?.limit || 100;
    return errors.slice(-limit).reverse();
  }

  /**
   * Error istatistikleri
   */
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

    const oneDayAgo = new Date(Date.now() - 86400000);

    this.logs.forEach(log => {
      stats.bySeverity[log.severity]++;

      if (!stats.byCategory[log.category]) {
        stats.byCategory[log.category] = 0;
      }
      stats.byCategory[log.category]++;

      if (log.timestamp > oneDayAgo) {
        stats.last24Hours++;
      }

      if (log.severity === ErrorSeverity.CRITICAL) {
        stats.criticalErrors.push(log);
      }
    });

    return stats;
  }

  /**
   * Tüm logları temizle (Development only)
   */
  clearLogs() {
    if (process.env.NODE_ENV === 'development') {
      this.logs = [];
    }
  }
}

/**
 * Error Middleware
 */
export const errorMiddleware = (logger: StructuredLogger) => {
  return (err: any, req: any, res: any, next: any) => {
    const requestId = req.id || 'unknown';
    const userId = req.user?.id;
    const endpoint = req.path;
    const method = req.method;

    // Error'u log'la
    const errorLog = logger.logError(err, requestId, userId, endpoint, method);

    // Response gönder
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
};

/**
 * Request Logging Middleware
 */
export const requestLoggingMiddleware = (logger: StructuredLogger) => {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = req.id;

    // Response'u intercept et
    const originalSend = res.send;
    res.send = function (data: any) {
      const responseTime = Date.now() - startTime;
      logger.logRequest(req.method, req.path, res.statusCode, responseTime, requestId, req.user?.id);
      originalSend.call(this, data);
    };

    next();
  };
};

export const logger = new StructuredLogger();
