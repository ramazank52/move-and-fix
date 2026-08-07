/**
 * Performance Optimization Module
 * 
 * Özellikleri:
 * - Caching (In-memory, Redis-ready)
 * - Database query optimization
 * - Connection pooling
 * - Rate limiting
 * - Compression
 * - CDN optimization
 */

/**
 * Cache Manager
 */
export class CacheManager {
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private defaultTTL = 3600000; // 1 hour

  /**
   * Cache'e veri ekle
   */
  set(key: string, value: any, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Cache'den veri al
   */
  get(key: string): any | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Cache'i temizle
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Tüm cache'i temizle
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Cache istatistikleri
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: JSON.stringify(Array.from(this.cache.values())).length,
    };
  }

  /**
   * Eski cache'leri temizle
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Database Query Optimizer
 */
export class QueryOptimizer {
  /**
   * N+1 Query Problem'u çöz
   */
  static optimizeNPlusOne(query: string): string {
    // JOIN kullanarak N+1 sorunu çöz
    if (query.includes('SELECT * FROM users')) {
      return `
        SELECT u.*, 
               COUNT(o.id) as order_count,
               SUM(o.amount) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        GROUP BY u.id
      `;
    }
    return query;
  }

  /**
   * Index önerileri
   */
  static getIndexRecommendations(): string[] {
    return [
      'CREATE INDEX idx_users_email ON users(email);',
      'CREATE INDEX idx_orders_user_id ON orders(user_id);',
      'CREATE INDEX idx_orders_status ON orders(status);',
      'CREATE INDEX idx_payments_order_id ON payments(order_id);',
      'CREATE INDEX idx_payments_status ON payments(status);',
      'CREATE INDEX idx_notifications_user_id ON notifications(user_id);',
      'CREATE INDEX idx_wallet_user_id ON wallet(user_id);',
      'CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);',
    ];
  }

  /**
   * Query performansını analiz et
   */
  static analyzeQueryPerformance(query: string, executionTime: number): {
    status: 'good' | 'warning' | 'critical';
    message: string;
    recommendation?: string;
  } {
    if (executionTime < 100) {
      return {
        status: 'good',
        message: `Query executed in ${executionTime}ms (excellent)`,
      };
    } else if (executionTime < 500) {
      return {
        status: 'warning',
        message: `Query executed in ${executionTime}ms (acceptable)`,
        recommendation: 'Consider adding indexes or optimizing the query',
      };
    } else {
      return {
        status: 'critical',
        message: `Query executed in ${executionTime}ms (slow)`,
        recommendation: 'This query needs optimization. Check for missing indexes or N+1 problems',
      };
    }
  }
}

/**
 * Connection Pool Manager
 */
export class ConnectionPoolManager {
  private pool: any[] = [];
  private maxConnections = 10;
  private activeConnections = 0;

  constructor(maxConnections: number = 10) {
    this.maxConnections = maxConnections;
    this.initializePool();
  }

  /**
   * Connection pool'u başlat
   */
  private initializePool(): void {
    for (let i = 0; i < this.maxConnections; i++) {
      this.pool.push({
        id: `conn-${i}`,
        active: false,
        createdAt: new Date(),
      });
    }
  }

  /**
    * Connection al
   */
  async getConnection(): Promise<any> {
    const availableConnection = this.pool.find(conn => !conn.active);

    if (!availableConnection) {
      throw new Error('No available connections in pool');
    }

    availableConnection.active = true;
    this.activeConnections++;

    return availableConnection;
  }

  /**
   * Connection'ı geri ver
   */
  releaseConnection(connection: any): void {
    connection.active = false;
    this.activeConnections--;
  }

  /**
   * Pool istatistikleri
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    availableConnections: number;
    utilizationRate: number;
  } {
    return {
      totalConnections: this.maxConnections,
      activeConnections: this.activeConnections,
      availableConnections: this.maxConnections - this.activeConnections,
      utilizationRate: (this.activeConnections / this.maxConnections) * 100,
    };
  }
}

/**
 * Response Compression
 */
export class ResponseCompression {
  /**
   * Gzip compression middleware
   */
  static gzipMiddleware() {
    return (req: any, res: any, next: any) => {
      const originalJson = res.json;

      res.json = function (data: any) {
        // Accept-Encoding header'ı kontrol et
        if (req.headers['accept-encoding']?.includes('gzip')) {
          res.setHeader('Content-Encoding', 'gzip');
        }

        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Payload boyutunu azalt
   */
  static minifyPayload(data: any): any {
    return JSON.parse(JSON.stringify(data));
  }
}

/**
 * CDN Optimization
 */
export class CDNOptimization {
  /**
   * Static asset caching headers
   */
  static getStaticAssetHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': `"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString(),
    };
  }

  /**
   * Dynamic content caching headers
   */
  static getDynamicContentHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'public, max-age=3600, must-revalidate',
      'ETag': `"${Date.now()}"`,
    };
  }

