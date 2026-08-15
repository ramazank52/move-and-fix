import { describe, expect, it, vi } from "vitest";

import { clearSessionCookie } from "../server/_core/cookies";
import { COOKIE_NAME } from "../shared/const";

describe("authentication cookie cleanup", () => {
  it("expires an invalid hosted session with the same shareable cookie scope", () => {
    const clearCookie = vi.fn();
    const req = {
      hostname: "3000-preview.sg1.manus.computer",
      protocol: "https",
      headers: { "x-forwarded-proto": "https" },
    };

    clearSessionCookie(req as any, { clearCookie } as any);

    expect(clearCookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      expect.objectContaining({
        domain: ".manus.computer",
        path: "/",
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: -1,
      }),
    );
  });
});
