import { describe, expect, it } from "vitest";

import { createCompletionAutoReleaseResponse } from "../server/_core/completion-auto-release-response";

describe("completion auto-release response", () => {
  it("returns a stable result array and accurate batch summary", () => {
    const response = createCompletionAutoReleaseResponse([
      { requestId: 31, released: true, duplicated: false },
      { requestId: 32, released: false, duplicated: false, skipped: "DISPUTE_OPEN" },
    ]);

    expect(response).toEqual({
      ok: true,
      results: [
        { requestId: 31, released: true, duplicated: false },
        { requestId: 32, released: false, duplicated: false, skipped: "DISPUTE_OPEN" },
      ],
      summary: { processed: 2, released: 1, skipped: 1 },
    });
    expect(Array.isArray(response.results)).toBe(true);
  });
});
