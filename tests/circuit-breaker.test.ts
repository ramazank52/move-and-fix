import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker, circuitBreakers } from '../server/_core/circuitBreaker';

describe('Circuit Breaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      resetTimeoutMs: 100,
      halfOpenSuccessThreshold: 2,
      requestTimeoutMs: 5000,
    });
  });

  it('should start in closed state', () => {
    expect(cb.getState()).toBe('closed');
  });

  it('should execute function successfully in closed state', async () => {
    const result = await cb.execute(async () => 42);
    expect(result).toBe(42);
    expect(cb.getState()).toBe('closed');
  });

  it('should open after reaching failure threshold', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('Service error');
        });
      } catch {
        // expected
      }
    }
    expect(cb.getState()).toBe('open');
  });

  it('should reject calls when open', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('Service error');
        });
      } catch {
        // expected
      }
    }
    await expect(cb.execute(async () => 42)).rejects.toThrow('is open');
  });

  it('should transition to half_open after reset timeout', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('Service error');
        });
      } catch {
        // expected
      }
    }
    expect(cb.getState()).toBe('open');
    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));
    // Next call should transition to half_open and attempt execution
    const result = await cb.execute(async () => 'recovered');
    expect(result).toBe('recovered');
  });

  it('should close after enough successes in half_open', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('Service error');
        });
      } catch {
        // expected
      }
    }
    await new Promise(resolve => setTimeout(resolve, 150));
    // Need 2 successes to close
    await cb.execute(async () => 'ok1');
    expect(cb.getState()).toBe('half_open');
    await cb.execute(async () => 'ok2');
    expect(cb.getState()).toBe('closed');
  });

  it('should re-open if failure occurs in half_open', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('Service error');
        });
      } catch {
        // expected
      }
    }
    await new Promise(resolve => setTimeout(resolve, 150));
    try {
      await cb.execute(async () => {
        throw new Error('Still failing');
      });
    } catch {
      // expected
    }
    expect(cb.getState()).toBe('open');
  });

  it('should provide metrics', () => {
    const metrics = cb.getMetrics();
    expect(metrics.name).toBe('test-service');
    expect(metrics.state).toBe('closed');
    expect(metrics.failureCount).toBe(0);
  });

  it('should reset to closed state', () => {
    cb.reset();
    expect(cb.getState()).toBe('closed');
  });

  it('should have pre-configured circuit breakers', () => {
    expect(circuitBreakers.payment).toBeInstanceOf(CircuitBreaker);
    expect(circuitBreakers.email).toBeInstanceOf(CircuitBreaker);
    expect(circuitBreakers.sms).toBeInstanceOf(CircuitBreaker);
    expect(circuitBreakers.push).toBeInstanceOf(CircuitBreaker);
  });
});
