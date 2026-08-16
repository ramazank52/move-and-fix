import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return { ...actual, getProfessionalAiJobContext: vi.fn() };
});

import * as db from "../server/db";
import { appRouter } from "../server/routers";

function createContext(userId = 83, authenticated = true) {
  return {
    user: authenticated ? { id: userId, openId: `provider-${userId}`, role: "user" } : null,
    req: { protocol: "https", hostname: "localhost", headers: {} },
    res: {},
  } as never;
}

describe("professional AI router boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller before any professional AI preflight", async () => {
    await expect(
      appRouter.createCaller(createContext(83, false)).ai.professionalPreflight({ requestId: 19, capability: "job_summary" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.getProfessionalAiJobContext).not.toHaveBeenCalled();
  });

  it("derives provider ownership from the session and allows only a non-binding active-job capability", async () => {
    vi.mocked(db.getProfessionalAiJobContext).mockResolvedValue({ isAssignedProvider: true, status: "active" } as never);

    await expect(
      appRouter.createCaller(createContext(83)).ai.professionalPreflight({ requestId: 19, capability: "safety_checklist" }),
    ).resolves.toMatchObject({ allowed: true, scope: "assigned_active_job", canExecute: false, canSetPrice: false });
    expect(db.getProfessionalAiJobContext).toHaveBeenCalledWith(19, 83);
  });

  it("fails closed for an unassigned provider and never treats a price request as assistance", async () => {
    vi.mocked(db.getProfessionalAiJobContext).mockResolvedValue({ isAssignedProvider: false, status: "active" } as never);
    await expect(
      appRouter.createCaller(createContext(84)).ai.professionalPreflight({ requestId: 19, capability: "price_quote" }),
    ).resolves.toMatchObject({ allowed: false });
  });
});
