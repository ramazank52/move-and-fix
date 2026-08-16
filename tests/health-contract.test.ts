import { describe, expect, it } from 'vitest';

import { HealthChecker } from '../server/_core/health';

describe('health check contract', () => {
  it('reports an unconfigured Redis dependency explicitly rather than fabricating a healthy response', async () => {
    const health = await new HealthChecker().checkRedis();

    expect(health.status).toBe('not_configured');
    expect(health.responseTime).toBeGreaterThanOrEqual(0);
  });

  it('reads actual disk metrics from the active filesystem', async () => {
    const disk = await new HealthChecker().checkDisk();

    expect(disk.limit).toBeGreaterThan(0);
    expect(disk.usage).toBeGreaterThanOrEqual(0);
    expect(disk.percentage).toBeGreaterThanOrEqual(0);
  });
});
