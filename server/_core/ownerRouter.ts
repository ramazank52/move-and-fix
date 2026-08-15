/**
 * MoveOS yönetim API'si.
 *
 * Bu router mobil uygulamayla aynı oturum, API ve veri tabanını kullanır.
 * Ayrı owner parolası, token üretimi veya örnek yönetim verisi bulunmaz.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  archiveMoveOsCategory,
  createMoveOsCategory,
  getMoveOsDashboardMetrics,
  getMoveOsService,
  getMoveOsUser,
  listMoveOsCategories,
  listMoveOsServices,
  listMoveOsUsers,
  updateMoveOsCategory,
  updateMoveOsUser,
} from "../db";
import { STANDARD_COMMISSION_RATE_BPS } from "../payments/policy";
import { adminProcedure, publicProcedure, router } from "./trpc";

const listInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const categoryInput = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  icon: z.string().trim().max(10).nullable().optional(),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  pricingType: z.enum(["fixed", "km_based", "hourly"]).default("fixed"),
  kmRate: z.number().int().min(0).max(1_000_000).nullable().optional(),
  basePrice: z.number().int().min(0).max(10_000_000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

function createSlug(name: string) {
  const transliterated = name
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return transliterated.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function adminAuthRequired() {
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "MoveOS yalnız ortak platform oturumuyla açılır. Ayrı owner parolası ve OTP akışı devre dışıdır.",
  });
}

export const ownerRouter = router({
  /** Legacy password endpoints are intentionally fail-closed. */
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(adminAuthRequired),

  verify2FA: publicProcedure
    .input(z.object({ email: z.string().email(), otpCode: z.string().length(6) }))
    .mutation(adminAuthRequired),

  logout: adminProcedure.mutation(async () => ({ success: true })),

  dashboard: adminProcedure.query(async () => getMoveOsDashboardMetrics()),

  users: adminProcedure
    .input(
      listInput.extend({
        role: z.enum(["admin", "customer", "provider"]).optional(),
        search: z.string().trim().max(100).optional(),
      }),
    )
    .query(async ({ input }) => listMoveOsUsers(input)),

  getUser: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const user = await getMoveOsUser(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Kullanıcı bulunamadı" });
      return user;
    }),

  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        name: z.string().trim().min(2).max(200).optional(),
        role: z.enum(["user", "admin"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId && input.role === "user") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Yönetici kendi yönetici yetkisini kaldıramaz" });
      }
      const updated = await updateMoveOsUser(input);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Kullanıcı bulunamadı" });
      return updated;
    }),

  categories: adminProcedure.query(async () => {
    const categories = await listMoveOsCategories();
    return categories.map((category) => ({
      ...category,
      commissionRateBps: STANDARD_COMMISSION_RATE_BPS,
    }));
  }),

  createCategory: adminProcedure.input(categoryInput).mutation(async ({ input }) => {
    const slug = input.slug ?? createSlug(input.name);
    if (!slug) throw new TRPCError({ code: "BAD_REQUEST", message: "Geçerli kategori adı gerekli" });
    const category = await createMoveOsCategory({ ...input, slug });
    if (!category) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Kategori oluşturulamadı" });
    return { ...category, commissionRateBps: STANDARD_COMMISSION_RATE_BPS };
  }),

  updateCategory: adminProcedure
    .input(categoryInput.partial().extend({ categoryId: z.number().int().positive(), isActive: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const { categoryId, isActive, ...changes } = input;
      if (Object.keys(changes).length === 0 && isActive === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Güncellenecek kategori alanı gerekli" });
      }
      const slug = changes.slug ?? (changes.name ? createSlug(changes.name) : undefined);
      const category = await updateMoveOsCategory({
        categoryId,
        ...changes,
        ...(slug ? { slug } : {}),
        ...(isActive === undefined ? {} : { isActive: isActive ? 1 : 0 }),
      });
      if (!category) throw new TRPCError({ code: "NOT_FOUND", message: "Kategori bulunamadı" });
      return { ...category, commissionRateBps: STANDARD_COMMISSION_RATE_BPS };
    }),

  archiveCategory: adminProcedure
    .input(z.object({ categoryId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const category = await archiveMoveOsCategory(input.categoryId);
      if (!category) throw new TRPCError({ code: "NOT_FOUND", message: "Kategori bulunamadı" });
      return { ...category, commissionRateBps: STANDARD_COMMISSION_RATE_BPS };
    }),

  aiCommand: adminProcedure
    .input(z.object({ command: z.string().trim().min(3).max(2_000) }))
    .mutation(async ({ input }) => ({
      command: input.command,
      action: "confirmation_required" as const,
      executed: false,
      response:
        "Yönetim komutu alındı. Etkili işlemler için MoveOS onaylı komut yürütücüsü henüz yapılandırılmadığından hiçbir veri değiştirilmedi.",
    })),

  wallet: adminProcedure.query(async () => {
    const metrics = await getMoveOsDashboardMetrics();
    return {
      balance: metrics.commissionRevenue,
      totalEarnings: metrics.commissionRevenue,
      totalWithdrawals: 0,
      pendingWithdrawals: 0,
      lastWithdrawal: null,
      bankAccounts: [],
      currency: "TRY" as const,
      note: "Platform banka hesabı ve şirket para çekme modeli henüz veri tabanında tanımlı değildir; yalnız gerçekleşmiş komisyon toplamı gösterilir.",
    };
  }),

  withdrawFunds: adminProcedure
    .input(z.object({ amount: z.number().int().positive(), bankAccountId: z.string().trim().min(1).max(96) }))
    .mutation(async () => {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Şirket banka hesabı ve onaylı ödeme süreci modellenmeden platform para çekme işlemi başlatılamaz.",
      });
    }),

  analytics: adminProcedure
    .input(z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).optional())
    .query(async ({ input }) => {
      if (input?.from && input.to && input.from > input.to) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Başlangıç tarihi bitiş tarihinden sonra olamaz" });
      }
      const metrics = await getMoveOsDashboardMetrics();
      return {
        period: input?.from && input.to ? { from: input.from, to: input.to } : null,
        totalOrders: metrics.dailyOrders,
        totalRevenue: metrics.totalRevenue,
        averageOrderValue: 0,
        customerSatisfaction: null,
        topCategories: [],
        topProviders: [],
        note: "Ayrıntılı dönemsel analitik, sorgu parametreleri için indeksli raporlama modeli eklendiğinde sunulacaktır; bu yanıt gerçek özet veriyi içerir.",
      };
    }),

  services: adminProcedure.input(listInput).query(async ({ input }) => listMoveOsServices(input)),

  getService: adminProcedure
    .input(z.object({ serviceId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const service = await getMoveOsService(input.serviceId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Hizmet talebi bulunamadı" });
      return service;
    }),
});
