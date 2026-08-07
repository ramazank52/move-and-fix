/**
 * Centralized Configuration Constants
 *
 * Issue #5: Hardcoded magic numbers → configuration constants
 * Tüm sabit değerler tek bir yerden yönetilir.
 * Production'da environment variable'larla override edilebilir.
 */

/** Retry mekanizması sabitleri */
export const RETRY_CONFIG = {
  maxRetries: parseInt(process.env.RETRY_MAX_RETRIES || '5', 10),
  initialDelayMs: parseInt(process.env.RETRY_INITIAL_DELAY_MS || '1000', 10),
  maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '3600000', 10), // 1 hour
  backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
  jitterFactor: parseFloat(process.env.RETRY_JITTER_FACTOR || '0.1'),
} as const;

/** Pagination sabitleri */
export const PAGINATION_CONFIG = {
  defaultLimit: parseInt(process.env.PAGINATION_DEFAULT_LIMIT || '20', 10),
  maxLimit: parseInt(process.env.PAGINATION_MAX_LIMIT || '100', 10),
  minLimit: parseInt(process.env.PAGINATION_MIN_LIMIT || '1', 10),
} as const;

/** Rate limiting sabitleri */
export const RATE_LIMIT_CONFIG = {
  general: {
    windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '100', 10),
  },
  login: {
    windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '900000', 10), // 15 min
    max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '10', 10),
  },
  payment: {
    windowMs: parseInt(process.env.RATE_LIMIT_PAYMENT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX || '20', 10),
  },
  apiKey: {
    windowMs: parseInt(process.env.RATE_LIMIT_APIKEY_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_APIKEY_MAX || '30', 10),
  },
} as const;

/** Veri maskeleme sabitleri */
export const DATA_MASKING_CONFIG = {
  maxDepth: parseInt(process.env.DATA_MASKING_MAX_DEPTH || '10', 10),
  maskChar: '•',
  showFirstChars: 2,
  showLastChars: 2,
} as const;

/** Express body parser sabitleri */
export const BODY_PARSER_CONFIG = {
  jsonLimit: process.env.BODY_PARSER_JSON_LIMIT || '50mb',
  urlencodedLimit: process.env.BODY_PARSER_URLENCODED_LIMIT || '50mb',
} as const;

/** Veritabanı bağlantı havuzu sabitleri */
export const DB_POOL_CONFIG = {
  minConnections: parseInt(process.env.DB_POOL_MIN || '10', 10),
  maxConnections: parseInt(process.env.DB_POOL_MAX || '50', 10),
  idleTimeoutMs: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMs: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000', 10),
} as const;

/** API key sabitleri */
export const API_KEY_CONFIG = {
  keyLength: parseInt(process.env.API_KEY_LENGTH || '48', 10),
  rotationGracePeriodMs: parseInt(
    process.env.API_KEY_ROTATION_GRACE_MS || '86400000',
    10,
  ), // 24 hours
  prefix: 'mkfx_',
} as const;

/** CORS sabitleri */
export const CORS_CONFIG = {
  defaultOrigins: ['http://localhost:8081', 'http://localhost:3000'] as string[],
  allowedMethods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders:
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, X-CSRF-Token',
  allowCredentials: true,
} as const;

/** CSP (Content Security Policy) sabitleri */
export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ') as string;

/** Security headers */
export const SECURITY_HEADERS = {
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  xXSSProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
  contentSecurityPolicy: CSP_DIRECTIVES,
} as const;
