/**
 * MoveOS yönetim API'si.
 *
 * Bu router mobil uygulamayla aynı oturum, API ve veri tabanını kullanır.
 * Ayrı owner parolası, token üretimi veya örnek yönetim verisi bulunmaz.
 */

import { TRPCError } from "@trpc/server";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import {
  archiveMoveOsCategory,
  createAdminMfaGrant,
  createAuthChallenge,
  createMoveOsCategory,
  getLatestActiveAuthChallenge,
  getOperationsControlSnapshot,
  getMoveOsDashboardMetrics,
  getMoveOsService,
  getMoveOsUser,
  createSettlementPolicyForAdmin,
  retireSettlementPolicyForAdmin,
  listSettlementPoliciesForAdmin,
  listJobChangeOrdersForAdmin,
  listJobCancellationCasesForAdmin,
  listRiskFlagsForAdmin,
  reviewJobCancellationForAdmin,
  reviewRiskFlag,
  listFeatureFlags,
  setFeatureFlag,
  listProviderCapabilityStatuses,
  listMoveOsCategories,
  listMoveOsServices,
  listMoveOsUsers,
  listPrivacyLegalHolds,
  listPrivacyRightsRequestsForReview,
  listActiveSuperAdmins,
  grantSuperAdminRole,
  revokeSuperAdminRole,
  incrementAuthChallengeAttempts,
  markAuthChallengeUsed,
  reviewProviderCapabilityStatus,
  reviewPrivacyRightsRequest,
  createPrivacyLegalHold,
  releasePrivacyLegalHold,
  updateMoveOsCategory,
  updateMoveOsUser,
  createTaxRule,
  activateTurkeyTaxRule,
  listInsuranceClaimsForReview,
  reviewInsuranceClaim,
  listSupportTicketsForReview,
  reviewSupportTicket,
  listMoveOsReviewQueue,
} from "../db";
import {
  createCountryCompliancePackage,
  createCountryJurisdiction,
  enableCountryProfessionalMarketplace,
  listCountryComplianceOverviews,
  registerOfficialComplianceSource,
  saveCountryLaunchChecklist,
  transitionCountryCompliancePackage,
} from "../compliance/CountryComplianceRepository";
import { ENV } from "./env";
import { STANDARD_COMMISSION_RATE_BPS } from "../payments/policy";
import { adminMfaProcedure, adminProcedure, publicProcedure, router, superAdminMfaProcedure } from "./trpc";
import { NotificationChannel, notificationServiceV2 } from "../services/NotificationServiceV2";

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

const mfaCodeSchema = z.string().regex(/^\d{6}$/, "6 haneli güvenlik kodunu girin");
const ADMIN_MFA_REQUEST_COOLDOWN_MS = 60_000;
const countryLaunchChecklistInput = z.object({
  service_compliance: z.boolean(),
  credential_rules: z.boolean(),
  official_sources: z.boolean(),
  platform_law: z.boolean(),
  payments: z.boolean(),
  payment_provider_license: z.boolean(),
  operational_payment_provider: z.boolean(),
  tax: z.boolean(),
  privacy: z.boolean(),
  worker_classification: z.boolean(),
  insurance: z.boolean(),
  consumer_rules: z.boolean(),
  ai_rules: z.boolean(),
  safety: z.boolean(),
  support: z.boolean(),
  store_compliance: z.boolean(),
  legal_sign_off: z.boolean(),
  privacy_sign_off: z.boolean(),
  payment_sign_off: z.boolean(),
  security_sign_off: z.boolean(),
  production_tests: z.boolean(),
}).strict();

const cancellationPolicyInput = z
  .object({
    version: z.string().trim().min(1).max(64),
    customerCancellation: z.enum(["review_required", "no_payment_only"]),
    providerCancellation: z.enum(["review_required", "no_payment_only"]),
    forceMajeure: z.enum(["review_required", "escalate"]),
    documentedExpenses: z.enum(["review_required", "not_automatic"]),
    partialSettlement: z.enum(["review_required", "not_automatic"]),
  })
  .strict();

