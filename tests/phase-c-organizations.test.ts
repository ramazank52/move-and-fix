import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  listOrganizationsForUser: vi.fn(),
  listOrganizationInvitations: vi.fn(),
  createOrganization: vi.fn(),
  listOrganizationMembers: vi.fn(),
  inviteOrganizationMember: vi.fn(),
  acceptOrganizationInvitation: vi.fn(),
  updateOrganizationMemberRole: vi.fn(),
  archiveOrganization: vi.fn(),
  getUserServiceRequests: vi.fn(),
  getServiceRequestById: vi.fn(),
  getProviderProfile: vi.fn(),
  canAccessOrganizationRequest: vi.fn(),
  getServiceRequestDetails: vi.fn(),
  getServiceRequestMedia: vi.fn(),
  getActiveServiceCategories: vi.fn(),
  createServiceRequest: vi.fn(),
  listOrganizationRequestBatches: vi.fn(),
  createOrganizationRequestBatch: vi.fn(),
  addOrganizationRequestToBatch: vi.fn(),
  submitOrganizationRequestBatch: vi.fn(),
  listOrganizationInvoices: vi.fn(),
  issueOrganizationInvoiceForRequest: vi.fn(),
}));

import * as organizationDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 71): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `organization-user-${id}`,
    email: `organization-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "Kurumsal Test Kullanıcısı",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("Phase C organization router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives organization ownership only from the authenticated caller", async () => {
    vi.mocked(organizationDb.createOrganization).mockResolvedValue(501);

    await expect(appRouter.createCaller(createContext(86)).organizations.create({
      name: "Move&Fix Filo A.Ş.",
      taxId: "1234567890",
      type: "fleet",
    })).resolves.toBe(501);

    expect(organizationDb.createOrganization).toHaveBeenCalledWith({
      ownerId: 86,
      name: "Move&Fix Filo A.Ş.",
      taxId: "1234567890",
      type: "fleet",
    });
  });

  it("rejects anonymous organization access before any data helper runs", async () => {
    const anonymous = appRouter.createCaller({ ...createContext(), user: null });
    await expect(anonymous.organizations.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonymous.organizations.create({ name: "X Kurumsal", type: "corporate" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(organizationDb.listOrganizationsForUser).not.toHaveBeenCalled();
    expect(organizationDb.createOrganization).not.toHaveBeenCalled();
  });

  it("uses the authenticated member identity for invitations and invitation acceptance", async () => {
    vi.mocked(organizationDb.inviteOrganizationMember).mockResolvedValue(42);
    vi.mocked(organizationDb.acceptOrganizationInvitation).mockResolvedValue({ organizationId: 11, joinedAt: new Date() });
    const caller = appRouter.createCaller(createContext(93));

    await caller.organizations.invite({ organizationId: 11, userId: 17, role: "member" });
    await caller.organizations.acceptInvitation({ organizationId: 11 });

    expect(organizationDb.inviteOrganizationMember).toHaveBeenCalledWith({ organizationId: 11, actorUserId: 93, userId: 17, role: "member" });
    expect(organizationDb.acceptOrganizationInvitation).toHaveBeenCalledWith({ organizationId: 11, userId: 93 });
  });

  it("maps denied organization membership operations to a fail-closed forbidden result", async () => {
    vi.mocked(organizationDb.archiveOrganization).mockRejectedValue(new Error("ORGANIZATION_OWNER_REQUIRED"));
    await expect(appRouter.createCaller(createContext(77)).organizations.archive({ organizationId: 11 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("passes a validated organization identifier to the existing service-request creation path", async () => {
    vi.mocked(organizationDb.getActiveServiceCategories).mockResolvedValue([{ id: 1, slug: "cleaning", subcategories: [] }] as never);
    vi.mocked(organizationDb.createServiceRequest).mockResolvedValue(765);

    await expect(appRouter.createCaller(createContext(52)).requests.create({
      categoryId: 1,
      title: "Merkez ofis temizliği",
      organizationId: 24,
    })).resolves.toBe(765);

    expect(organizationDb.createServiceRequest).toHaveBeenCalledWith(expect.objectContaining({
      userId: 52,
      organizationId: 24,
      categoryId: 1,
      title: "Merkez ofis temizliği",
    }));
  });

  it("allows a verified active organization member to read an organization-scoped request", async () => {
    vi.mocked(organizationDb.getServiceRequestById).mockResolvedValue({ id: 9, userId: 12, organizationId: 24, assignedProviderId: null } as never);
    vi.mocked(organizationDb.getProviderProfile).mockResolvedValue(null);
    vi.mocked(organizationDb.canAccessOrganizationRequest).mockResolvedValue(true);
    vi.mocked(organizationDb.getServiceRequestDetails).mockResolvedValue(null);
    vi.mocked(organizationDb.getServiceRequestMedia).mockResolvedValue([]);

    await expect(appRouter.createCaller(createContext(52)).requests.get({ id: 9 })).resolves.toMatchObject({ id: 9, organizationId: 24 });
    expect(organizationDb.canAccessOrganizationRequest).toHaveBeenCalledWith({ organizationId: 24, userId: 52 });
  });

  it("rejects malformed organization and request identifiers before data access", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.organizations.members({ organizationId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.requests.create({ categoryId: 1, title: "Kısa", organizationId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(organizationDb.listOrganizationMembers).not.toHaveBeenCalled();
    expect(organizationDb.createServiceRequest).not.toHaveBeenCalled();
  });

  it("derives batch and invoice authority exclusively from the authenticated organization member", async () => {
    vi.mocked(organizationDb.createOrganizationRequestBatch).mockResolvedValue({ id: 801, status: "draft" });
    vi.mocked(organizationDb.issueOrganizationInvoiceForRequest).mockResolvedValue({ id: 901, invoiceNumber: "MF-24-18-7", status: "issued" });
    const caller = appRouter.createCaller(createContext(61));

    await expect(caller.organizations.createRequestBatch({
      organizationId: 24,
      title: "Bölgesel bakım turu",
      categoryId: 7,
    })).resolves.toEqual({ id: 801, status: "draft" });
    await expect(caller.organizations.issueInvoice({ organizationId: 24, requestId: 18 }))
      .resolves.toEqual({ id: 901, invoiceNumber: "MF-24-18-7", status: "issued" });

    expect(organizationDb.createOrganizationRequestBatch).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 24, actorUserId: 61 }));
    expect(organizationDb.issueOrganizationInvoiceForRequest).toHaveBeenCalledWith({ organizationId: 24, requestId: 18, actorUserId: 61 });
  });

  it("rejects malformed batch or invoice identifiers before helper invocation", async () => {
    const caller = appRouter.createCaller(createContext(61));
    await expect(caller.organizations.addRequestToBatch({ batchId: 0, requestId: 1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.organizations.issueInvoice({ organizationId: 24, requestId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(organizationDb.addOrganizationRequestToBatch).not.toHaveBeenCalled();
    expect(organizationDb.issueOrganizationInvoiceForRequest).not.toHaveBeenCalled();
  });

  it("keeps invoice issuance fail-closed when no settled payment supports the request", async () => {
    vi.mocked(organizationDb.issueOrganizationInvoiceForRequest).mockRejectedValue(new Error("ORGANIZATION_INVOICE_PAYMENT_NOT_SETTLED"));
    await expect(appRouter.createCaller(createContext(61)).organizations.issueInvoice({ organizationId: 24, requestId: 18 }))
      .rejects.toThrow("ORGANIZATION_INVOICE_PAYMENT_NOT_SETTLED");
  });
});
