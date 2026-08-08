import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { ownerRouter } from "./_core/ownerRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { walletService } from "./services/WalletService";
import { notificationService } from "./services/NotificationService";
import { notificationServiceV2 } from "./services/NotificationServiceV2";
import { aiService } from "./services/AIService";
import { eventService } from "./services/EventService";

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
      .query(({ input }) => {
        return db.getServiceRequestById(input.id);
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
      .query(({ input }) => {
        return db.getOffersForRequest(input.requestId);
      }),
    create: protectedProcedure
      .input(z.object({
        requestId: z.number(),
        providerId: z.number(),
        price: z.number(),
        message: z.string().optional(),
        estimatedTime: z.string().optional(),
      }))
      .mutation(({ input }) => {
        return db.createOffer(input);
      }),
    accept: protectedProcedure
      .input(z.object({ offerId: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.acceptOffer(input.offerId, ctx.user.id);
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
      .mutation(({ ctx, input }) => {
        return db.createReview({ ...input, userId: ctx.user.id });
      }),
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
      .input(z.object({ lat: z.string(), lng: z.string() }))
      .query(({ input }) => {
        return db.getNearbyProviders(input.lat, input.lng);
      }),
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
    create: protectedProcedure
      .input(z.object({
        requestId: z.number(),
        providerId: z.number(),
        amount: z.number().min(1),
      }))
      .mutation(({ ctx, input }) => {
        return db.createPayment({ ...input, userId: ctx.user.id });
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        paymentId: z.number(),
        status: z.enum(["pending", "held", "released", "refunded"]),
      }))
      .mutation(({ input }) => {
        return db.updatePaymentStatus(input.paymentId, input.status);
      }),
  }),
});

export type AppRouter = typeof appRouter;
