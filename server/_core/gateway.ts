/**
 * API Gateway - MVP Version
 * 
 * Basit ama güçlü:
 * - Merkezi giriş noktası
 * - JWT doğrulama
 * - Rol kontrolleri
 * - Rate limiting
 * - Request logging
 */

import { Request, Response, NextFunction } from 'express';

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  PROVIDER = 'provider',
  CUSTOMER = 'customer',
  GUEST = 'guest',
}

export interface GatewayUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

export interface GatewayRequest extends Request {
  user?: GatewayUser;
  requestId?: string;
  startTime?: number;
}

/**
 * Rol bazlı izinler
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.OWNER]: ['*'], // Tüm izinler
  [UserRole.ADMIN]: [
    'users:manage',
    'services:manage',
    'analytics:view',
    'support:manage',
  ],
  [UserRole.PROVIDER]: [
    'services:view',
    'offers:create',
    'wallet:view',
    'profile:edit',
  ],
  [UserRole.CUSTOMER]: [
    'services:view',
    'services:create',
    'wallet:view',
    'profile:edit',
  ],
  [UserRole.GUEST]: ['services:view'],
};

/**
 * JWT doğrulama (MVP - basit implementasyon)
 */
export function authenticateGateway(
  req: GatewayRequest,
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
        permissions: ROLE_PERMISSIONS[UserRole.GUEST],
      };
      return next();
    }

    // Token'ı parse et (gerçek uygulamada JWT.verify kullanılacak)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    const role = (payload.role || UserRole.CUSTOMER) as UserRole;

    req.user = {
      id: payload.sub || payload.id,
      email: payload.email,
      role,
      permissions: ROLE_PERMISSIONS[role],
    };

    next();
  } catch (error) {
    // Token geçersizse guest olarak devam et
    req.user = {
      id: 'guest',
      email: 'guest@movefix.com',
      role: UserRole.GUEST,
      permissions: ROLE_PERMISSIONS[UserRole.GUEST],
    };
    next();
  }
}

/**
 * Rol kontrol middleware
 */
export function requireRole(...roles: UserRole[]) {
  return (req: GatewayRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  };
}

/**
 * İzin kontrol middleware
 */
export function requirePermission(...permissions: string[]) {
  return (req: GatewayRequest, res: Response, next: NextFunction) => {
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

    return res.status(403).json({ error: 'Forbidden: Missing permission' });
  };
}

/**
 * Request logging
 */
export function logRequest(
  req: GatewayRequest,
  res: Response,
  next: NextFunction
) {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    console.log({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id || 'guest',
      role: req.user?.role || 'guest',
      timestamp: new Date().toISOString(),
    });
  });

  next();
}

/**
 * Rate limiting (basit implementasyon)
 */
const requestCounts = new Map<string, number[]>();

export function rateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  return (req: GatewayRequest, res: Response, next: NextFunction) => {
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
        retryAfter: Math.ceil(
          (Math.min(...timestamps) + windowMs - now) / 1000
        ),
      });
    }

    recentRequests.push(now);
    requestCounts.set(key, recentRequests);

    next();
  };
}

/**
 * Security headers
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  next();
}

/**
 * Error handler
 */
export function errorHandler(
  err: any,
  req: GatewayRequest,
  res: Response,
  next: NextFunction
) {
  console.error({
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    user: req.user?.id,
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId: req.requestId,
  });
}
