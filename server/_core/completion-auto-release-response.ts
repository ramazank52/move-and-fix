export type CompletionAutoReleaseResult = {
  requestId: number;
  released: boolean;
  duplicated: boolean;
  skipped?: string;
};

/** Creates the stable API response for a processed auto-release batch. */
export function createCompletionAutoReleaseResponse(results: CompletionAutoReleaseResult[]) {
  return {
    ok: true as const,
    results,
    summary: {
      processed: results.length,
      released: results.filter((item) => item.released).length,
      skipped: results.filter((item) => !item.released).length,
    },
  };
}