const settlementPolicyInput = z
  .object({
    countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/),
    categoryId: z.number().int().positive().nullable().optional(),
    gatewayProvider: z.enum(["any", "iyzico", "stripe"]),
    contractType: z.string().trim().regex(/^[a-zA-Z0-9_-]{1,48}$/),
    precedence: z.number().int().min(-10_000).max(10_000).default(0),
    version: z.string().trim().min(1).max(64),
    commissionRateBps: z.number().int().min(0).max(10_000),
    completionReviewHours: z.number().int().min(1).max(168),
    cancellationPolicy: cancellationPolicyInput,
    status: z.enum(["draft", "active", "suspended"]).default("draft"),
    effectiveFrom: z.coerce.date(),
    effectiveTo: z.coerce.date().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.effectiveTo && value.effectiveTo <= value.effectiveFrom) {
      ctx.addIssue({ code: "custom", path: ["effectiveTo"], message: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır" });
    }
  });

function hashAdminMfaCode(userId: number, code: string): string {
  if (!ENV.cookieSecret) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "MFA güvenlik yapılandırması eksik" });
  }
  return createHmac("sha256", ENV.cookieSecret).update(`${userId}:admin_mfa:${code}`).digest("hex");
}

function requiresMfaSession(ctx: { sessionFingerprint?: string | null; user?: { email?: string | null } | null }) {
  if (!ctx.sessionFingerprint || !ctx.user?.email) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "MoveOS MFA için e-posta doğrulanmış ortak platform oturumu gerekli",
    });
  }
}

