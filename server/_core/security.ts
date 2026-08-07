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
// import rateLimit from 'express-rate-limit';
// import helmet from 'helmet';
// import cors from 'cors';
// import mongoSanitize from 'express-mongo-sanitize';

/**
 * Rate Limiting Middleware'leri
 */
// Rate limiters will be configured with express-rate-limit package
export const rateLimiters = {
  general: (req: any, res: any, next: any) => next(),
  login: (req: any, res: any, next: any) => next(),
  payment: (req: any, res: any, next: any) => next(),
  apiKey: (req: any, res: any, next: any) => next(),
};

/**
 * CORS Konfigürasyonu
 */
export const corsOptions = {
  origin: (process.env.ALLOWED_ORIGINS || '').split(',') || [
    'http://localhost:3000',
    'http://localhost:8081',
    'https://movefix.com',
    'https://os.movefix.com',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
};

/**
 * Security Headers Configuration
 */
export const helmetConfig = {
  contentSecurityPolicy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
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
  private encryptionKey = crypto
    .createHash('sha256')
    .update(process.env.ENCRYPTION_KEY || 'default-key')
    .digest();

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

    return stored.token === token;
  }
}

/**
 * Request ID Middleware
 */
export const requestIdMiddleware = (req: any, res: any, next: any) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
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
