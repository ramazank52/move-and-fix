import { Request, Response, NextFunction } from 'express';
// JWT verification will be handled by jsonwebtoken or jose

/**
 * API Gateway - Merkezi giriş noktası
 * Tüm istekler bu gateway üzerinden geçer
 * 
 * Görevleri:
 * - Authentication (JWT doğrulaması)
 * - Authorization (Rol kontrolleri)
 * - Rate Limiting
 * - Request/Response Logging
 * - API Versioning
 * - Security Headers
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    permissions: string[];
  };
  clientId?: string;
  requestId?: string;
}

export enum UserRole {
  OWNER = 'owner',
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  OPERATIONS = 'operations',
  SUPPORT = 'support',
  ACCOUNTANT = 'accountant',
  COMPANY = 'company',
  PROVIDER = 'provider',
  CUSTOMER = 'customer',
  GUEST = 'guest',
}

/**
 * Rol bazlı izinler
 */
export const rolePermissions: Record<UserRole, string[]> = {
  [UserRole.OWNER]: ['*'], // Tüm izinler
  [UserRole.SUPER_ADMIN]: [
    'users:manage',
    'services:manage',
    'categories:manage',
    'commissions:manage',
    'campaigns:manage',
    'wallet:manage',
    'analytics:view',
    'security:manage',
    'audit:view',
  ],
  [UserRole.ADMIN]: [
    'users:view',
    'users:moderate',
    'services:view',
    'services:moderate',
    'analytics:view',
    'support:manage',
  ],
  [UserRole.OPERATIONS]: [
    'services:view',
    'orders:view',
    'orders:manage',
    'analytics:view',
  ],
  [UserRole.SUPPORT]: [
    'users:view',
    'services:view',
    'support:manage',
    'tickets:manage',
  ],
  [UserRole.ACCOUNTANT]: [
    'wallet:view',
    'analytics:view',
    'reports:view',
    'payments:view',
  ],
  [UserRole.COMPANY]: [
    'services:view',
    'services:create',
    'services:edit',
    'orders:view',
    'wallet:view',
    'analytics:view',
  ],
  [UserRole.PROVIDER]: [
    'services:view',
    'offers:create',
    'orders:view',
    'wallet:view',
    'profile:edit',
  ],
  [UserRole.CUSTOMER]: [
    'services:view',
    'services:create',
    'orders:view',
    'wallet:view',
    'profile:edit',
  ],
  [UserRole.GUEST]: [
    'services:view',
    'categories:view',
  ],
};

/**
 * JWT doğrulama middleware
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      req.user = {
        id: 'guest',
        email: 'guest@movefix.com',
        role: UserRole.GUEST,
        permissions: rolePermissions[UserRole.GUEST],
      };
      return next();
    }

    // JWT doğrulaması (gerçek uygulamada jose veya jsonwebtoken kullanılacak)
    // Şu an mock olarak yapılıyor
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    const userRole = (decoded.role || UserRole.CUSTOMER) as UserRole;
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: userRole,
      permissions: rolePermissions[userRole],
    };

    next();
  } catch (error) {
    req.user = {
      id: 'guest',
      email: 'guest@movefix.com',
      role: UserRole.GUEST,
      permissions: rolePermissions[UserRole.GUEST],
    };
    next();
  }
}

/**
 * Rol kontrol middleware
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden' });
  };
}

/**
 * İzin kontrol middleware
 */
export function requirePermission(...permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasPermission = permissions.some(
      (perm) =>
        req.user!.permissions.includes('*') ||
        req.user!.permissions.includes(perm)
    );

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden' });
  };
}

/**
 * Request ID ve logging middleware
 */
export function requestLoggingMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id || 'guest',
      timestamp: new Date().toISOString(),
    });
  });

  next();
}

/**
 * Rate limiting middleware (basit implementasyon)
 */
const requestCounts = new Map<string, number[]>();

export function rateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 dakika
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const key = req.user?.id || req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requestCounts.has(key)) {
      requestCounts.set(key, []);
    }

    const timestamps = requestCounts.get(key)!;
    const recentRequests = timestamps.filter((t) => t > windowStart);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((Math.min(...timestamps) + windowMs - now) / 1000),
      });
    }

    recentRequests.push(now);
    requestCounts.set(key, recentRequests);

    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  next();
}

/**
 * API Gateway konfigürasyonu
 */
export const apiGatewayConfig = {
  rateLimitMaxRequests: 1000,
  rateLimitWindowMs: 60000, // 1 dakika
  requestTimeoutMs: 30000, // 30 saniye
  enableLogging: true,
  enableMetrics: true,
};
