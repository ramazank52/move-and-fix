import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

const { invokeLLMMock } = vi.hoisted(() => ({ invokeLLMMock: vi.fn() }));

vi.mock("../server/_core/llm", () => ({ invokeLLM: invokeLLMMock }));
vi.mock("../server/db", () => ({
  listMoveAiCatalogCandidates: vi.fn(),
  resolveMoveAiCatalogCategory: vi.fn(),
  createMoveAiDraft: vi.fn(),
}));

import * as moveAiDb from "../server/db";
import { appRouter } from "../server/routers";

function createContext(id = 61): TrpcContext {
  return {
    user: {
      id,
      openId: `move-ai-${id}`,
      email: `move-ai-${id}@example.test`,
      phone: null,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      name: "MoveAI Owner",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const catalogSnapshot = [{ alias: "plumbing", label: "Su tesisatı" }];

describe("P17-14 MoveAI canonical router behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks drafting when no authoritative catalog candidates are present", async () => {
    vi.mocked(moveAiDb.listMoveAiCatalogCandidates).mockResolvedValue([] as never);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.ai.command({ message: "Lavabom akıtıyor", language: "tr" }))
      .resolves.toMatchObject({ category: "general", catalogResolution: "MISSING_SERVICE_CATALOG_MAPPING", draftId: undefined });
    expect(invokeLLMMock).not.toHaveBeenCalled();
    expect(moveAiDb.resolveMoveAiCatalogCategory).not.toHaveBeenCalled();
    expect(moveAiDb.createMoveAiDraft).not.toHaveBeenCalled();
  });

  it("does not accept an LLM category that is absent from the live canonical snapshot", async () => {
    vi.mocked(moveAiDb.listMoveAiCatalogCandidates).mockResolvedValue(catalogSnapshot as never);
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ category: "towing", shouldCreateRequest: true }) } }] });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.ai.command({ message: "Araç çekici gerek", language: "tr" }))
      .resolves.toMatchObject({ category: "general", draftId: undefined });
    expect(moveAiDb.resolveMoveAiCatalogCategory).not.toHaveBeenCalled();
    expect(moveAiDb.createMoveAiDraft).not.toHaveBeenCalled();
  });

  it("creates a proposal only after the live candidate resolves to a canonical category", async () => {
    vi.mocked(moveAiDb.listMoveAiCatalogCandidates).mockResolvedValue(catalogSnapshot as never);
    vi.mocked(moveAiDb.resolveMoveAiCatalogCategory).mockResolvedValue({
      status: "RESOLVED",
      value: { categoryId: 77, subcategoryId: 88 },
    } as never);
    vi.mocked(moveAiDb.createMoveAiDraft).mockResolvedValue({ id: 511, status: "draft" } as never);
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ category: "plumbing", shouldCreateRequest: true }) } }] });
    const caller = appRouter.createCaller(createContext(73));

    await expect(caller.ai.command({ message: "Mutfak lavabosu akıtıyor", language: "tr" }))
      .resolves.toMatchObject({ category: "plumbing", draftId: 511, draftStatus: "draft" });
    expect(moveAiDb.resolveMoveAiCatalogCategory).toHaveBeenCalledWith("plumbing");
    expect(moveAiDb.createMoveAiDraft).toHaveBeenCalledWith(expect.objectContaining({
      userId: 73,
      categoryId: 77,
      assistantSummary: "MoveAI canonical classification: plumbing",
    }));
  });
});
