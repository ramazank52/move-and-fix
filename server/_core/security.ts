/**
 * Security Hardening Module
 * 
 * Özellikleri:
 * - Input validation & sanitization
 * - Rate limiting
 * - CORS configuration
 * - Encryption/Decryption
 * - CSRF protection
 * - Security headers
 * - SQL injection prevention
 * - XSS prevention
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const DEFAULT_DEVELOPMENT_ORIGINS = ['http://localhost:3000', 'http://localhost:8081'] as const;
export const CSRF_SESSION_COOKIE_NAME = 'movefix_csrf_session';

type SecurityEnvironment = {
  ALLOWED_ORIGINS?: string;
  ENCRYPTION_KEY?: string;
  NODE_ENV?: string;
};

function getConfiguredOrigins(environment: SecurityEnvironment): string[] {
  return (environment.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Production accepts only explicitly configured browser origins. */
export function resolveAllowedOrigins(environment: SecurityEnvironment = process.env): string[] {
  const configuredOrigins = getConfiguredOrigins(environment);
  if (configuredOrigins.length > 0) return configuredOrigins;
  return environment.NODE_ENV === 'production' ? [] : [...DEFAULT_DEVELOPMENT_ORIGINS];
}

function isTrustedDevelopmentPreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && /^8081-[a-z0-9-]+\.sg1\.manus\.computer$/i.test(url.hostname);
  } catch {
    return false;
  }
}

/** Hosted preview is development-only; production still requires ALLOWED_ORIGINS. */
export function isAllowedCorsOrigin(origin: string, environment: SecurityEnvironment = process.env): boolean {
  return (
    resolveAllowedOrigins(environment).includes(origin) ||
    (environment.NODE_ENV !== 'production' && isTrustedDevelopmentPreviewOrigin(origin))
  );
}

/** Missing production material is fatal; development never uses a static fallback key. */
export function resolveEncryptionKey(environment: SecurityEnvironment = process.env): string {
  const configuredKey = environment.ENCRYPTION_KEY?.trim();
  if (configuredKey) return configuredKey;
  if (environment.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY must be configured in production');
  }
  return crypto.randomBytes(32).toString('hex');
}

export function getCsrfSessionId(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const prefix = `${CSRF_SESSION_COOKIE_NAME}=`;
  const part = cookieHeader.split(';').map((value) => value.trim()).find((value) => value.startsWith(prefix));
  if (!part) return null;
  try {
    return decodeURIComponent(part.slice(prefix.length)) || null;
  } catch {
    return null;
  }
}

export function requiresCsrfProtection(input: {
  method: string;
  path: string;
  authorization?: string | undefined;
  hasCookieSession?: boolean | undefined;
}): boolean {
  const method = input.method.toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  const isApiRoute = input.path.startsWith('/api/');
  const isBearerAuth = input.authorization?.trim().startsWith('Bearer ') ?? false;
  const isSignedWebhook = input.path.startsWith('/api/payment/webhooks/');
  const isSignedScheduledCallback = input.path.startsWith('/api/scheduled/');
  return isStateChanging && isApiRoute && input.hasCookieSession === true && !isBearerAuth && !isSignedWebhook && !isSignedScheduledCallback;
}

/**
 * In-Memory Rate Limiter
 *
 * Sliding window rate limiter — production'da Redis ile değiştirilebilir.
 * Her IP için istek sayısını zaman penceresinde takip eder.
 */
export class RateLimiter {
  private hits: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxHits: number;

  constructor(windowMs: number, maxHits: number) {
    this.windowMs = windowMs;
    this.maxHits = maxHits;
  }

  middleware(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const hits = this.hits.get(ip) || [];
    const recentHits = hits.filter((t) => t > windowStart);

    if (recentHits.length >= this.maxHits) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(this.windowMs / 1000),
      });
      return;
    }

    recentHits.push(now);
    this.hits.set(ip, recentHits);
    next();
  }
}

/**
 * Rate Limiting Middleware'leri
 */
// Production dışında rate limit'leri gevşet (test ve development)
const isProduction = process.env.NODE_ENV === 'production';
const generalMax = isProduction ? 100 : 10000;
const loginMax = isProduction ? 10 : 1000;
const paymentMax = isProduction ? 20 : 1000;
const apiKeyMax = isProduction ? 30 : 1000;

export const rateLimiters = {
  general: new RateLimiter(60_000, generalMax).middleware.bind(new RateLimiter(60_000, generalMax)),
  login: new RateLimiter(15 * 60_000, loginMax).middleware.bind(new RateLimiter(15 * 60_000, loginMax)),
  payment: new RateLimiter(60_000, paymentMax).middleware.bind(new RateLimiter(60_000, paymentMax)),
  apiKey: new RateLimiter(60_000, apiKeyMax).middleware.bind(new RateLimiter(60_000, apiKeyMax)),
};

