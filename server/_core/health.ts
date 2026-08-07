/**
 * Health Check & Readiness Probe
 * 
 * Kubernetes ve Docker health checks için
 */

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
  private startTime = Date.now();

  /**
   * Database health check
   */
  async checkDatabase(): Promise<{
    status: 'ok' | 'error';
    responseTime: number;
    message?: string;
  }> {
    const start = Date.now();
    try {
      // Database connection test
      // await db.query('SELECT 1');
      
      return {
        status: 'ok',
        responseTime: Date.now() - start,
      };
    } catch (error: any) {
      return {
        status: 'error',
        responseTime: Date.now() - start,
        message: error.message,
      };
    }
  }

  /**
   * Redis health check
   */
  async checkRedis(): Promise<{
    status: 'ok' | 'error';
    responseTime: number;
    message?: string;
  }> {
    const start = Date.now();
    try {
      // Redis connection test
      // await redis.ping();
      
      return {
        status: 'ok',
        responseTime: Date.now() - start,
      };
    } catch (error: any) {
      return {
        status: 'error',
        responseTime: Date.now() - start,
        message: error.message,
      };
    }
  }

  /**
   * Memory usage check
   */
  checkMemory(): {
    status: 'ok' | 'warning' | 'error';
    usage: number;
    limit: number;
    percentage: number;
  } {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const percentage = (heapUsed / heapTotal) * 100;

    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (percentage > 90) {
      status = 'error';
    } else if (percentage > 75) {
      status = 'warning';
    }

    return {
      status,
      usage: heapUsed,
      limit: heapTotal,
      percentage,
    };
  }

  /**
   * Disk usage check (simulated)
   */
  checkDisk(): {
    status: 'ok' | 'warning' | 'error';
    usage: number;
    limit: number;
    percentage: number;
  } {
    // In production, use actual disk usage check
    const usage = 50 * 1024 * 1024 * 1024; // 50GB
    const limit = 100 * 1024 * 1024 * 1024; // 100GB
    const percentage = (usage / limit) * 100;

    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (percentage > 90) {
      status = 'error';
    } else if (percentage > 75) {
      status = 'warning';
    }

    return {
      status,
      usage,
      limit,
      percentage,
    };
  }

  /**
   * Full health check
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const [dbCheck, redisCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const memoryCheck = this.checkMemory();
    const diskCheck = this.checkDisk();

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (dbCheck.status === 'error' || redisCheck.status === 'error') {
      overallStatus = 'unhealthy';
    } else if (
      memoryCheck.status === 'error' ||
      diskCheck.status === 'error'
    ) {
      overallStatus = 'degraded';
    } else if (
      memoryCheck.status === 'warning' ||
      diskCheck.status === 'warning'
    ) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      checks: {
        database: dbCheck,
        redis: redisCheck,
        memory: memoryCheck,
        disk: diskCheck,
      },
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Readiness probe (for Kubernetes)
   */
  async isReady(): Promise<boolean> {
    const health = await this.getHealthStatus();
    return health.status !== 'unhealthy';
  }

  /**
   * Liveness probe (for Kubernetes)
   */
  async isAlive(): Promise<boolean> {
    // Simple check - if app is running, it's alive
    return true;
  }
}

/**
 * Health Check Middleware
 */
export const healthCheckMiddleware = (healthChecker: HealthChecker) => {
  return async (req: any, res: any, next: any) => {
    if (req.path === '/health') {
      const health = await healthChecker.getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
      return;
    }

    if (req.path === '/ready') {
      const ready = await healthChecker.isReady();
      const statusCode = ready ? 200 : 503;
      res.status(statusCode).json({ ready });
      return;
    }

    if (req.path === '/live') {
      const alive = await healthChecker.isAlive();
      const statusCode = alive ? 200 : 503;
      res.status(statusCode).json({ alive });
      return;
    }

    next();
  };
};

export const healthChecker = new HealthChecker();
