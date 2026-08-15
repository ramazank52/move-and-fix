import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

const db = vi.hoisted(() => ({
  getMoveOsDashboardMetrics: vi.fn(),
  listMoveOsCategories: vi.fn(),
  createMoveOsCategory: vi.fn(),
  archiveMoveOsCategory: vi.fn(),
  updateMoveOsCategory: vi.fn(),
  getMoveOsService: vi.fn(),
  getMoveOsUser: vi.fn(),
  hasValidAdminMfaGrant: vi.fn(),
  createAuthChallenge: vi.fn(),
  getLatestActiveAuthChallenge: vi.fn(),
  incrementAuthChallengeAttempts: vi.fn(),
  markAuthChallengeUsed: vi.fn(),
  createAdminMfaGrant: vi.fn(),
  listMoveOsServices: vi.fn(),
  listMoveOsUsers: vi.fn(),
  updateMoveOsUser: vi.fn(),
  listSettlementPoliciesForAdmin: vi.fn(),
  createSettlementPolicyForAdmin: vi.fn(),
  retireSettlementPolicyForAdmin: vi.fn(),
  listJobChangeOrdersForAdmin: vi.fn(),
  listJobCancellationCasesForAdmin: vi.fn(),
  reviewJobCancellationForAdmin: vi.fn(),
}));

vi.mock("../server/db", () => db);
vi.mock("../server/_core/env", () => ({ ENV: { cookieSecret: "moveos-mfa-test-secret" } }));

const notifications = vi.hoisted(() => ({
  sendVerificationCode: vi.fn(),
}));

const countryCompliance = vi.hoisted(() => ({
  listCountryComplianceOverviews: vi.fn(),
  createCountryJurisdiction: vi.fn(),
  createCountryCompliancePackage: vi.fn(),
  transitionCountryCompliancePackage: vi.fn(),
  registerOfficialComplianceSource: vi.fn(),
  saveCountryLaunchChecklist: vi.fn(),
  enableCountryProfessionalMarketplace: vi.fn(),
}));

vi.mock("../server/services/NotificationServiceV2", () => ({
  NotificationChannel: { EMAIL: "email" },
  notificationServiceV2: notifications,
}));
vi.mock("../server/compliance/CountryComplianceRepository", () => countryCompliance);

import { ownerRouter } from "../server/_core/ownerRouter";

const metrics = {
  activeUsers: 42,
  activeProviders: 8,
  totalRevenue: 28_000,
  dailyOrders: 6,
  dailyRevenue: 4_250,
  pendingPayments: 1_200,
  commissionRevenue: 2_800,
  risks: [],
};

const adminCaller = () =>
  ownerRouter.createCaller({ user: { id: 7, role: "admin", email: "admin@movefix.test" }, sessionFingerprint: "test-admin-session" } as never);
const customerCaller = () =>
  ownerRouter.createCaller({ user: { id: 8, role: "user" }, sessionFingerprint: "test-user-session" } as never);

