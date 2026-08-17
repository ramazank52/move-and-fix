import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const appealInput = z.object({
  providerCapabilityStatusId: z.number().int().positive(),
  type: z.enum(["appeal", "resubmission"]),
  statement: z.string().trim().min(20).max(2_000),
});

export const complianceRouter = router({
  myCapabilities: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderProfile(ctx.user.id);
    if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Capability doğrulaması yalnız profesyonel hesaplara açıktır" });
    return db.listProviderCapabilityStatuses(provider.id);
  }),

  appeal: protectedProcedure.input(appealInput).mutation(async ({ ctx, input }) => {
    const provider = await db.getProviderProfile(ctx.user.id);
    if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Capability itirazı yalnız profesyonel hesaplara açıktır" });
    try {
      return await db.createProviderCapabilityAppeal({ ...input, providerId: provider.id });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "PROVIDER_CAPABILITY_APPEAL_FAILED";
      if (reason === "PROVIDER_CAPABILITY_STATUS_NOT_FOUND") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Capability kaydı bulunamadı" });
      }
      if (reason === "PROVIDER_CAPABILITY_APPEAL_NOT_ALLOWED") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bu capability sonucu için itiraz açılamaz" });
      }
      throw error;
    }
  }),

  getJobSafetyRules: publicProcedure
    .input(z.object({
      jurisdictionCode: z.string().trim().regex(/^[A-Za-z]{2,3}([_-][A-Za-z0-9]{2,8})?$/).max(16),
      categoryId: z.number().int().positive().optional(),
      serviceKey: z.string().trim().min(1).max(120).optional(),
    }).strict())
    .query(async ({ input }) => {
      const rules = await db.getJobSafetyRules({
        jurisdictionCode: input.jurisdictionCode.toUpperCase(),
        categoryId: input.categoryId,
        serviceKey: input.serviceKey,
      });
      return rules.map((rule) => ({
        id: rule.id,
        jurisdictionCode: rule.jurisdictionCode,
        categoryId: rule.categoryId,
        serviceKey: rule.serviceKey,
        activityStatus: rule.activityStatus,
        riskAttributesJson: rule.riskAttributesJson,
        prerequisitesJson: rule.prerequisitesJson,
        version: rule.version,
      }));
    }),
});
