import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

const db = vi.hoisted(() => ({
  getMoveOsDashboardMetrics: vi.fn(),
  getOperationsControlSnapshot: vi.fn(),
  listMoveOsCategories: vi.fn(),
  createMoveOsCategory: vi.fn(),
  archiveMoveOsCategory: vi.fn(),
  updateMoveOsCategory: vi.fn(),
  getMoveOsService: vi.fn(),
  getMoveOsUser: vi.fn(),
  hasValidAdminMfaGrant: vi.fn(),
  hasActiveSuperAdminRole: vi.fn(),
  listActiveSuperAdmins: vi.fn(),
  grantSuperAdminRole: vi.fn(),
  revokeSuperAdminRole: vi.fn(),
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
  listFeatureFlags: vi.fn(),
  setFeatureFlag: vi.fn(),
  listPrivacyRightsRequestsForReview: vi.fn(),
  reviewPrivacyRightsRequest: vi.fn(),
  listPrivacyLegalHolds: vi.fn(),
  createPrivacyLegalHold: vi.fn(),
  releasePrivacyLegalHold: vi.fn(),
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
    db.hasActiveSuperAdminRole.mockResolvedValue(false);
    db.createAuthChallenge.mockResolvedValue(71);
    notifications.sendVerificationCode.mockResolvedValue({ deliveryStatus: "delivered" });
    countryCompliance.listCountryComplianceOverviews.mockResolvedValue([]);
  });

  it("MFA grant’i olmayan yönetici oturumunun MoveOS verisine erişimini reddeder", async () => {
    db.hasValidAdminMfaGrant.mockResolvedValue(false);
    await expect(adminCaller().dashboard()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.getMoveOsDashboardMetrics).not.toHaveBeenCalled();
  });

  it("MFA grant’i olmayan yönetici için feature flag değiştirmeyi fail-closed reddeder", async () => {
    db.hasValidAdminMfaGrant.mockResolvedValue(false);

    await expect(
      adminCaller().setFeatureFlag({
        key: "moveai.experimental-routing",
        enabled: true,
        rolloutPct: 20,
        reason: "Kademeli MoveAI yönlendirme doğrulaması",
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.setFeatureFlag).not.toHaveBeenCalled();
  });

  it("MFA doğrulanmış sıradan yöneticinin Super Admin yönetim yüzeyine erişimini reddeder", async () => {
    await expect(adminCaller().superAdmins()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.listActiveSuperAdmins).not.toHaveBeenCalled();
  });

  it("Operations Control özetini MFA doğrulanmış Super Admin scope olmadan fail-closed reddeder", async () => {
    await expect(adminCaller().operationsControl()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getOperationsControlSnapshot).not.toHaveBeenCalled();
  });

  it("privacy rights inceleme yüzeyini Super Admin + MFA olmadan fail-closed reddeder", async () => {
    await expect(adminCaller().privacyRights()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      adminCaller().reviewPrivacyRight({ requestId: 9, decision: "approve", reviewNote: "Yasal inceleme tamamlandı" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.listPrivacyRightsRequestsForReview).not.toHaveBeenCalled();
    expect(db.reviewPrivacyRightsRequest).not.toHaveBeenCalled();
  });

  it("privacy rights incelemesini yalnız MFA doğrulanmış Super Admin adına kaydeder", async () => {
    db.hasActiveSuperAdminRole.mockResolvedValue(true);
    db.listPrivacyRightsRequestsForReview.mockResolvedValue([]);
    db.reviewPrivacyRightsRequest.mockResolvedValue({ id: 9, status: "approved" });

    await expect(adminCaller().privacyRights({ limit: 25 })).resolves.toEqual([]);
    await expect(
      adminCaller().reviewPrivacyRight({ requestId: 9, decision: "approve", reviewNote: "Yasal inceleme tamamlandı" }),
    ).resolves.toEqual({ id: 9, status: "approved" });
    expect(db.listPrivacyRightsRequestsForReview).toHaveBeenCalledWith(25);
    expect(db.reviewPrivacyRightsRequest).toHaveBeenCalledWith({
      requestId: 9,
      decision: "approve",
      reviewNote: "Yasal inceleme tamamlandı",
      reviewerUserId: 7,
    });
  });

  it("legal hold yüzeyini Super Admin + MFA olmadan fail-closed reddeder", async () => {
    await expect(adminCaller().privacyLegalHolds()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      adminCaller().createPrivacyLegalHold({ userId: 19, reason: "Açık yasal uyuşmazlık nedeniyle koruma" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(adminCaller().releasePrivacyLegalHold({ holdId: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.listPrivacyLegalHolds).not.toHaveBeenCalled();
    expect(db.createPrivacyLegalHold).not.toHaveBeenCalled();
    expect(db.releasePrivacyLegalHold).not.toHaveBeenCalled();
  });

  it("legal hold oluşturma ve serbest bırakmayı yalnız oturumdaki Super Admin’e bağlar", async () => {
    db.hasActiveSuperAdminRole.mockResolvedValue(true);
    db.listPrivacyLegalHolds.mockResolvedValue([]);
    db.createPrivacyLegalHold.mockResolvedValue({ id: 4, status: "active" });
    db.releasePrivacyLegalHold.mockResolvedValue({ id: 4, status: "released", idempotent: false });

    await expect(adminCaller().privacyLegalHolds({ limit: 15 })).resolves.toEqual([]);
    await expect(
      adminCaller().createPrivacyLegalHold({ userId: 19, reason: "Açık yasal uyuşmazlık nedeniyle koruma" }),
    ).resolves.toEqual({ id: 4, status: "active" });
    await expect(adminCaller().releasePrivacyLegalHold({ holdId: 4 }))
      .resolves.toEqual({ id: 4, status: "released", idempotent: false });
    expect(db.listPrivacyLegalHolds).toHaveBeenCalledWith(15);
    expect(db.createPrivacyLegalHold).toHaveBeenCalledWith({
      userId: 19,
      reason: "Açık yasal uyuşmazlık nedeniyle koruma",
      createdByUserId: 7,
    });
    expect(db.releasePrivacyLegalHold).toHaveBeenCalledWith({ holdId: 4, releasedByUserId: 7 });
  });

  it("Operations Control özetini yalnız MFA doğrulanmış Super Admin için sınırlandırılmış parametrelerle üretir", async () => {
    db.hasActiveSuperAdminRole.mockResolvedValue(true);
    const snapshot = {
      generatedAt: new Date("2026-08-16T00:00:00.000Z"),
      health: { status: "attention" },
      queues: {},
      events: [],
    };
    db.getOperationsControlSnapshot.mockResolvedValue(snapshot);

    await expect(adminCaller().operationsControl({ eventLimit: 12, caseLimit: 8 })).resolves.toEqual(snapshot);
    expect(db.getOperationsControlSnapshot).toHaveBeenCalledWith({ eventLimit: 12, caseLimit: 8 });
  });

  it("Operations Control için sıfır, kesirli veya üst sınırı aşan vaka limitlerini veri katmanına erişmeden reddeder", async () => {
    db.hasActiveSuperAdminRole.mockResolvedValue(true);

    await expect(adminCaller().operationsControl({ eventLimit: 0, caseLimit: 8 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(adminCaller().operationsControl({ eventLimit: 12.5, caseLimit: 8 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(adminCaller().operationsControl({ eventLimit: 12, caseLimit: 101 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.getOperationsControlSnapshot).not.toHaveBeenCalled();
  });

  it("Super Admin yüzeyinde MFA grant’i yoksa aktif scope olsa dahi fail-closed reddeder", async () => {
    db.hasValidAdminMfaGrant.mockResolvedValue(false);
    db.hasActiveSuperAdminRole.mockResolvedValue(true);

    await expect(adminCaller().superAdmins()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.hasActiveSuperAdminRole).not.toHaveBeenCalled();
  });

  it("MFA doğrulanmış Super Admin atama çağrısında hedef kimliği yalnız doğrulanmış oturumdan türetir", async () => {
    db.hasActiveSuperAdminRole.mockResolvedValue(true);
    db.grantSuperAdminRole.mockResolvedValue({ userId: 19, duplicated: false });

    await expect(adminCaller().grantSuperAdmin({ userId: 19 })).resolves.toEqual({ userId: 19, duplicated: false });
    expect(db.grantSuperAdminRole).toHaveBeenCalledWith({ actorUserId: 7, userId: 19 });
  });

  it("MFA doğrulanmış yönetici güncellemesini oturumdaki yönetici kimliğiyle veri katmanına bağlar", async () => {
    db.setFeatureFlag.mockResolvedValue({ id: 3, flagKey: "moveai.experimental-routing", version: 1 });

    await expect(
      adminCaller().setFeatureFlag({
        key: "moveai.experimental-routing",
        enabled: true,
        rolloutPct: 20,
        reason: "Kademeli MoveAI yönlendirme doğrulaması",
      }),
    ).resolves.toMatchObject({ id: 3, flagKey: "moveai.experimental-routing" });
    expect(db.setFeatureFlag).toHaveBeenCalledWith(expect.objectContaining({
      adminUserId: 7,
      key: "moveai.experimental-routing",
      enabled: true,
      rolloutPct: 20,
    }));
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