describe("MoveOS ortak API sözleşmesi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getMoveOsDashboardMetrics.mockResolvedValue(metrics);
    db.hasValidAdminMfaGrant.mockResolvedValue(true);
    db.createAuthChallenge.mockResolvedValue(71);
    notifications.sendVerificationCode.mockResolvedValue({ deliveryStatus: "delivered" });
    countryCompliance.listCountryComplianceOverviews.mockResolvedValue([]);
  });

  it("MFA grant’i olmayan yönetici oturumunun MoveOS verisine erişimini reddeder", async () => {
    db.hasValidAdminMfaGrant.mockResolvedValue(false);
    await expect(adminCaller().dashboard()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.getMoveOsDashboardMetrics).not.toHaveBeenCalled();
  });

  it("dashboard’u sabit değerler yerine veri katmanındaki gerçek özetten üretir", async () => {
    await expect(adminCaller().dashboard()).resolves.toEqual(metrics);
    expect(db.getMoveOsDashboardMetrics).toHaveBeenCalledOnce();
  });

  it("ülke uyum görünümünü MFA grant’i olmayan yönetici için fail-closed kapatır", async () => {
    db.hasValidAdminMfaGrant.mockResolvedValue(false);
    await expect(adminCaller().countryCompliance()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(countryCompliance.listCountryComplianceOverviews).not.toHaveBeenCalled();
  });

  it("paket durum geçişini yönetici kimliğiyle insan incelemesine bağlar", async () => {
    await expect(adminCaller().transitionCountryCompliancePackage({ packageId: 14, status: "approved" })).resolves.toBeUndefined();
    expect(countryCompliance.transitionCountryCompliancePackage).toHaveBeenCalledWith({ packageId: 14, status: "approved", reviewerUserId: 7 });
  });

  it("eksik ülke açma kapısını profesyonel pazaryerini açmadan reddeder", async () => {
    countryCompliance.enableCountryProfessionalMarketplace.mockRejectedValue(new Error("COUNTRY_PROFESSIONAL_MARKETPLACE_BLOCKED"));
    await expect(adminCaller().enableCountryProfessionalMarketplace({ jurisdictionId: 4 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("yönetici olmayan ortak oturumun yönetim verisine erişimini reddeder", async () => {
    await expect(customerCaller().dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getMoveOsDashboardMetrics).not.toHaveBeenCalled();
  });

  it("kategori listesindeki komisyonu merkezi yüzde 10 politikasından ekler", async () => {
    db.listMoveOsCategories.mockResolvedValue([{ id: 3, name: "Elektrik", slug: "elektrik", isActive: true }]);
    await expect(adminCaller().categories()).resolves.toEqual([
      { id: 3, name: "Elektrik", slug: "elektrik", isActive: true, commissionRateBps: 1_000 },
    ]);
  });

  it("settlement policy listesini MFA grant’i olmadan fail-closed kapatır", async () => {
    db.hasValidAdminMfaGrant.mockResolvedValue(false);

    await expect(adminCaller().settlementPolicies({ limit: 20, offset: 0 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.listSettlementPoliciesForAdmin).not.toHaveBeenCalled();
  });

  it("yeni settlement policy sürümünü admin kimliği, komisyon ve ileri tarih ile veri katmanına bağlar", async () => {
    const effectiveFrom = new Date("2026-09-01T00:00:00.000Z");
    db.createSettlementPolicyForAdmin.mockResolvedValue({ id: 21, version: "tr-standard-v2" });

    await expect(
      adminCaller().createSettlementPolicy({
        countryCode: "TR",
        categoryId: null,
        gatewayProvider: "any",
        contractType: "standard",
        precedence: 0,
        version: "tr-standard-v2",
        commissionRateBps: 1_250,
        completionReviewHours: 48,
        cancellationPolicy: {
          version: "tr-cancel-v2",
          customerCancellation: "review_required",
          providerCancellation: "review_required",
          forceMajeure: "escalate",
          documentedExpenses: "review_required",
          partialSettlement: "review_required",
        },
        status: "draft",
        effectiveFrom,
      }),
    ).resolves.toEqual({ id: 21, version: "tr-standard-v2" });

    expect(db.createSettlementPolicyForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ createdByUserId: 7, commissionRateBps: 1_250, effectiveFrom }),
    );
  });

  it("iptal çözümünü yalnız MFA grant’li yöneticinin kimliğiyle insan incelemesine bağlar", async () => {
    db.reviewJobCancellationForAdmin.mockResolvedValue({ requestId: 91, status: "under_review" });

    await expect(
      adminCaller().reviewCancellationCase({
        requestId: 91,
        settlementOutcome: "partial_refund",
        refundAmount: 450,
        resolutionNote: "Kanıt ve ödeme hareketleri insan incelemesinde değerlendirildi.",
      }),
    ).resolves.toEqual({ requestId: 91, status: "under_review" });
    expect(db.reviewJobCancellationForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 91, reviewerUserId: 7, settlementOutcome: "partial_refund", refundAmount: 450 }),
    );
  });

  it("kısmi settlement için sıfır veya kesirli iade tutarını veri katmanına erişmeden reddeder", async () => {
    await expect(
      adminCaller().reviewCancellationCase({
        requestId: 91,
        settlementOutcome: "partial_refund",
        refundAmount: 0,
        resolutionNote: "Kanıt ve ödeme hareketleri insan incelemesinde değerlendirildi.",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      adminCaller().reviewCancellationCase({
        requestId: 91,
        settlementOutcome: "partial_refund",
        refundAmount: 12.5,
        resolutionNote: "Kanıt ve ödeme hareketleri insan incelemesinde değerlendirildi.",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.reviewJobCancellationForAdmin).not.toHaveBeenCalled();
  });

  it("change order denetim listesini MFA grant’i olmadan fail-closed kapatır", async () => {
    db.hasValidAdminMfaGrant.mockResolvedValue(false);

    await expect(adminCaller().changeOrders({ limit: 20, offset: 0 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.listJobChangeOrdersForAdmin).not.toHaveBeenCalled();
  });

  it("change order denetimini yalnız gerçek yönetici veri katmanından ve salt-okunur filtreyle üretir", async () => {
    db.listJobChangeOrdersForAdmin.mockResolvedValue([{ id: 41, requestId: 91, status: "requested" }]);

    await expect(adminCaller().changeOrders({ limit: 20, offset: 0, status: "requested" })).resolves.toEqual([
      { id: 41, requestId: 91, status: "requested" },
    ]);
    expect(db.listJobChangeOrdersForAdmin).toHaveBeenCalledWith({ limit: 20, offset: 0, status: "requested" });
  });

  it("Türkçe kategori adından deterministik slug üretir ve gerçek yaratma yardımcısına aktarır", async () => {
    db.createMoveOsCategory.mockResolvedValue({ id: 9, name: "Çatı Üstü", slug: "cati-ustu", isActive: 1 });
    await expect(adminCaller().createCategory({ name: "Çatı Üstü", pricingType: "fixed" })).resolves.toMatchObject({
      id: 9,
      slug: "cati-ustu",
      commissionRateBps: 1_000,
    });
    expect(db.createMoveOsCategory).toHaveBeenCalledWith(expect.objectContaining({ name: "Çatı Üstü", slug: "cati-ustu" }));
  });

  it("etkili MoveOS AI komutunu onaylı yürütücü olmadan veri değiştirmeden yanıtlar", async () => {
    await expect(adminCaller().aiCommand({ command: "Yeni kategori ekle: Bahçe" })).resolves.toMatchObject({
      action: "confirmation_required",
      executed: false,
    });
    expect(db.createMoveOsCategory).not.toHaveBeenCalled();
  });

  it("tanımlı şirket banka hesabı olmadan platform para çekme girişimini fail-closed reddeder", async () => {
    await expect(adminCaller().withdrawFunds({ amount: 1_000, bankAccountId: "TR000000000000000000000000" })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  it("ayrı owner parolası ile yönetici oturumu üretmez", async () => {
    await expect(adminCaller().login({ email: "owner@movefix.com", password: "password123" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("MFA kodu teslim edilmezse yönetici grant’i üretmeden fail-closed davranır", async () => {
    notifications.sendVerificationCode.mockResolvedValue({ deliveryStatus: "failed" });

    await expect(adminCaller().requestMfa()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.createAdminMfaGrant).not.toHaveBeenCalled();
  });

  it("yakın zamanda gönderilmiş geçerli MFA kodunu tekrar e-posta göndermeden sınırlar", async () => {
    db.getLatestActiveAuthChallenge.mockResolvedValue({
      id: 70,
      createdAt: new Date(Date.now() - 30_000),
    });

    await expect(adminCaller().requestMfa()).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(db.createAuthChallenge).not.toHaveBeenCalled();
    expect(notifications.sendVerificationCode).not.toHaveBeenCalled();
  });

  it("geçersiz MFA kodunda yalnız deneme sayısını artırır ve grant vermez", async () => {
    db.getLatestActiveAuthChallenge.mockResolvedValue({
      id: 71,
      codeHash: createHmac("sha256", "moveos-mfa-test-secret").update("7:admin_mfa:123456").digest("hex"),
      attempts: 0,
      maxAttempts: 5,
    });

    await expect(adminCaller().verifyMfa({ code: "654321" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.incrementAuthChallengeAttempts).toHaveBeenCalledWith(71);
    expect(db.markAuthChallengeUsed).not.toHaveBeenCalled();
    expect(db.createAdminMfaGrant).not.toHaveBeenCalled();
  });

  it("doğru MFA kodunu tek kullanımlık challenge ile session-bound grant’e dönüştürür", async () => {
    db.getLatestActiveAuthChallenge.mockResolvedValue({
      id: 72,
      codeHash: createHmac("sha256", "moveos-mfa-test-secret").update("7:admin_mfa:123456").digest("hex"),
      attempts: 0,
      maxAttempts: 5,
    });

    await expect(adminCaller().verifyMfa({ code: "123456" })).resolves.toEqual({ success: true, expiresInSeconds: 1800 });
    expect(db.markAuthChallengeUsed).toHaveBeenCalledWith(72);
    expect(db.createAdminMfaGrant).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      sessionFingerprint: "test-admin-session",
      challengeId: 72,
    }));
  });
});
