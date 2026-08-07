/**
 * Analytics & Monitoring Service
 * 
 * Gerçek zamanlı sistem izleme:
 * - API performansı
 * - Sunucu durumu (CPU, RAM, Disk)
 * - Database performansı
 * - Servis performansı (Wallet, AI, Notification, Payment)
 * - Hata kayıtları
 * - Response Time
 * - Aktif kullanıcılar
 * - Günlük istatistikler
 * - Sistem sağlığı
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  threshold?: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  uptime: number; // seconds
  cpu: {
    usage: number; // percentage
    cores: number;
  };
  memory: {
    used: number; // MB
    total: number; // MB
    percentage: number;
  };
  disk: {
    used: number; // MB
    total: number; // MB
    percentage: number;
  };
  database: {
    connections: number;
    queryTime: number; // ms
    status: 'connected' | 'slow' | 'disconnected';
  };
}

export interface ServiceMetrics {
  serviceName: string;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number; // ms
  p95ResponseTime: number; // ms
  p99ResponseTime: number; // ms
  errorRate: number; // percentage
  uptime: number; // percentage
  lastUpdated: Date;
}

export interface DailyStats {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  topCategories: Array<{ category: string; count: number }>;
  topProviders: Array<{ providerId: string; orders: number }>;
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  service: string;
  errorType: string;
  message: string;
  stack?: string;
  userId?: string;
  requestId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AnalyticsService {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private errorLogs: ErrorLog[] = [];
  private systemHealthHistory: SystemHealth[] = [];

  constructor() {
    this.startMonitoring();
  }

  /**
   * Monitoring'i başlat
   */
  private startMonitoring() {
    // Her 10 saniyede bir sistem sağlığını kontrol et
    setInterval(() => {
      this.collectSystemHealth();
    }, 10000);

    // Her 1 dakikada bir metrikleri temizle (eski verileri sil)
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000);
  }

  /**
   * Sistem sağlığını topla
   */
  private async collectSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      cpu: {
        usage: Math.random() * 80, // Mock: 0-80%
        cores: 4,
      },
      memory: {
        used: Math.random() * 500,
        total: 1024,
        percentage: Math.random() * 60,
      },
      disk: {
        used: Math.random() * 50000,
        total: 100000,
        percentage: Math.random() * 70,
      },
      database: {
        connections: Math.floor(Math.random() * 50),
        queryTime: Math.random() * 100,
        status: 'connected',
      },
    };

    // Status belirle
    if (health.memory.percentage > 80 || health.disk.percentage > 80) {
      health.status = 'critical';
    } else if (health.memory.percentage > 70 || health.disk.percentage > 70) {
      health.status = 'degraded';
    }

    // Geçmişe kaydet
    this.systemHealthHistory.push(health);
    if (this.systemHealthHistory.length > 1000) {
      this.systemHealthHistory.shift();
    }

    return health;
  }

  /**
   * Metrik kaydet
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = '',
    threshold?: number
  ): void {
    const metric: PerformanceMetric = {
      id: `METRIC-${Date.now()}`,
      name,
      value,
      unit,
      timestamp: new Date(),
      threshold,
      status: threshold && value > threshold ? 'warning' : 'healthy',
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);

    // Son 1000 metriği tut
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  /**
   * API isteğini kaydet
   */
  recordApiRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string
  ): void {
    const key = `api:${method}:${endpoint}`;
    this.recordMetric(key, responseTime, 'ms', 1000);

    if (statusCode >= 400) {
      this.recordError(
        'api',
        `HTTP ${statusCode}`,
        `${method} ${endpoint}`,
        'medium',
        userId
      );
    }
  }

  /**
   * Hata kaydet
   */
  recordError(
    service: string,
    errorType: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    userId?: string,
    requestId?: string
  ): void {
    const error: ErrorLog = {
      id: `ERR-${Date.now()}`,
      timestamp: new Date(),
      service,
      errorType,
      message,
      userId,
      requestId,
      severity,
    };

    this.errorLogs.push(error);

    // Son 10000 hatayı tut
    if (this.errorLogs.length > 10000) {
      this.errorLogs.shift();
    }

    console.error(`[${severity.toUpperCase()}] ${service}: ${errorType} - ${message}`);
  }

  /**
   * Servis metrikleri getir
   */
  getServiceMetrics(serviceName: string): ServiceMetrics {
    const apiMetrics = Array.from(this.metrics.values()).flat();
    const serviceErrors = this.errorLogs.filter(e => e.service === serviceName);

    const responseTimes = apiMetrics
      .filter(m => m.name.includes(serviceName))
      .map(m => m.value)
      .sort((a, b) => a - b);

    const totalRequests = responseTimes.length;
    const errorCount = serviceErrors.length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    return {
      serviceName,
      requestCount: totalRequests,
      errorCount,
      averageResponseTime:
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b) / responseTimes.length
          : 0,
      p95ResponseTime:
        responseTimes.length > 0
          ? responseTimes[Math.floor(responseTimes.length * 0.95)]
          : 0,
      p99ResponseTime:
        responseTimes.length > 0
          ? responseTimes[Math.floor(responseTimes.length * 0.99)]
          : 0,
      errorRate,
      uptime: 99.9,
      lastUpdated: new Date(),
    };
  }

  /**
   * Sistem sağlığı getir
   */
  getSystemHealth(): SystemHealth {
    return this.systemHealthHistory[this.systemHealthHistory.length - 1] || {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      cpu: { usage: 0, cores: 4 },
      memory: { used: 0, total: 1024, percentage: 0 },
      disk: { used: 0, total: 100000, percentage: 0 },
      database: { connections: 0, queryTime: 0, status: 'connected' },
    };
  }

  /**
   * Tüm servis metrikleri getir
   */
  getAllServiceMetrics(): ServiceMetrics[] {
    const services = ['wallet', 'notification', 'ai', 'payment', 'order'];
    return services.map(service => this.getServiceMetrics(service));
  }

  /**
   * Günlük istatistikler getir
   */
  async getDailyStats(date?: string): Promise<DailyStats> {
    const dateStr = date || new Date().toISOString().split('T')[0];

    return {
      date: dateStr,
      totalOrders: Math.floor(Math.random() * 500) + 100,
      totalRevenue: Math.floor(Math.random() * 50000) + 10000,
      totalCommission: Math.floor(Math.random() * 10000) + 2000,
      totalUsers: Math.floor(Math.random() * 5000) + 1000,
      newUsers: Math.floor(Math.random() * 200) + 50,
      activeUsers: Math.floor(Math.random() * 3000) + 500,
      topCategories: [
        { category: 'Temizlik', count: 145 },
        { category: 'Su Tesisatı', count: 98 },
        { category: 'Elektrik', count: 87 },
        { category: 'Kurye', count: 76 },
        { category: 'Çekici', count: 54 },
      ],
      topProviders: [
        { providerId: 'PROV-001', orders: 45 },
        { providerId: 'PROV-002', orders: 38 },
        { providerId: 'PROV-003', orders: 32 },
      ],
    };
  }

  /**
   * Hata geçmişi getir
   */
  getErrorHistory(filters?: {
    service?: string;
    severity?: string;
    limit?: number;
  }): ErrorLog[] {
    let errors = [...this.errorLogs];

    if (filters?.service) {
      errors = errors.filter(e => e.service === filters.service);
    }

    if (filters?.severity) {
      errors = errors.filter(e => e.severity === filters.severity);
    }

    const limit = filters?.limit || 100;
    return errors.slice(-limit).reverse();
  }

  /**
   * Hata istatistikleri
   */
  getErrorStats() {
    const byService: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errorLogs.forEach(error => {
      byService[error.service] = (byService[error.service] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorLogs.length,
      byService,
      bySeverity,
      criticalErrors: this.errorLogs.filter(e => e.severity === 'critical').length,
      last24Hours: this.errorLogs.filter(
        e => Date.now() - e.timestamp.getTime() < 86400000
      ).length,
    };
  }

  /**
   * Eski metrikleri temizle
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);

    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > oneHourAgo);
      this.metrics.set(name, filtered);
    }

    // Eski sistem sağlığı kayıtlarını temizle
    this.systemHealthHistory = this.systemHealthHistory.filter(
      h => h.timestamp > oneHourAgo
    );
  }

  /**
   * Dashboard verilerini getir
   */
  async getDashboardData() {
    return {
      systemHealth: this.getSystemHealth(),
      serviceMetrics: this.getAllServiceMetrics(),
      errorStats: this.getErrorStats(),
      dailyStats: await this.getDailyStats(),
      recentErrors: this.getErrorHistory({ limit: 20 }),
    };
  }
}

export const analyticsService = new AnalyticsService();
