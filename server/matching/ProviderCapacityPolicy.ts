export const DEFAULT_MAX_CONCURRENT_ACTIVE_JOBS = 1;
export const MAX_ALLOWED_CONCURRENT_ACTIVE_JOBS = 10;

export type ProviderCapacityDecision = {
  maxConcurrentActiveJobs: number;
  activeJobCount: number;
  available: boolean;
  usedFallback: boolean;
};

/**
 * Capacity is server-derived. Missing/unapplied, null, fractional, negative or
 * excessive values fail to the conservative one-active-job limit instead of
 * accepting client-provided capacity.
 */
export function normalizeProviderMaxConcurrentActiveJobs(value: unknown): {
  maxConcurrentActiveJobs: number;
  usedFallback: boolean;
} {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > MAX_ALLOWED_CONCURRENT_ACTIVE_JOBS) {
    return { maxConcurrentActiveJobs: DEFAULT_MAX_CONCURRENT_ACTIVE_JOBS, usedFallback: true };
  }
  return { maxConcurrentActiveJobs: value as number, usedFallback: false };
}

export function decideProviderCapacity(input: { configuredMaxConcurrentActiveJobs: unknown; activeJobCount: unknown }): ProviderCapacityDecision {
  const normalized = normalizeProviderMaxConcurrentActiveJobs(input.configuredMaxConcurrentActiveJobs);
  const activeJobCount = Number.isInteger(input.activeJobCount) && (input.activeJobCount as number) >= 0
    ? input.activeJobCount as number
    : Number.MAX_SAFE_INTEGER;
  return {
    ...normalized,
    activeJobCount,
    available: activeJobCount < normalized.maxConcurrentActiveJobs,
  };
}

export function assertProviderCapacityAvailable(input: { configuredMaxConcurrentActiveJobs: unknown; activeJobCount: unknown }) {
  const decision = decideProviderCapacity(input);
  if (!decision.available) throw new Error("PROVIDER_CAPACITY_EXCEEDED");
  return decision;
}
