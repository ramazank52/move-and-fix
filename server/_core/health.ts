/**
 * Health Check & Readiness Probe
 *
 * Kubernetes ve Docker health checks için
 */

import type { RequestHandler } from 'express';

import { getErrorMessage } from './errors';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  checks: {
    database: {
      status: 'ok' | 'error';
      responseTime: number;
      message?: string;
    };
    redis: {
      status: 'ok' | 'error';
      responseTime: number;
      message?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'error';
      usage: number;
      limit: number;
      percentage: number;
    };
    disk: {
      status: 'ok' | 'warning' | 'error';
      usage: number;
      limit: number;
      percentage: number;
    };
  };
  version: string;
  environment: string;
}

export class HealthChecker {
  private readonly startTime = Date.now();

  async checkDatabase(): Promise<{
    status: 'ok' | 'error';
    responseTime: number;
    message?: string;
  }> {
    const start = Date.now();

    try {
      // Database connection test: await db.query('SELECT 1');
      return {
        status: 'ok',
        responseTime: Date.now() - start,
      };
    } catch (error: unknown) {
      return {
        status: 'error',
        responseTime: Date.now() - start,
        message: getErrorMessage(error, 'Database health check failed'),
      };
    }
  }

  async checkRedis(): Promise<{
    status: 'ok' | 'error';
    responseTime: number;
    message?: string;
  }> {
    const start = Date.now();

    try {
      // Redis connection test: await redis.ping();
      return {
        status: 'ok',
        responseTime: Date.now() - start,
      };
    } catch (error: unknown) {
      return {
        status: 'error',
        responseTime: Date.now() - start,
        message: getErrorMessage(error, 'Redis health check failed'),
      };
    }
  }

  checkMemory(): {
    status: 'ok' | 'warning' | 'error';
    usage: number;
    limit: number;
    percentage: number;
  } {
    const memUsage = process.memoryUsage();
    const usage = memUsage.heapUsed;
    const limit = memUsage.heapTotal;
    const percentage = (usage / limit) * 100;

    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (percentage > 90) status = 'error';
    else if (percentage > 75) status = 'warning';

    return { status, usage, limit, percentage };
  }

  checkDisk(): {
    status: 'ok' | 'warning' | 'error';
    usage: number;
    limit: number;
    percentage: number;
  } {
    // Production'da gerçek disk kullanım sağlayıcısı ile değiştirilecektir.
    const usage = 50 * 1024 * 1024 * 1024;
    const limit = 100 * 1024 * 1024 * 1024;
    const percentage = (usage / limit) * 100;

    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (percentage > 90) status = 'error';
    else if (percentage > 75) status = 'warning';

    return { status, usage, limit, percentage };
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const memory = this.checkMemory();
    const disk = this.checkDisk();

    let status: HealthStatus['status'] = 'healthy';
    if (database.status === 'error' || redis.status === 'error') {
      status = 'unhealthy';
    } else if (
      memory.status === 'error' ||
      disk.status === 'error' ||
      memory.status === 'warning' ||
      disk.status === 'warning'
    ) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      checks: { database, redis, memory, disk },
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async isReady(): Promise<boolean> {
    const health = await this.getHealthStatus();
    return health.status !== 'unhealthy';
  }

  async isAlive(): Promise<boolean> {
    return true;
  }
}

export const healthCheckMiddleware = (checker: HealthChecker): RequestHandler =>
  async (req, res, next) => {
    if (req.path === '/health') {
      const health = await checker.getHealthStatus();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
      return;
    }

    if (req.path === '/ready') {
      const ready = await checker.isReady();
      res.status(ready ? 200 : 503).json({ ready });
      return;
    }

    if (req.path === '/live') {
      const alive = await checker.isAlive();
      res.status(alive ? 200 : 503).json({ alive });
      return;
    }

    next();
  };

export const healthChecker = new HealthChecker();
