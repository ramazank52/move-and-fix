import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    getCompletionWorkflow: vi.fn(),
    submitCompletionProof: vi.fn(),
    approveCompletionProof: vi.fn(),
    openCompletionDispute: vi.fn(),
    resolveCompletionDispute: vi.fn(),
  };
});

vi.mock("../server/storage", () => ({ storagePut: vi.fn() }));

import * as completionDb from "../server/db";
import { appRouter } from "../server/routers";
import { storagePut } from "../server/storage";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 121, role: AuthenticatedUser["role"] = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `completion-${id}`,
    email: `completion-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "Completion Test",
    loginMethod: "local",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function workflow(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 91,
    viewerRole: "provider",
    canProviderSubmitProof: false,
    canCustomerRespond: false,
    responseExpired: false,
    proof: null,
    dispute: null,
    ...overrides,
  } as unknown as Awaited<ReturnType<typeof completionDb.getCompletionWorkflow>>;
}

const validPngBase64 = "iVBORw0KGgo=";

describe("completion proof and escrow security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects anonymous proof, approval and dispute mutations", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });
    await expect(caller.completion.submitProof({ requestId: 91, summary: "On karakterden uzun iş açıklaması", media: [{ originalName: "proof.png", mimeType: "image/png", base64: validPngBase64 }] })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.completion.approve({ requestId: 91 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.completion.dispute({ requestId: 91, reasonCode: "quality_issue", description: "On karakterden uzun itiraz açıklaması" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("does not persist a proof when the current actor is not the assigned provider", async () => {
    vi.mocked(completionDb.getCompletionWorkflow).mockResolvedValue(workflow());
    const caller = appRouter.createCaller(createContext(122));

    await expect(caller.completion.submitProof({ requestId: 91, summary: "On karakterden uzun iş açıklaması", media: [{ originalName: "proof.png", mimeType: "image/png", base64: validPngBase64 }] }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    expect(storagePut).not.toHaveBeenCalled();
    expect(completionDb.submitCompletionProof).not.toHaveBeenCalled();
  });

  it("rejects an invalid proof signature before any storage write", async () => {
    vi.mocked(completionDb.getCompletionWorkflow).mockResolvedValue(workflow({ canProviderSubmitProof: true }));
    const caller = appRouter.createCaller(createContext(123));

    await expect(caller.completion.submitProof({ requestId: 91, summary: "On karakterden uzun iş açıklaması", media: [{ originalName: "proof.png", mimeType: "image/png", base64: "AAAA" }] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(storagePut).not.toHaveBeenCalled();
    expect(completionDb.submitCompletionProof).not.toHaveBeenCalled();
  });

  it("maps expired, disputed or incompatible escrow state to a conflict without a payout side effect", async () => {
    vi.mocked(completionDb.approveCompletionProof).mockRejectedValue(new Error("RESPONSE_EXPIRED"));
    vi.mocked(completionDb.openCompletionDispute).mockRejectedValue(new Error("DISPUTE_OPEN"));
    const caller = appRouter.createCaller(createContext(124));

    await expect(caller.completion.approve({ requestId: 91 })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller.completion.dispute({ requestId: 91, reasonCode: "quality_issue", description: "On karakterden uzun itiraz açıklaması" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("enforces the admin-only dispute resolution boundary before an escrow decision", async () => {
    const caller = appRouter.createCaller(createContext(125, "user"));

    await expect(caller.admin.resolveCompletionDispute({
      requestId: 91,
      resolution: "provider",
      resolutionNote: "On karakterden uzun inceleme kararı",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(completionDb.resolveCompletionDispute).not.toHaveBeenCalled();
  });
});
