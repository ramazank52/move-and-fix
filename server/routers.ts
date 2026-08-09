import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { ownerRouter } from "./_core/ownerRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { walletService } from "./services/WalletService";
import { notificationService } from "./services/NotificationService";
import { notificationServiceV2 } from "./services/NotificationServiceV2";
import { aiService } from "./services/AIService";
import { eventService } from "./services/EventService";
import {
  gatewayCheckoutService,
  GatewayCheckoutError,
} from "./payments/GatewayCheckoutService";

// ── Composition Root: Bağımlılık Enjeksiyonu ──
// Döngüsel import'u önlemek için servisler burada birbirine bağlanır.
eventService.setNotificationSender(notificationService);
eventService.setWalletService(walletService);
notificationServiceV2.setEventPublisher(eventService);

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  owner: ownerRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Service Requests
  requests: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserServiceRequests(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const request = await db.getServiceRequestById(input.id);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "İş kaydı bulunamadı" });

        const provider = await db.getProviderProfile(ctx.user.id);
        const canRead =
          request.userId === ctx.user.id ||
          (provider != null && request.assignedProviderId === provider.id);
        if (!canRead) throw new TRPCError({ code: "FORBIDDEN", message: "Bu iş kaydına erişim yetkiniz yok" });
        return request;
      }),
    create: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        address: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        budgetMin: z.number().optional(),
        budgetMax: z.number().optional(),
        distanceKm: z.number().optional(),
        estimatedPrice: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.createServiceRequest({ ...input, userId: ctx.user.id });
      }),
  }),

  // Offers
  offers: router({
    forRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .query(async ({ ctx, input }) => {
        const request = await db.getServiceRequestById(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Hizmet talebi bulunamadı" });

        const provider = await db.getProviderProfile(ctx.user.id);
        const providerOffer = provider
          ? await db.getProviderOfferForRequest(input.requestId, provider.id)
          : null;
        const canRead =
          request.userId === ctx.user.id ||
          (provider != null && (request.assignedProviderId === provider.id || providerOffer != null));
        if (!canRead) throw new TRPCError({ code: "FORBIDDEN", message: "Bu tekliflere erişim yetkiniz yok" });
        return db.getOffersForRequest(input.requestId);
      }),
    create: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        price: z.number().int().min(1).max(10_000_000),
        message: z.string().trim().max(2000).optional(),
        estimatedTime: z.string().trim().min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const provider = await db.getProviderProfile(ctx.user.id);
        if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Profesyonel profiliniz bulunamadı" });

        const request = await db.getServiceRequestById(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Hizmet talebi bulunamadı" });
        if (request.status !== "pending") {
          throw new TRPCError({ code: "CONFLICT", message: "Bu hizmet talebi artık teklif kabul etmiyor" });
        }
        if (provider.categoryId != null && request.categoryId !== provider.categoryId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Bu hizmet kategorisi için teklif veremezsiniz" });
        }

        try {
          return await db.createOffer({ ...input, providerId: provider.id });
        } catch (error) {
          if (error instanceof Error && error.message.includes("daha önce")) {
            throw new TRPCError({ code: "CONFLICT", message: error.message });
          }
          throw error;
        }
      }),
    accept: protectedProcedure
      .input(z.object({ offerId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => {
        return db.acceptOffer(input.offerId, ctx.user.id);
      }),
    reject: protectedProcedure
      .input(z.object({ offerId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => {
        return db.rejectOffer(input.offerId, ctx.user.id);
      }),
  }),

  // Jobs (lifecycle management)
  jobs: router({
    updateStatus: protectedProcedure
      .input(z.object({
        requestId: z.number(),
        status: z.enum(["pending", "active", "completed", "cancelled"]),
      }))
      .mutation(({ ctx, input }) => {
        return db.updateJobStatus(input.requestId, input.status, ctx.user.id);
      }),
    complete: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.completeJob(input.requestId, ctx.user.id);
      }),
    review: protectedProcedure
      .input(z.object({
        requestId: z.number(),
        providerId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.createReview({ ...input, userId: ctx.user.id });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Değerlendirme kaydedilemedi";
          throw new TRPCError({
            code: message.includes("bulunamadı") ? "NOT_FOUND" : "BAD_REQUEST",
            message,
          });
        }
      }),
  }),

  // Service categories — shared by customer discovery and service request flows
  categories: router({
    list: publicProcedure.query(() => db.getActiveServiceCategories()),
    bySlug: publicProcedure
      .input(z.object({ slug: z.string().trim().min(1).max(100) }))
      .query(({ input }) => db.getServiceCategoryBySlug(input.slug)),
  }),

  // Messages
  messages: router({
    conversation: protectedProcedure
      .input(z.object({ otherUserId: z.number() }))
      .query(({ ctx, input }) => {
        return db.getConversation(ctx.user.id, input.otherUserId);
      }),
    send: protectedProcedure
      .input(z.object({
        receiverId: z.number(),
        content: z.string().min(1),
        requestId: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.sendMessage({ ...input, senderId: ctx.user.id });
      }),
  }),

  // Providers
  providers: router({
    nearby: publicProcedure
      .input(z.object({ lat: z.string().optional(), lng: z.string().optional() }).optional())
      .query(({ input }) => {
        return db.getNearbyProviders(input?.lat, input?.lng);
      }),
    byId: publicProcedure
      .input(z.object({ providerId: z.number().int().positive() }))
      .query(({ input }) => db.getProviderById(input.providerId)),
    byCategory: publicProcedure
      .input(z.object({ categoryId: z.number().int().positive() }))
      .query(({ input }) => db.getProvidersByCategory(input.categoryId)),
    favoriteList: protectedProcedure.query(({ ctx }) => db.getFavoriteProviders(ctx.user.id)),
    favoriteStatus: protectedProcedure
      .input(z.object({ providerId: z.number().int().positive() }))
      .query(({ ctx, input }) => db.isFavoriteProvider(ctx.user.id, input.providerId)),
    favoriteAdd: protectedProcedure
      .input(z.object({ providerId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.addFavoriteProvider(ctx.user.id, input.providerId)),
    favoriteRemove: protectedProcedure
      .input(z.object({ providerId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.removeFavoriteProvider(ctx.user.id, input.providerId)),
    myProfile: protectedProcedure.query(({ ctx }) => {
      return db.getProviderProfile(ctx.user.id);
    }),
    myJobs: protectedProcedure.query(({ ctx }) => {
      return db.getProviderJobs(ctx.user.id);
    }),
    myEarnings: protectedProcedure.query(({ ctx }) => {
      return db.getProviderEarnings(ctx.user.id);
    }),
    newJobs: protectedProcedure.query(({ ctx }) => {
      return db.getNewJobsForProvider(ctx.user.id);
    }),
  }),

  reviews: router({
    forProvider: publicProcedure
      .input(z.object({
        providerId: z.number().int().positive(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }))
      .query(({ input }) => db.getProviderReviews(input.providerId, input.limit, input.offset)),
  }),

  // MoveAI — Customer-facing AI assistant
  ai: router({
    command: protectedProcedure
      .input(z.object({
        message: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        // Use built-in LLM to understand intent and generate response
        try {
          const { invokeLLM } = await import("./_core/llm.js");
          const systemPrompt = `Sen MoveAI'sin, bir Türk hizmet pazaryeri asistanı. Kullanıcının niyetini anla ve uygun hizmet kategorisini belirle.
Kategoriler: plumbing (Su Tesisatı), electrical (Elektrik), cleaning (Temizlik), hvac (Klima/Isıtma), towing (Çekici), courier (Kurye), roadside (Yol Yardımı), locksmith (Çilingir), painting (Boyacı), gardening (Bahçe), moving (Nakliyat), appliance (Beyaz Eşya).
Yanıt formatı: { "response": "cevap metni", "category": "kategori_id", "suggestions": ["öneri1", "öneri2"], "shouldCreateRequest": true/false }
Acil durumları önceliklendir. Güven verici, kısa ve net ol.`;
          const result = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: input.message },
            ],
          });

          // Extract content string from LLM response (OpenAI-style choices array)
          const contentStr = typeof result.choices?.[0]?.message?.content === "string"
            ? result.choices[0].message.content
            : "";

          // Try to parse as JSON first; if that fails, use the raw text as the response
          let parsed: { response?: string; category?: string; suggestions?: string[]; shouldCreateRequest?: boolean } = {};
          try {
            parsed = contentStr ? JSON.parse(contentStr) : {};
          } catch {
            // Not JSON — use the raw text as the response and try keyword-based category detection
            const lower = input.message.toLowerCase();
            let category = "general";
            if (lower.includes("su") && (lower.includes("akı") || lower.includes("patla"))) category = "plumbing";
            else if (lower.includes("araba") && (lower.includes("kal") || lower.includes("bozul"))) category = "towing";
            else if (lower.includes("klima") && (lower.includes("soğut") || lower.includes("çalış"))) category = "hvac";
            else if (lower.includes("çekici")) category = "towing";
            else if (lower.includes("kurye")) category = "courier";
            else if (lower.includes("elektrik")) category = "electrical";
            else if (lower.includes("temizlik")) category = "cleaning";
            parsed = { response: contentStr || "Size yardımcı olmaya çalışıyorum.", category, shouldCreateRequest: true };
          }

          // If AI says to create a request, create one
          let requestId: number | undefined;
          if (parsed.shouldCreateRequest && parsed.category) {
            const categoryMap: Record<string, number> = {
              plumbing: 1, electrical: 2, cleaning: 3, hvac: 4,
              towing: 13, courier: 14, roadside: 15, locksmith: 5,
              painting: 6, gardening: 7, moving: 8, appliance: 9,
            };
            const categoryId = categoryMap[parsed.category] ?? 1;
            try {
              const req = await db.createServiceRequest({
                categoryId,
                title: input.message.slice(0, 100),
                description: input.message,
                userId: ctx.user.id,
              });
              // createServiceRequest returns insertId (number) from Drizzle
              requestId = typeof req === "number" ? req : (req as unknown as { id: number }).id;
            } catch {
              // DB not available — still return AI response
            }
          }

          return {
            response: parsed.response ?? "Size yardımcı olmaya çalışıyorum. Hangi hizmete ihtiyacınız var?",
            category: parsed.category,
            suggestions: parsed.suggestions ?? ["Su tesisatçısı", "Elektrikçi", "Çekici", "Temizlik"],
            requestId,
          };
        } catch (error: unknown) {
          // Fallback: keyword-based intent detection
          const lower = input.message.toLowerCase();
          let category = "general";
          let response = "Sorununuzu anladım. Size yardımcı olmak istiyorum. Hangi hizmete ihtiyacınız var?";
          const suggestions = ["Su tesisatçısı", "Elektrikçi", "Çekici", "Temizlik"];

          if (lower.includes("su") && (lower.includes("akı") || lower.includes("patla"))) {
            category = "plumbing";
            response = "Su tesisatı acil durumu anlıyorum. Size en yakın su tesisatçısını buluyorum. Tahmini ücret: ₺200-₺500.";
          } else if (lower.includes("araba") && (lower.includes("kal") || lower.includes("bozul"))) {
            category = "towing";
            response = "Araç arızası için çekici veya yol yardımı gerekiyor. Çekici: ₺200 başlangıç + ₺25/km.";
          } else if (lower.includes("klima") && (lower.includes("soğut") || lower.includes("çalış"))) {
            category = "hvac";
            response = "Klima arızası için size en yakın klima servisini buluyorum. Tahmini ücret: ₺600-₺1.200.";
          } else if (lower.includes("çekici")) {
            category = "towing";
            response = "Çekici hizmeti için konumunuzu paylaşır mısınız? ₺200 başlangıç + ₺25/km.";
          } else if (lower.includes("kurye")) {
            category = "courier";
            response = "Kurye hizmeti için paket bilgilerinizi paylaşır mısınız? ₺50 başlangıç + ₺12/km.";
          }

          return { response, category, suggestions, requestId: undefined };
        }
      }),
  }),

  // Payments
  payments: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserPayments(ctx.user.id);
    }),
    quote: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        try {
          return await db.getPaymentQuote(input.requestId, ctx.user.id);
        } catch (error) {
          const message = error instanceof Error ? error.message : "PAYMENT_QUOTE_FAILED";
          if (message === "PAYMENT_REQUEST_NOT_FOUND") {
            throw new TRPCError({ code: "NOT_FOUND", message: "Hizmet talebi bulunamadı" });
          }
          if (message.includes("NOT_READY") || message.includes("OFFER_NOT_FOUND")) {
            throw new TRPCError({ code: "CONFLICT", message: "Ödeme için kabul edilmiş aktif bir teklif bulunamadı" });
          }
          throw error;
        }
      }),
    create: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        idempotencyKey: z.string().trim().min(16).max(96),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.createPayment({ ...input, userId: ctx.user.id });
        } catch (error) {
          const message = error instanceof Error ? error.message : "PAYMENT_CREATE_FAILED";
          if (message === "PAYMENT_REQUEST_NOT_FOUND") {
            throw new TRPCError({ code: "NOT_FOUND", message: "Hizmet talebi bulunamadı" });
          }
          if (message === "PAYMENT_FORBIDDEN") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Bu ödeme üzerinde işlem yetkiniz yok" });
          }
          if (message.includes("NOT_READY") || message.includes("OFFER_NOT_FOUND")) {
            throw new TRPCError({ code: "CONFLICT", message: "Ödeme için kabul edilmiş aktif bir teklif bulunamadı" });
          }
          if (message === "PAYMENT_IDEMPOTENCY_CONFLICT") {
            throw new TRPCError({ code: "CONFLICT", message: "Idempotency anahtarı başka bir ödeme için kullanılmış" });
          }
          throw error;
        }
      }),
    initializeGateway: protectedProcedure
      .input(z.object({
        paymentId: z.number().int().positive(),
        provider: z.enum(["iyzico", "stripe"]),
        buyer: z.object({
          gsmNumber: z.string().trim().regex(/^(?:\+?90|0)?5\d{9}$/).optional(),
          identityNumber: z.string().trim().regex(/^\d{11}$/).optional(),
          address: z.string().trim().min(10).max(500).optional(),
          city: z.string().trim().min(2).max(100).optional(),
          zipCode: z.string().trim().regex(/^\d{5}$/).optional(),
        }).default({}),
      }).superRefine((input, context) => {
        if (input.provider !== "iyzico") return;
        const requiredFields = ["gsmNumber", "identityNumber", "address", "city"] as const;
        for (const field of requiredFields) {
          if (!input.buyer[field]) {
            context.addIssue({
              code: "custom",
              path: ["buyer", field],
              message: "iyzico için zorunlu alan",
            });
          }
        }
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const payment = await db.reservePaymentGateway({
            paymentId: input.paymentId,
            userId: ctx.user.id,
            provider: input.provider,
          });
          const quote = await db.getPaymentQuote(payment.requestId, ctx.user.id);
          const checkout = await gatewayCheckoutService.initialize({
            provider: input.provider,
            paymentId: payment.id,
            requestId: payment.requestId,
            requestTitle: quote.requestTitle,
            amount: payment.amount,
            currency: quote.currency,
            idempotencyKey: payment.idempotencyKey ?? `payment:${payment.id}`,
            buyer: {
              id: ctx.user.id,
              name: ctx.user.name?.trim() || "MoveFix Kullanıcısı",
              email: ctx.user.email?.trim() || "noreply@movefix.invalid",
              ipAddress: ctx.req.ip || ctx.req.socket.remoteAddress || "127.0.0.1",
              ...input.buyer,
            },
          });
          await db.attachPaymentGatewayTransaction({
            paymentId: payment.id,
            userId: ctx.user.id,
            provider: input.provider,
            gatewayPaymentId:
              checkout.provider === "stripe" ? checkout.gatewayTransactionId : undefined,
            gatewayCheckoutToken:
              checkout.provider === "iyzico" ? checkout.checkoutToken : undefined,
          });
          return checkout;
        } catch (error) {
          const message = error instanceof Error ? error.message : "PAYMENT_GATEWAY_FAILED";
          if (message === "PAYMENT_NOT_FOUND") {
            throw new TRPCError({ code: "NOT_FOUND", message: "Ödeme bulunamadı" });
          }
          if (message === "PAYMENT_FORBIDDEN") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Bu ödeme üzerinde işlem yetkiniz yok" });
          }
          if (message.includes("INVALID_STATUS") || message.includes("CONFLICT")) {
            throw new TRPCError({ code: "CONFLICT", message: "Ödeme sağlayıcısı mevcut ödeme durumunda başlatılamaz" });
          }
          if (error instanceof GatewayCheckoutError) {
            if (error.code === "GATEWAY_NOT_CONFIGURED") {
              throw new TRPCError({ code: "PRECONDITION_FAILED", message: error.message });
            }
            if (error.code === "GATEWAY_INVALID_INPUT") {
              throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
            }
            if (error.code === "GATEWAY_TIMEOUT") {
              throw new TRPCError({ code: "TIMEOUT", message: error.message });
            }
            throw new TRPCError({ code: "BAD_GATEWAY", message: error.message });
          }
          throw error;
        }
      }),
    release: protectedProcedure
      .input(z.object({
        paymentId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.transitionPaymentStatus({
            paymentId: input.paymentId,
            actorUserId: ctx.user.id,
            nextStatus: "released",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "PAYMENT_RELEASE_FAILED";
          if (message === "PAYMENT_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Ödeme bulunamadı" });
          if (message === "PAYMENT_FORBIDDEN") throw new TRPCError({ code: "FORBIDDEN", message: "Bu ödemeyi serbest bırakma yetkiniz yok" });
          if (message.includes("INVALID_TRANSITION") || message === "PAYMENT_JOB_NOT_COMPLETED") {
            throw new TRPCError({ code: "CONFLICT", message: "Ödeme mevcut durumda serbest bırakılamaz" });
          }
          throw error;
        }
      }),
    refund: protectedProcedure
      .input(z.object({ paymentId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "İade işlemi yalnızca yetkili yönetici tarafından yapılabilir" });
        }
        try {
          return await db.transitionPaymentStatus({
            paymentId: input.paymentId,
            actorUserId: ctx.user.id,
            nextStatus: "refunded",
            requireAdmin: true,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "PAYMENT_REFUND_FAILED";
          if (message === "PAYMENT_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Ödeme bulunamadı" });
          if (message.includes("INVALID_TRANSITION")) {
            throw new TRPCError({ code: "CONFLICT", message: "Ödeme mevcut durumda iade edilemez" });
          }
          throw error;
        }
      }),
  }),

  // MoveWallet — user-scoped balance, history and withdrawal workflow
  wallet: router({
    summary: protectedProcedure.query(({ ctx }) => {
      return db.getWalletSummary(ctx.user.id);
    }),
    transactions: protectedProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }).optional())
      .query(({ ctx, input }) => {
        return db.getWalletTransactions(ctx.user.id, input?.limit ?? 50, input?.offset ?? 0);
      }),
    withdraw: protectedProcedure
      .input(z.object({
        amount: z.number().int().min(100).max(1_000_000),
        bankAccountId: z.string().trim().min(10).max(96).regex(/^[A-Za-z0-9 -]+$/),
        idempotencyKey: z.string().trim().min(16).max(96),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.requestWalletWithdrawal({ ...input, userId: ctx.user.id });
        } catch (error) {
          if (error instanceof Error && error.message.includes("Yetersiz")) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
