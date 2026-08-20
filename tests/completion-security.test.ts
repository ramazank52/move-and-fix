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
    planPartialCompletionDisputeSettlement: vi.fn(),
    hasActiveCompletionDisputeReviewerPermission: vi.fn(),
    hasValidAdminMfaGrant: vi.fn(),
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
    sessionFingerprint: `completion-session-${id}`,
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(completionDb.hasValidAdminMfaGrant).mockResolvedValue(true);
  });

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

  it("keeps a customer-favoring dispute decision pending until a verified gateway refund callback", async () => {
    vi.mocked(completionDb.resolveCompletionDispute).mockResolvedValue({
      requestId: 91,
      resolution: "customer",
      settlementPending: true,
      resolvedAt: null,
    });
    const caller = appRouter.createCaller(createContext(126, "admin"));

    await expect(caller.admin.resolveCompletionDispute({
      requestId: 91,
      resolution: "customer",
      resolutionNote: "Gateway doğrulaması bekleyen müşteri lehine inceleme kararı",
    })).resolves.toMatchObject({ settlementPending: true, resolvedAt: null });

    expect(completionDb.resolveCompletionDispute).toHaveBeenCalledWith({
      requestId: 91,
      resolution: "customer",
      resolutionNote: "Gateway doğrulaması bekleyen müşteri lehine inceleme kararı",
      adminUserId: 126,
    });
  });

  it("requires both an active MFA grant and a separate dispute reviewer grant before partial settlement planning", async () => {
    const input = {
      requestId: 91,
      customerRefundAmount: 3_000,
      resolutionNote: "Kanıtlar kısmi müşteri iadesi ve sağlayıcı ödemesi gerektiriyor.",
    };
    vi.mocked(completionDb.hasValidAdminMfaGrant).mockResolvedValue(false);
    const noMfaCaller = appRouter.createCaller(createContext(127, "admin"));
    await expect(noMfaCaller.admin.planPartialCompletionDisputeSettlement(input))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(completionDb.hasActiveCompletionDisputeReviewerPermission).not.toHaveBeenCalled();

    vi.mocked(completionDb.hasValidAdminMfaGrant).mockResolvedValue(true);
    vi.mocked(completionDb.hasActiveCompletionDisputeReviewerPermission).mockResolvedValue(false);
    const noReviewerCaller = appRouter.createCaller(createContext(127, "admin"));
    await expect(noReviewerCaller.admin.planPartialCompletionDisputeSettlement(input))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(completionDb.planPartialCompletionDisputeSettlement).not.toHaveBeenCalled();
  });

  it("uses server-authoritative reviewer identity and rejects non-whole partial refund input", async () => {
    vi.mocked(completionDb.hasActiveCompletionDisputeReviewerPermission).mockResolvedValue(true);
    vi.mocked(completionDb.planPartialCompletionDisputeSettlement).mockResolvedValue({
      disputeId: 11,
      paymentId: 22,
      customerRefundAmount: 3_000,
      providerGrossAmount: 7_000,
      commissionAmount: 700,
      providerPayoutAmount: 6_300,
      settlementPending: true,
    });
    const caller = appRouter.createCaller(createContext(128, "admin"));
    await expect(caller.admin.planPartialCompletionDisputeSettlement({
      requestId: 91,
      customerRefundAmount: 3_000.5,
      resolutionNote: "Kanıtlar kısmi müşteri iadesi ve sağlayıcı ödemesi gerektiriyor.",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await expect(caller.admin.planPartialCompletionDisputeSettlement({
      requestId: 91,
      customerRefundAmount: 3_000,
      resolutionNote: "Kanıtlar kısmi müşteri iadesi ve sağlayıcı ödemesi gerektiriyor.",
    })).resolves.toMatchObject({ settlementPending: true, providerPayoutAmount: 6_300 });
    expect(completionDb.planPartialCompletionDisputeSettlement).toHaveBeenCalledWith({
      requestId: 91,
      customerRefundAmount: 3_000,
      resolutionNote: "Kanıtlar kısmi müşteri iadesi ve sağlayıcı ödemesi gerektiriyor.",
      adminUserId: 128,
    });
  });
});
