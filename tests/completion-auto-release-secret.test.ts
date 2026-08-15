import { describe, expect, it } from "vitest";

import { ENV } from "../server/_core/env";

describe("completion auto-release callback secret", () => {
  it("accepts the configured scheduler credential before validating a non-mutating invalid limit", async () => {
    expect(ENV.completionAutoReleaseSecret.length).toBeGreaterThanOrEqual(32);

    const response = await fetch("http://127.0.0.1:3000/api/scheduled/completion-auto-release", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.completionAutoReleaseSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 0 }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "limit must be an integer between 1 and 100",
    });
  });
});
