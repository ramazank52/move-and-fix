/**
 * Circuit Breaker Pattern
 *
 * Issue #12: External service calls (payment, email) can fail cascadingly.
 * Circuit breaker prevents cascading failures by breaking the circuit
 * when failure rate exceeds a threshold.
 *
 * States: CLOSED → OPEN → HALF_OPEN → CLOSED
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  /** Failure threshold to trip the circuit (default: 5) */
  failureThreshold: number;
  /** Time to wait before attempting half-open (ms, default: 60000) */
  resetTimeoutMs: number;
  /** Successes needed in half-open to close circuit (default: 3) */
  halfOpenSuccessThreshold: number;
  /** Request timeout (ms, default: 30000) */
  requestTimeoutMs: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenSuccessThreshold: 3,
  requestTimeoutMs: 30000,
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: Date | null = null;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection.
   * Throws Error if circuit is open.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half_open';
        console.log(`[CircuitBreaker:${this.name}] Transitioning to half_open`);
      } else {
        throw new Error(`Circuit breaker '${this.name}' is open — service unavailable`);
      }
    }

    try {
      const result = await this.withTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async withTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Circuit breaker '${this.name}' request timeout`)),
          this.config.requestTimeoutMs,
        ),
      ),
    ]);
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'half_open') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenSuccessThreshold) {
        this.state = 'closed';
        this.successCount = 0;
        console.log(`[CircuitBreaker:${this.name}] Circuit closed — service recovered`);
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    if (this.state === 'half_open') {
      this.state = 'open';
      this.successCount = 0;
      console.log(`[CircuitBreaker:${this.name}] Re-opening circuit from half_open`);
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      console.log(
        `[CircuitBreaker:${this.name}] Circuit opened after ${this.failureCount} failures`,
      );
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime.getTime() >= this.config.resetTimeoutMs;
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }
}

/** Pre-configured circuit breakers for external services */
export const circuitBreakers = {
  payment: new CircuitBreaker('payment', {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    requestTimeoutMs: 30000,
  }),
  email: new CircuitBreaker('email', {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
    requestTimeoutMs: 10000,
  }),
  sms: new CircuitBreaker('sms', {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
    requestTimeoutMs: 10000,
  }),
  push: new CircuitBreaker('push', {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    requestTimeoutMs: 15000,
  }),
};
