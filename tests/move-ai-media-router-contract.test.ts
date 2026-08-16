import { describe, expect, it, vi } from "vitest";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return { ...actual, createMoveAiDraft: vi.fn() };
});

import * as db from "../server/db";
import { appRouter } from "../server/routers";

const authenticatedContext = {
  user: { id: 91, openId: "media-owner-91", role: "user" },
  req: { protocol: "https", hostname: "localhost", headers: {} },
  res: {},
} as never;

describe("MoveAI media router consent contract", () => {
  it("rejects attached media without explicit consent before any draft write", async () => {
    const caller = appRouter.createCaller(authenticatedContext);

    await expect(
      caller.ai.command({
        message: "Musluktan su akıyor",
        attachedMediaOpaqueIds: ["b8f41f87-9bd9-4162-aa00-5e60269ef55b"],
        mediaConsentGranted: false,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(db.createMoveAiDraft).not.toHaveBeenCalled();
  });
});
