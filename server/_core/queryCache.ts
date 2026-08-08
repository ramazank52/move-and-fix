/**
 * Query Result Cache
 *
 * Issue #22: Same queries executed repeatedly (category list, provider ratings).
 * Simple TTL-based in-memory cache for frequently accessed read-only data.
 * Production'da Redis ile değiştirilebilir.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 60000) {
    this.defaultTtlMs = defaultTtlMs;
    // Periodic cleanup every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Get a cached value by key. Returns undefined if not found or expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  /**
   * Set a value in the cache with optional TTL.
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get or compute — if key exists and is fresh, return cached value.
   * Otherwise, call the factory function, cache and return the result.
   */
  async getOrCompute<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Invalidate a specific cache key.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix.
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached values.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics.
   */
  getStats() {
    let expired = 0;
    const now = Date.now();
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) expired++;
    }
    return {
      totalEntries: this.cache.size,
      expiredEntries: expired,
      activeEntries: this.cache.size - expired,
    };
  }
}

/** Singleton instance */
export const queryCache = new QueryCache(
  parseInt(process.env.CACHE_DEFAULT_TTL_MS || '60000', 10),
);

/** Cache key helpers */
export const cacheKeys = {
  categories: 'categories:all',
  providerRatings: (providerId: number) => `provider:${providerId}:ratings`,
  nearbyProviders: (lat: string, lng: string) => `providers:nearby:${lat}:${lng}`,
  userRequests: (userId: number) => `user:${userId}:requests`,
  requestOffers: (requestId: number) => `request:${requestId}:offers`,
};