/**
 * CORS Konfigürasyonu
 */
export const corsOptions = {
  origin: resolveAllowedOrigins(),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token'],
};

/**
 * Input Validation Schemas
 */
export const ValidationSchemas = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[0-9]{10,15}$/,
  url: /^https?:\/\/.+/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

/**
 * Input Sanitization
 */
export class InputSanitizer {
  /**
   * String'i sanitize et
   */
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    return input
      .substring(0, maxLength)
      .trim()
      .replace(/[<>\"']/g, '') // HTML karakterlerini kaldır
      .replace(/[;]/g, ''); // SQL injection'dan koru
  }

  /**
   * E-posta doğrula
   */
  static validateEmail(email: string): boolean {
    return ValidationSchemas.email.test(email);
  }

  /**
   * Telefon numarası doğrula
   */
  static validatePhone(phone: string): boolean {
    return ValidationSchemas.phone.test(phone);
  }

  /**
   * Şifre doğrula
   */
  static validatePassword(password: string): boolean {
    return ValidationSchemas.strongPassword.test(password);
  }

  /**
   * URL doğrula
   */
  static validateURL(url: string): boolean {
    return ValidationSchemas.url.test(url);
  }

  /**
   * UUID doğrula
   */
  static validateUUID(uuid: string): boolean {
    return ValidationSchemas.uuid.test(uuid);
  }

  /**
   * Sayı doğrula
   */
  static validateNumber(value: any, min?: number, max?: number): boolean {
    const num = Number(value);
    if (isNaN(num)) return false;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;
    return true;
  }

  /**
   * Enum doğrula
   */
  static validateEnum(value: string, enumValues: string[]): boolean {
    return enumValues.includes(value);
  }
}

/**
 * Encryption/Decryption Utilities
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private encryptionKey: Buffer;

  constructor(encryptionKeyMaterial = resolveEncryptionKey()) {
    this.encryptionKey = crypto.createHash('sha256').update(encryptionKeyMaterial).digest();
  }

  /**
   * Veriyi şifrele
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // GCM mode için auth tag
    const authTag = (cipher as any).getAuthTag?.() || Buffer.alloc(0);

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Veriyi şifre çöz
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    if (authTag.length > 0) {
      (decipher as any).setAuthTag?.(authTag);
    }

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash oluştur
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Random token oluştur
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

/**
 * CSRF Protection
 */
export class CSRFProtection {
  private tokens: Map<string, { token: string; createdAt: Date }> = new Map();

  /**
   * CSRF token oluştur
   */
  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(sessionId, {
      token,
      createdAt: new Date(),
    });
    return token;
  }

  /**
   * CSRF token doğrula
   */
  verifyToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);

    if (!stored) {
      return false;
    }

    // Token 1 saatlik geçerli
    const isExpired = Date.now() - stored.createdAt.getTime() > 3600000;
    if (isExpired) {
      this.tokens.delete(sessionId);
      return false;
    }

    if (stored.token.length !== token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(stored.token), Buffer.from(token));
  }
}

/**
 * Request ID Middleware
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as unknown as Record<string, unknown>).id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

/**
 * Security Audit Logging
 */
export class SecurityAuditLog {
  private logs: Array<{
    timestamp: Date;
    action: string;
    userId?: string;
    ipAddress: string;
    result: 'success' | 'failure';
    details?: string;
  }> = [];

  /**
   * Güvenlik olayını log'la
   */
  log(
    action: string,
    ipAddress: string,
    result: 'success' | 'failure',
    userId?: string,
    details?: string
  ) {
    const logEntry = {
      timestamp: new Date(),
      action,
      userId,
      ipAddress,
      result,
      details,
    };

    this.logs.push(logEntry);

    // Son 10000 logu tut
    if (this.logs.length > 10000) {
      this.logs.shift();
    }

    console.log(`[SECURITY] ${action} - ${result} - ${ipAddress}`);
  }

  /**
   * Şüpheli aktiviteleri getir
   */
  getSuspiciousActivity(hours: number = 24) {
    const cutoff = new Date(Date.now() - hours * 3600000);

    return this.logs.filter(log => {
      return log.timestamp > cutoff && log.result === 'failure';
    });
  }

  /**
   * Kullanıcı aktivitesini getir
   */
  getUserActivity(userId: string, limit: number = 100) {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit)
      .reverse();
  }
}

export const encryptionService = new EncryptionService();
export const csrfProtection = new CSRFProtection();
export const securityAuditLog = new SecurityAuditLog();
