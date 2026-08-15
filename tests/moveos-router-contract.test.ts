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
}));

vi.mock("../server/db", () => db);
vi.mock("../server/_core/env", () => ({ ENV: { cookieSecret: "moveos-mfa-test-secret" } }));

const notifications = vi.hoisted(() => ({
  sendVerificationCode: vi.fn(),
}));

vi.mock("../server/services/NotificationServiceV2", () => ({
  NotificationChannel: { EMAIL: "email" },
  notificationServiceV2: notifications,
}));

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
