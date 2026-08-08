import type { NextFunction, Request, Response } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    maskedBody?: unknown;
    maskedHeaders?: unknown;
  }
}

/**
 * Sensitive Data Masking Module
 * 
 * Masks sensitive information in logs to prevent data leaks
 * Handles: passwords, tokens, credit cards, SSN, etc.
 * 
 * CRITICAL SECURITY: Never log sensitive data unmasked
 */

/**
 * List of sensitive field names that should be masked
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secretKey',
  'signingSecret',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'socialSecurityNumber',
  'bankAccount',
  'iban',
  'swift',
  'routingNumber',
  'accountNumber',
  'phoneNumber',
  'email',
  'ipAddress',
  'ipv4',
  'ipv6',
  'jwt',
  'bearer',
  'authorization',
  'cookie',
  'sessionId',
  'privateKey',
  'publicKey'
];

/**
 * Mask sensitive data in an object
 * @param obj - Object to mask
 * @param depth - Current recursion depth (max 10)
 * @returns Masked object
 */
export function maskSensitiveData(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10 || obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item, depth + 1));
  }

  if (!isRecord(obj)) {
    return obj;
  }

  // Handle objects
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      masked[key] = maskValue(value);
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, depth + 1);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Narrow an unknown runtime value to an enumerable string-keyed record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(
    sensitive => lowerField.includes(sensitive.toLowerCase())
  );
}

/**
 * Mask a sensitive value
 * @param value - Value to mask
 * @returns Masked value
 */
function maskValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '[REDACTED]';
  }

  const strValue = String(value);

  // For very short values, just redact completely
  if (strValue.length <= 4) {
    return '[REDACTED]';
  }

  // Show first 2 and last 2 characters
  const first = strValue.substring(0, 2);
  const last = strValue.substring(strValue.length - 2);
  const middle = '*'.repeat(Math.max(0, strValue.length - 4));

  return `${first}${middle}${last}`;
}

/**
 * Mask credit card number
 * @param cardNumber - Credit card number
 * @returns Masked card number (e.g., 4111****1111)
 */
export function maskCreditCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 8) {
    return '[INVALID]';
  }
  const first = cleaned.substring(0, 4);
  const last = cleaned.substring(cleaned.length - 4);
  return `${first}****${last}`;
}

/**
 * Mask email address
 * @param email - Email address
 * @returns Masked email (e.g., u***@example.com)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return '[INVALID]';
  }

  const maskedLocal = localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1);
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 * @param phoneNumber - Phone number
 * @returns Masked phone (e.g., +90****1234)
 */
export function maskPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length < 4) {
    return '[INVALID]';
  }

  const last = cleaned.substring(cleaned.length - 4);
  const prefix = phoneNumber.substring(0, phoneNumber.indexOf(cleaned[0]));
  return `${prefix}****${last}`;
}

/**
 * Mask JWT token
 * @param token - JWT token
 * @returns Masked token (e.g., eyJhbG...XVz)
 */
export function maskJWT(token: string): string {
  if (token.length < 10) {
    return '[INVALID]';
  }
  const first = token.substring(0, 6);
  const last = token.substring(token.length - 3);
  return `${first}...${last}`;
}

/**
 * Mask API key
 * @param apiKey - API key
 * @returns Masked API key
 */
export function maskAPIKey(apiKey: string): string {
  if (apiKey.length < 8) {
    return '[INVALID]';
  }
  const first = apiKey.substring(0, 4);
  const last = apiKey.substring(apiKey.length - 4);
  return `${first}****${last}`;
}

/**
 * Create a safe log entry by masking sensitive data
 * @param data - Data to log
 * @returns Safe data for logging
 */
export function createSafeLogEntry(data: unknown): unknown {
  return maskSensitiveData(data);
}

/**
 * Middleware for Express to mask sensitive data in logs
 */
export function logMaskingMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Store original body
  const originalBody = req.body;

  // Mask body for logging
  req.maskedBody = maskSensitiveData(originalBody);

  // Mask headers
  req.maskedHeaders = maskSensitiveData(req.headers);

  next();
}

/**
 * Safe JSON stringify that masks sensitive data
 * @param obj - Object to stringify
 * @param space - Indentation (optional)
 * @returns JSON string with masked sensitive data
 */
export function safeJSONStringify(obj: unknown, space?: number): string {
  const masked = maskSensitiveData(obj);
  return JSON.stringify(masked, null, space) ?? 'undefined';
}

/**
 * Safe console log that masks sensitive data
 * @param message - Log message
 * @param data - Data to log
 */
export function safeConsoleLog(message: string, data?: unknown): void {
  if (data !== undefined) {
    console.log(`[INFO] ${message}`, maskSensitiveData(data));
  } else {
    console.log(`[INFO] ${message}`);
  }
}

/**
 * Safe console error that masks sensitive data
 * @param message - Error message
 * @param error - Error object or data
 */
export function safeConsoleError(message: string, error?: unknown): void {
  if (error !== undefined) {
    console.error(`[ERROR] ${message}`, maskSensitiveData(error));
  } else {
    console.error(`[ERROR] ${message}`);
  }
}

/**
 * Validate that no sensitive data is present in a string
 * @param str - String to validate
 * @returns true if no sensitive patterns found
 */
export function validateNoSensitiveData(str: string): boolean {
  const sensitivePatterns = [
    /password\s*=\s*['"][^'"]*['"]/gi,
    /token\s*=\s*['"][^'"]*['"]/gi,
    /apikey\s*=\s*['"][^'"]*['"]/gi,
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  ];

  return !sensitivePatterns.some(pattern => pattern.test(str));
}
