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
  }),
});

export type AppRouter = typeof appRouter;