export const ownerRouter = router({
  /** Legacy password endpoints are intentionally fail-closed. */
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(adminAuthRequired),

  verify2FA: publicProcedure
    .input(z.object({ email: z.string().email(), otpCode: z.string().length(6) }))
    .mutation(adminAuthRequired),

  requestMfa: adminProcedure.mutation(async ({ ctx }) => {
    requiresMfaSession(ctx);
    const activeChallenge = await getLatestActiveAuthChallenge({ userId: ctx.user.id, purpose: "admin_mfa" });
    if (activeChallenge?.createdAt && Date.now() - new Date(activeChallenge.createdAt).getTime() < ADMIN_MFA_REQUEST_COOLDOWN_MS) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "MFA kodu yakın zamanda gönderildi. Lütfen tekrar istemeden önce kısa süre bekleyin.",
      });
    }
    const code = randomInt(100_000, 1_000_000).toString();
    await createAuthChallenge({
      userId: ctx.user.id,
      purpose: "admin_mfa",
      channel: "email",
      destination: ctx.user.email!,
      codeHash: hashAdminMfaCode(ctx.user.id, code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    const delivery = await notificationServiceV2.sendVerificationCode({
      channel: NotificationChannel.EMAIL,
      destination: ctx.user.email!,
      code,
      purpose: "admin_mfa",
    });
    if (delivery.deliveryStatus !== "delivered") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "MFA kodu gönderilemedi. E-posta sağlayıcısı yapılandırılmalıdır.",
      });
    }
    return { success: true, expiresInSeconds: 600 };
  }),

  verifyMfa: adminProcedure.input(z.object({ code: mfaCodeSchema })).mutation(async ({ ctx, input }) => {
    requiresMfaSession(ctx);
    const challenge = await getLatestActiveAuthChallenge({ userId: ctx.user.id, purpose: "admin_mfa" });
    if (!challenge) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Geçerli bir MFA kodu isteyin" });
    }
    const expected = Buffer.from(challenge.codeHash, "hex");
    const received = Buffer.from(hashAdminMfaCode(ctx.user.id, input.code), "hex");
    const matches = expected.length === received.length && timingSafeEqual(expected, received);
    if (!matches) {
      await incrementAuthChallengeAttempts(challenge.id);
      throw new TRPCError({ code: "UNAUTHORIZED", message: "MFA kodu geçersiz veya süresi dolmuş" });
    }
    await markAuthChallengeUsed(challenge.id);
    await createAdminMfaGrant({
      id: randomUUID(),
      userId: ctx.user.id,
      sessionFingerprint: ctx.sessionFingerprint!,
      challengeId: challenge.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    return { success: true, expiresInSeconds: 1800 };
  }),

  logout: adminProcedure.mutation(async () => ({ success: true })),

  dashboard: adminMfaProcedure.query(async () => getMoveOsDashboardMetrics()),

  operationsControl: superAdminMfaProcedure
    .input(z.object({ eventLimit: z.number().int().min(1).max(100).default(25), caseLimit: z.number().int().min(1).max(100).default(25) }).default({ eventLimit: 25, caseLimit: 25 }))
    .query(async ({ input }) => getOperationsControlSnapshot(input)),

  privacyRights: superAdminMfaProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }).default({ limit: 100 }))
    .query(({ input }) => listPrivacyRightsRequestsForReview(input.limit)),

  reviewPrivacyRight: superAdminMfaProcedure
    .input(z.object({
      requestId: z.number().int().positive(),
      decision: z.enum(["start_review", "approve", "reject"]),
      reviewNote: z.string().trim().min(3).max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Oturum gerekli" });
        return await reviewPrivacyRightsRequest({ ...input, reviewerUserId: ctx.user.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "PRIVACY_REQUEST_REVIEW_FAILED";
        throw new TRPCError({ code: message === "PRIVACY_REQUEST_NOT_FOUND" ? "NOT_FOUND" : "PRECONDITION_FAILED", message });
      }
    }),

  privacyLegalHolds: superAdminMfaProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }).default({ limit: 100 }))
    .query(({ input }) => listPrivacyLegalHolds(input.limit)),

  createPrivacyLegalHold: superAdminMfaProcedure
    .input(z.object({ userId: z.number().int().positive(), reason: z.string().trim().min(5).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Oturum gerekli" });
      try {
        return await createPrivacyLegalHold({ ...input, createdByUserId: ctx.user.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "PRIVACY_LEGAL_HOLD_CREATE_FAILED";
        throw new TRPCError({ code: message === "PRIVACY_HOLD_USER_NOT_FOUND" ? "NOT_FOUND" : "PRECONDITION_FAILED", message });
      }
    }),

  releasePrivacyLegalHold: superAdminMfaProcedure
    .input(z.object({ holdId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Oturum gerekli" });
      try {
        return await releasePrivacyLegalHold({ ...input, releasedByUserId: ctx.user.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "PRIVACY_LEGAL_HOLD_RELEASE_FAILED";
        throw new TRPCError({ code: message === "PRIVACY_LEGAL_HOLD_NOT_FOUND" ? "NOT_FOUND" : "PRECONDITION_FAILED", message });
      }
    }),

  supportTickets: adminMfaProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).default({ limit: 50 }))
    .query(({ input }) => listSupportTicketsForReview(input.limit)),

  reviewSupportTicket: adminMfaProcedure
    .input(z.object({
      ticketId: z.number().int().positive(),
      status: z.enum(["in_review", "resolved", "closed"]),
      resolutionNote: z.string().trim().min(3).max(2_000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await reviewSupportTicket({ ...input, reviewerUserId: ctx.user!.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "SUPPORT_TICKET_REVIEW_FAILED";
        throw new TRPCError({ code: message === "SUPPORT_TICKET_NOT_FOUND" ? "NOT_FOUND" : "PRECONDITION_FAILED", message });
      }
    }),

  insuranceClaims: superAdminMfaProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).default({ limit: 50 }))
    .query(({ input }) => listInsuranceClaimsForReview(input.limit)),

  reviewInsuranceClaim: superAdminMfaProcedure
    .input(z.object({
      claimId: z.number().int().positive(),
      status: z.enum(["under_review", "more_information_required", "accepted", "rejected"]),
      decisionNote: z.string().trim().min(3).max(2_000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await reviewInsuranceClaim({ ...input, reviewerUserId: ctx.user!.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "INSURANCE_CLAIM_REVIEW_FAILED";
        throw new TRPCError({ code: message === "INSURANCE_CLAIM_NOT_FOUND" ? "NOT_FOUND" : "PRECONDITION_FAILED", message });
      }
    }),

  operationalReviewQueue: superAdminMfaProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      sources: z.array(z.enum(["support", "insurance_claim"])).max(2).optional(),
    }).default({ limit: 50 }))
    .query(({ input }) => listMoveOsReviewQueue(input)),

  createTurkeyVatRule: superAdminMfaProcedure
    .input(z.object({
      categoryId: z.number().int().positive().optional(),
      version: z.string().trim().min(1).max(64),
      rateBasisPoints: z.number().int().min(0).max(10_000),
      effectiveFrom: z.coerce.date(),
      effectiveUntil: z.coerce.date().optional(),
    }).superRefine((value, context) => {
      if (value.effectiveUntil && value.effectiveUntil <= value.effectiveFrom) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["effectiveUntil"], message: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır" });
      }
    }))
    .mutation(async ({ ctx, input }) => createTaxRule({ ...input, countryCode: "TR", createdByUserId: ctx.user!.id })),

  activateTurkeyVatRule: superAdminMfaProcedure
    .input(z.object({ taxRuleId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => activateTurkeyTaxRule({ ...input, actorUserId: ctx.user!.id })),

  superAdmins: superAdminMfaProcedure.query(async () => listActiveSuperAdmins()),

  grantSuperAdmin: superAdminMfaProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await grantSuperAdminRole({ actorUserId: ctx.user!.id, userId: input.userId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "SUPER_ADMIN_GRANT_FAILED";
        if (message === "SUPER_ADMIN_TARGET_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Yönetici kullanıcı bulunamadı" });
        }
        if (message === "SUPER_ADMIN_TARGET_MUST_BE_ADMIN") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Super Admin atanacak kullanıcı önce yönetici rolüne sahip olmalıdır" });
        }
        throw error;
      }
    }),

  revokeSuperAdmin: superAdminMfaProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await revokeSuperAdminRole({ actorUserId: ctx.user!.id, userId: input.userId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "SUPER_ADMIN_REVOKE_FAILED";
        if (message === "SUPER_ADMIN_SELF_REVOKE_FORBIDDEN") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kendi Super Admin erişiminizi bu oturumda kaldıramazsınız" });
        }
        if (message === "SUPER_ADMIN_ROLE_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Aktif Super Admin ataması bulunamadı" });
        }
        throw error;
      }
    }),

  listProviderCapabilities: adminMfaProcedure
    .input(z.object({ providerId: z.number().int().positive() }))
    .query(async ({ input }) => listProviderCapabilityStatuses(input.providerId)),

  reviewProviderCapability: adminMfaProcedure
    .input(
      z.object({
        providerCapabilityStatusId: z.number().int().positive(),
        credentialId: z.number().int().positive().optional(),
        decision: z.enum(["verified", "limited_scope", "manual_review", "rejected", "suspended"]),
        rationale: z.string().trim().min(10).max(2_000),
        scopeNote: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => reviewProviderCapabilityStatus({ ...input, reviewerUserId: ctx.user!.id })),

  countryCompliance: adminMfaProcedure.query(async () => listCountryComplianceOverviews()),

  createCountryJurisdiction: adminMfaProcedure
    .input(z.object({ countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/), regionCode: z.string().trim().max(16).optional(), displayName: z.string().trim().min(2).max(120) }))
    .mutation(async ({ ctx, input }) => createCountryJurisdiction({ ...input, createdByUserId: ctx.user!.id })),

  createCountryCompliancePackage: adminMfaProcedure
    .input(z.object({ jurisdictionId: z.number().int().positive(), version: z.string().trim().min(1).max(64), summary: z.string().trim().max(4_000).optional() }))
    .mutation(async ({ ctx, input }) => createCountryCompliancePackage({ ...input, createdByUserId: ctx.user!.id })),

  transitionCountryCompliancePackage: adminMfaProcedure
    .input(z.object({ packageId: z.number().int().positive(), status: z.enum(["draft", "legal_review", "approved", "enabled", "blocked", "retired"]) }))
    .mutation(async ({ ctx, input }) => transitionCountryCompliancePackage({ ...input, reviewerUserId: ctx.user!.id })),

  registerCountryOfficialSource: adminMfaProcedure
    .input(z.object({ jurisdictionId: z.number().int().positive(), authorityName: z.string().trim().min(2).max(200), sourceUrl: z.string().url().max(2_000), sourceVersion: z.string().trim().min(1).max(120), status: z.enum(["draft", "verified", "superseded", "revoked"]) }))
    .mutation(async ({ ctx, input }) => registerOfficialComplianceSource({ ...input, reviewedByUserId: ctx.user!.id })),

  saveCountryLaunchGate: adminMfaProcedure
    .input(z.object({ jurisdictionId: z.number().int().positive(), packageId: z.number().int().positive().optional(), checklist: countryLaunchChecklistInput }))
    .mutation(async ({ ctx, input }) => saveCountryLaunchChecklist({ ...input, evaluatedByUserId: ctx.user!.id })),

  enableCountryProfessionalMarketplace: adminMfaProcedure
    .input(z.object({ jurisdictionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await enableCountryProfessionalMarketplace({ ...input, enabledByUserId: ctx.user!.id });
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === "COUNTRY_PROFESSIONAL_MARKETPLACE_BLOCKED" ||
            error.message === "COUNTRY_PAYMENT_PROVIDER_NOT_READY")
        ) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Ülke açma kapısı tamamlanmadan profesyonel pazaryeri etkinleştirilemez" });
        }
        throw error;
      }
    }),

  settlementPolicies: adminMfaProcedure
    .input(listInput.extend({ status: z.enum(["draft", "active", "retired", "suspended"]).optional() }))
    .query(async ({ input }) => listSettlementPoliciesForAdmin(input)),

  createSettlementPolicy: adminMfaProcedure
    .input(settlementPolicyInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createSettlementPolicyForAdmin({ ...input, createdByUserId: ctx.user!.id });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("SETTLEMENT_POLICY_")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Settlement policy alanları geçersiz" });
        }
        throw error;
      }
    }),

  retireSettlementPolicy: adminMfaProcedure
    .input(z.object({ policyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await retireSettlementPolicyForAdmin({ policyId: input.policyId, retiredByUserId: ctx.user!.id });
      } catch (error) {
        if (error instanceof Error && error.message === "SETTLEMENT_POLICY_NOT_RETIRABLE") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Policy bulunamadı veya zaten emekliye ayrıldı" });
        }
        throw error;
      }
    }),

  cancellationCases: adminMfaProcedure
    .input(listInput.extend({ status: z.enum(["requested", "under_review", "resolved", "withdrawn"]).optional() }))
    .query(async ({ input }) => listJobCancellationCasesForAdmin(input)),

  changeOrders: adminMfaProcedure
    .input(listInput.extend({ status: z.enum(["requested", "accepted", "rejected", "withdrawn", "expired"]).optional() }))
    .query(async ({ input }) => listJobChangeOrdersForAdmin(input)),

  reviewCancellationCase: adminMfaProcedure
    .input(
      z.object({
        requestId: z.number().int().positive(),
        settlementOutcome: z.enum(["refund", "partial_refund", "provider_payable", "no_payment"]),
        resolutionNote: z.string().trim().min(10).max(2_000),
        refundAmount: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await reviewJobCancellationForAdmin({ ...input, reviewerUserId: ctx.user!.id });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("CANCELLATION_")) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "İptal kaydı mevcut ödeme ve durum koşullarıyla çözümlenemiyor" });
        }
        throw error;
      }
    }),

  riskFlags: adminMfaProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input }) => listRiskFlagsForAdmin(input.limit)),

  reviewRiskFlag: adminMfaProcedure
    .input(
      z.object({
        riskFlagId: z.number().int().positive(),
        decision: z.enum(["resolved", "dismissed"]),
        reviewNote: z.string().trim().min(10).max(2_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await reviewRiskFlag({ ...input, adminUserId: ctx.user!.id });
      } catch (error) {
        if (error instanceof Error && error.message === "RISK_FLAG_NOT_ACTIONABLE") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Risk kaydı bulunamadı veya artık incelemeye uygun değil" });
        }
        throw error;
      }
    }),

  featureFlags: adminMfaProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }))
    .query(async ({ input }) => listFeatureFlags(input.limit)),

  setFeatureFlag: adminMfaProcedure
    .input(
      z.object({
        key: z.string().trim().regex(/^[a-z][a-z0-9_.-]{0,95}$/),
        enabled: z.boolean(),
        rolloutPct: z.number().int().min(0).max(100).optional(),
        killSwitch: z.boolean().optional(),
        audienceSeed: z.string().trim().min(1).max(96).optional(),
        reason: z.string().trim().min(3).max(280),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await setFeatureFlag({ ...input, adminUserId: ctx.user!.id });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("FEATURE_FLAG_")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Feature flag ayarları geçersiz" });
        }
        throw error;
      }
    }),

  users: adminMfaProcedure
    .input(
      listInput.extend({
        role: z.enum(["admin", "customer", "provider"]).optional(),
        search: z.string().trim().max(100).optional(),
      }),
    )
    .query(async ({ input }) => listMoveOsUsers(input)),

  getUser: adminMfaProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const user = await getMoveOsUser(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Kullanıcı bulunamadı" });
      return user;
    }),

  updateUser: adminMfaProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        name: z.string().trim().min(2).max(200).optional(),
        role: z.enum(["user", "admin"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.user;
      if (!currentUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Geçerli bir yönetici oturumu gerekli" });
      }
      if (currentUser.id === input.userId && input.role === "user") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Yönetici kendi yönetici yetkisini kaldıramaz" });
      }
      const updated = await updateMoveOsUser(input);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Kullanıcı bulunamadı" });
      return updated;
    }),

  categories: adminMfaProcedure.query(async () => {
    const categories = await listMoveOsCategories();
    return categories.map((category) => ({
      ...category,
      commissionRateBps: STANDARD_COMMISSION_RATE_BPS,
    }));
  }),

  createCategory: adminMfaProcedure.input(categoryInput).mutation(async ({ input }) => {
    const slug = input.slug ?? createSlug(input.name);
    if (!slug) throw new TRPCError({ code: "BAD_REQUEST", message: "Geçerli kategori adı gerekli" });
    const category = await createMoveOsCategory({ ...input, slug });
    if (!category) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Kategori oluşturulamadı" });
    return { ...category, commissionRateBps: STANDARD_COMMISSION_RATE_BPS };
  }),

  updateCategory: adminMfaProcedure
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

  archiveCategory: adminMfaProcedure
    .input(z.object({ categoryId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const category = await archiveMoveOsCategory(input.categoryId);
      if (!category) throw new TRPCError({ code: "NOT_FOUND", message: "Kategori bulunamadı" });
      return { ...category, commissionRateBps: STANDARD_COMMISSION_RATE_BPS };
    }),

  aiCommand: adminMfaProcedure
    .input(z.object({ command: z.string().trim().min(3).max(2_000) }))
    .mutation(async ({ input }) => ({
      command: input.command,
      action: "confirmation_required" as const,
      executed: false,
      response:
        "Yönetim komutu alındı. Etkili işlemler için MoveOS onaylı komut yürütücüsü henüz yapılandırılmadığından hiçbir veri değiştirilmedi.",
    })),

  wallet: adminMfaProcedure.query(async () => {
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

  withdrawFunds: adminMfaProcedure
    .input(z.object({ amount: z.number().int().positive(), bankAccountId: z.string().trim().min(1).max(96) }))
    .mutation(async () => {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Şirket banka hesabı ve onaylı ödeme süreci modellenmeden platform para çekme işlemi başlatılamaz.",
      });
    }),

  analytics: adminMfaProcedure
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

  services: adminMfaProcedure.input(listInput).query(async ({ input }) => listMoveOsServices(input)),

  getService: adminMfaProcedure
    .input(z.object({ serviceId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const service = await getMoveOsService(input.serviceId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Hizmet talebi bulunamadı" });
      return service;
    }),
});