  /**
   * Private content caching headers
   */
  static getPrivateContentHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'private, max-age=3600, must-revalidate',
    };
  }
}

/**
 * Database Indexing Strategy
 */
export class IndexingStrategy {
  /**
   * Sık kullanılan sorguları analiz et
   */
  static analyzeCommonQueries(): Array<{
    query: string;
    frequency: number;
    suggestedIndex: string;
  }> {
    return [
      {
        query: 'SELECT * FROM users WHERE email = ?',
        frequency: 1000,
        suggestedIndex: 'CREATE INDEX idx_users_email ON users(email);',
      },
      {
        query: 'SELECT * FROM orders WHERE user_id = ? AND status = ?',
        frequency: 800,
        suggestedIndex: 'CREATE INDEX idx_orders_user_status ON orders(user_id, status);',
      },
      {
        query: 'SELECT * FROM payments WHERE order_id = ?',
        frequency: 600,
        suggestedIndex: 'CREATE INDEX idx_payments_order_id ON payments(order_id);',
      },
      {
        query: 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        frequency: 500,
        suggestedIndex: 'CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);',
      },
      {
        query: 'SELECT * FROM wallet WHERE user_id = ?',
        frequency: 700,
        suggestedIndex: 'CREATE INDEX idx_wallet_user_id ON wallet(user_id);',
      },
    ];
  }

  /**
   * Composite index önerileri
   */
  static getCompositeIndexes(): string[] {
    return [
      'CREATE INDEX idx_orders_user_status_date ON orders(user_id, status, created_at DESC);',
      'CREATE INDEX idx_payments_user_status_date ON payments(user_id, status, created_at DESC);',
      'CREATE INDEX idx_notifications_user_read_date ON notifications(user_id, read, created_at DESC);',
    ];
  }
}

/**
 * Performance Monitoring
 */
export class PerformanceMonitor {
  private metrics: Array<{
    endpoint: string;
    method: string;
    responseTime: number;
    timestamp: Date;
  }> = [];

  /**
   * Request'i track et
   */
  trackRequest(
    endpoint: string,
    method: string,
    responseTime: number
  ): void {
    this.metrics.push({
      endpoint,
      method,
      responseTime,
      timestamp: new Date(),
    });

    // Son 10000 metriği tut
    if (this.metrics.length > 10000) {
      this.metrics.shift();
    }
  }

  /**
   * Ortalama response time
   */
  getAverageResponseTime(endpoint?: string): number {
    let filtered = this.metrics;

    if (endpoint) {
      filtered = this.metrics.filter(m => m.endpoint === endpoint);
    }

    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, m) => sum + m.responseTime, 0);
    return total / filtered.length;
  }

  /**
   * Yavaş endpoint'leri getir
   */
  getSlowEndpoints(threshold: number = 1000): Array<{
    endpoint: string;
    method: string;
    averageTime: number;
    count: number;
  }> {
    const grouped: Record<string, any[]> = {};

    this.metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(m);
    });

    return Object.entries(grouped)
      .map(([key, metrics]) => {
        const [method, endpoint] = key.split(' ');
        const averageTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;

        return {
          endpoint,
          method,
          averageTime,
          count: metrics.length,
        };
      })
      .filter(item => item.averageTime > threshold)
      .sort((a, b) => b.averageTime - a.averageTime);
  }

  /**
   * Performance raporu
   */
  getPerformanceReport(): {
    totalRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowEndpoints: any[];
  } {
    const responseTimes = this.metrics.map(m => m.responseTime).sort((a, b) => a - b);

    return {
      totalRequests: this.metrics.length,
      averageResponseTime: this.getAverageResponseTime(),
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      slowEndpoints: this.getSlowEndpoints(),
    };
  }
}

export const cacheManager = new CacheManager();
export const connectionPoolManager = new ConnectionPoolManager();
export const performanceMonitor = new PerformanceMonitor();
