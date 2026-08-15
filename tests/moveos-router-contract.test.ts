import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  getMoveOsDashboardMetrics: vi.fn(),
  listMoveOsCategories: vi.fn(),
  createMoveOsCategory: vi.fn(),
  archiveMoveOsCategory: vi.fn(),
  updateMoveOsCategory: vi.fn(),
  getMoveOsService: vi.fn(),
  getMoveOsUser: vi.fn(),
  hasValidAdminMfaGrant: vi.fn(),
  listMoveOsServices: vi.fn(),
  listMoveOsUsers: vi.fn(),
  updateMoveOsUser: vi.fn(),
}));

vi.mock("../server/db", () => db);

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
  ownerRouter.createCaller({ user: { id: 7, role: "admin" }, sessionFingerprint: "test-admin-session" } as never);
const customerCaller = () =>
  ownerRouter.createCaller({ user: { id: 8, role: "user" }, sessionFingerprint: "test-user-session" } as never);

describe("MoveOS ortak API sözleşmesi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getMoveOsDashboardMetrics.mockResolvedValue(metrics);
    db.hasValidAdminMfaGrant.mockResolvedValue(true);
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
});
