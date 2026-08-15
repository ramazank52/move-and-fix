import { COOKIE_NAME } from "../shared/const.js";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { createHeartbeatJob, listHeartbeatJobs, updateHeartbeatJob } from "./_core/heartbeat";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { ownerRouter } from "./_core/ownerRouter";
import { complianceRouter } from "./compliance/router";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { walletService } from "./services/WalletService";
import { notificationService } from "./services/NotificationService";
import {
  NotificationChannel,
  notificationServiceV2,
} from "./services/NotificationServiceV2";
import { aiService } from "./services/AIService";
import { eventService } from "./services/EventService";
import { storagePut } from "./storage";
import { analyzeCompletionEvidence } from "./services/CompletionEvidenceAnalysisService";
import {
  gatewayCheckoutService,
  GatewayCheckoutError,
} from "./payments/GatewayCheckoutService";

// ── Composition Root: Bağımlılık Enjeksiyonu ──
// Döngüsel import'u önlemek için servisler burada birbirine bağlanır.
eventService.setNotificationSender(notificationService);
eventService.setWalletService(walletService);
notificationServiceV2.setEventPublisher(eventService);

const serviceRequestTypeSchema = z.enum([
  "generic",
  "painting",
  "electrical",
  "plumbing",
  "cleaning",
  "moving",
  "courier",
  "tow_truck",
  "roadside",
]);

const coordinateSchema = z
  .string()
  .trim()
  .regex(/^-?\d{1,3}(?:\.\d{1,12})$/, "Geçerli bir koordinat girin");

const requestAttributeValueSchema = z.union([
  z.string().trim().max(1000),
  z.number().finite().min(-1_000_000).max(1_000_000),
  z.boolean(),
  z.null(),
]);

const agreementEvidenceMediaIdsSchema = z
  .array(z.number().int().positive())
  .max(8)
  .refine((ids) => new Set(ids).size === ids.length, "Kanıt dosyası tekrar edemez");

const serviceRequestDetailsSchema = z.object({
  subcategoryId: z.number().int().positive().optional(),
  serviceType: serviceRequestTypeSchema,
  pickupAddress: z.string().trim().min(3).max(500).optional(),
  destinationAddress: z.string().trim().min(3).max(500).optional(),
  pickupLatitude: coordinateSchema.optional(),
  pickupLongitude: coordinateSchema.optional(),
  destinationLatitude: coordinateSchema.optional(),
  destinationLongitude: coordinateSchema.optional(),
  pickupFloor: z.number().int().min(-5).max(200).optional(),
  destinationFloor: z.number().int().min(-5).max(200).optional(),
  pickupHasElevator: z.boolean().optional(),
  destinationHasElevator: z.boolean().optional(),
  distanceKm: z.number().int().min(0).max(5000).optional(),
  attributes: z
    .record(z.string().trim().min(1).max(80), requestAttributeValueSchema)
    .refine((attributes) => Object.keys(attributes).length <= 30, "En fazla 30 hizmet alanı gönderilebilir"),
});

const allowedRequestMedia = {
  "image/jpeg": { kind: "image", extension: "jpg", maxBytes: 8 * 1024 * 1024 },
  "image/png": { kind: "image", extension: "png", maxBytes: 8 * 1024 * 1024 },
  "image/webp": { kind: "image", extension: "webp", maxBytes: 8 * 1024 * 1024 },
  "image/heic": { kind: "image", extension: "heic", maxBytes: 8 * 1024 * 1024 },
  "image/heif": { kind: "image", extension: "heif", maxBytes: 8 * 1024 * 1024 },
  "video/mp4": { kind: "video", extension: "mp4", maxBytes: 25 * 1024 * 1024 },
  "video/quicktime": { kind: "video", extension: "mov", maxBytes: 25 * 1024 * 1024 },
} as const;

type AllowedRequestMime = keyof typeof allowedRequestMedia;

function hasExpectedMediaSignature(buffer: Buffer, mimeType: AllowedRequestMime): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  const isoBrand = buffer.subarray(4, 12).toString("ascii");
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return /^ftyp(?:heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(isoBrand);
  }
  return isoBrand.startsWith("ftyp");
}

function decodeStrictBase64(value: string): Buffer {
  const compact = value.replace(/\s/g, "");
  if (compact.length === 0 || compact.length % 4 !== 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Geçersiz medya verisi" });
  }
  const buffer = Buffer.from(compact, "base64");
  if (
    buffer.length === 0 ||
    buffer.toString("base64").replace(/=+$/, "") !== compact.replace(/=+$/, "")
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Geçersiz medya verisi" });
  }
  return buffer;
}

const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
const passwordSchema = z
  .string()
  .min(10, "Parola en az 10 karakter olmalıdır")
  .max(128)
  .refine(
    (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value),
    "Parola büyük harf, küçük harf ve rakam içermelidir",
  );
const verificationCodeSchema = z.string().regex(/^\d{6}$/, "6 haneli güvenlik kodunu girin");
const verificationPurposeSchema = z.enum(["verify_email", "verify_phone", "sensitive_transaction"]);
const providerDocumentTypeSchema = z.enum([
  "identity",
  "driver_license",
  "src_certificate",
  "psychotechnic",
]);
const voiceMimeTypeSchema = z.enum([
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/ogg",
  "audio/webm",
  "audio/wav",
]);

function normalizeTurkishPhone(value: string): string {
  const compact = value.replace(/[\s()-]/g, "");
  const national = compact.replace(/^\+?90/, "").replace(/^0/, "");
  if (!/^5\d{9}$/.test(national)) throw new TRPCError({ code: "BAD_REQUEST", message: "Geçerli bir Türkiye cep telefonu girin" });
  return `+90${national}`;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `scrypt-v1$${salt}$${digest}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [version, salt, expected] = encoded.split("$");
  if (version !== "scrypt-v1" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function hashVerificationCode(userId: number, purpose: db.AuthChallengePurpose, code: string): string {
  if (!ENV.cookieSecret) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Oturum güvenlik yapılandırması eksik" });
  return createHmac("sha256", ENV.cookieSecret)
    .update(`${userId}:${purpose}:${code}`)
    .digest("hex");
}

async function issueVerificationCode(data: {
  userId: number;
  purpose: db.AuthChallengePurpose;
  destination: string;
}) {
  const channel = data.purpose === "verify_phone" ? NotificationChannel.SMS : NotificationChannel.EMAIL;
  const code = randomInt(100_000, 1_000_000).toString();
  await db.createAuthChallenge({
    ...data,
    channel: channel === NotificationChannel.SMS ? "sms" : "email",
    codeHash: hashVerificationCode(data.userId, data.purpose, code),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const delivery = await notificationServiceV2.sendVerificationCode({
    channel,
    destination: data.destination,
    code,
    purpose: data.purpose,
  });
  if (delivery.deliveryStatus !== "delivered") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Doğrulama mesajı gönderilemedi. Bildirim sağlayıcısı yapılandırılmalıdır.",
    });
  }
  return delivery;
}

async function setLocalSession(
  ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => unknown } },
  user: { id: number; openId: string; name: string | null; email: string | null; role: "user" | "admin"; emailVerifiedAt?: Date | null },
  includeNativeToken = false,
) {
  const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "Move&Fix kullanıcısı", expiresInMs: ONE_YEAR_MS });
  const sessionId = randomUUID();
  const forwardedFor = ctx.req.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : typeof forwardedFor === "string" ? forwardedFor.split(",")[0]?.trim() : ctx.req.ip;
  await db.createLocalAuthSession({
    id: sessionId,
    userId: user.id,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    userAgent: ctx.req.headers["user-agent"]?.slice(0, 512) ?? null,
    ipHash: ipAddress ? createHash("sha256").update(ipAddress).digest("hex") : null,
    expiresAt: new Date(Date.now() + ONE_YEAR_MS),
  });
  ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
  const provider = await db.getProviderProfile(user.id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    accountType: user.role === "admin" ? "admin" : provider ? "provider" : "customer",
    ...(includeNativeToken ? { sessionToken: token } : {}),
  };
}

function hasExpectedProviderDocumentSignature(buffer: Buffer, mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp") {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  return hasExpectedMediaSignature(buffer, mimeType);
}

function hasExpectedVoiceSignature(buffer: Buffer, mimeType: z.infer<typeof voiceMimeTypeSchema>) {
  if (mimeType === "audio/mpeg") return buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  if (mimeType === "audio/ogg") return buffer.subarray(0, 4).toString("ascii") === "OggS";
  if (mimeType === "audio/wav") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE";
  if (mimeType === "audio/webm") return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return buffer.subarray(4, 8).toString("ascii") === "ftyp";
}

async function runTrackingOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Canlı takip işlemi başarısız";
    if (message.includes("not found")) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Aktif iş bulunamadı" });
    }
    if (message.includes("Not authorized") || message.includes("Only the assigned provider")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Bu canlı takip işlemine yetkiniz yok" });
    }
    if (message.includes("active job") || message.includes("transition")) {
      throw new TRPCError({ code: "CONFLICT", message });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Canlı takip işlemi tamamlanamadı",
    });
  }
}

async function runCompletionOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : "COMPLETION_OPERATION_FAILED";
    if (message.includes("NOT_FOUND") || message.includes("not found")) {
      throw new TRPCError({ code: "NOT_FOUND", message: "İş tamamlama kaydı bulunamadı" });
    }
    if (message.includes("FORBIDDEN") || message.includes("Not authorized")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Bu iş tamamlama işlemine yetkiniz yok" });
    }
    if (
      message.includes("INVALID_STATUS") ||
      message.includes("JOB_NOT_COMPLETED") ||
      message.includes("RESPONSE_EXPIRED") ||
      message.includes("DISPUTE_OPEN") ||
      message.includes("ESCROW_") ||
      message.includes("CONFLICT")
    ) {
      throw new TRPCError({ code: "CONFLICT", message: "İşin mevcut durumu bu işlem için uygun değil" });
    }
    if (message.includes("MEDIA_REQUIRED") || message.includes("PAYOUT_INVALID")) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Kanıt veya ödeme bilgisi geçerli değil" });
    }
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "İş tamamlama işlemi gerçekleştirilemedi" });
  }
}

async function runAgreementOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : "JOB_AGREEMENT_OPERATION_FAILED";
    if (message.includes("NOT_FOUND")) {
      throw new TRPCError({ code: "NOT_FOUND", message: "İş veya anlaşma kaydı bulunamadı" });
    }
    if (message.includes("FORBIDDEN")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Bu iş anlaşması işlemine yetkiniz yok" });
    }
    if (message.includes("INVALID") || message.includes("MISMATCH") || message.includes("DESCRIPTION")) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Gönderilen iş anlaşması verisi geçerli değil" });
    }
    if (
      message.includes("CONFLICT") ||
      message.includes("NOT_PENDING") ||
      message.includes("ALREADY_OPEN") ||
      message.includes("REQUEST_INVALID_STATUS")
    ) {
      throw new TRPCError({ code: "CONFLICT", message: "İşin mevcut durumu bu işlem için uygun değil" });
    }
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "İş anlaşması işlemi tamamlanamadı" });
  }
}

async function runMessageOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : "MESSAGE_OPERATION_FAILED";
    if (message === "MESSAGE_REQUEST_NOT_FOUND") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Hizmet talebi bulunamadı" });
    }
    if (
      message === "MESSAGE_REQUEST_NOT_ASSIGNED" ||
      message === "MESSAGE_FORBIDDEN" ||
      message === "MESSAGE_COUNTERPARTY_FORBIDDEN"
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Bu hizmet görüşmesine erişim yetkiniz yok",
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Mesajlaşma işlemi tamamlanamadı",
    });
  }
}

export const appRouter = router({
  compliance: complianceRouter,
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  owner: ownerRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure
      .input(z.object({
        name: z.string().trim().min(2).max(120),
        email: emailSchema,
        password: passwordSchema,
        phone: z.string().trim().min(7).max(32).optional(),
        accountType: z.enum(["customer", "provider"]).default("customer"),
        nativeSession: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserByEmailNormalized(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Bu e-posta ile zaten bir hesap var" });
        const phone = input.phone ? normalizeTurkishPhone(input.phone) : undefined;
        const user = await db.createLocalUser({
          openId: `local_${randomUUID()}`,
          name: input.name,
          email: input.email,
          phone,
        });
        try {
          await db.createLocalCredential({
            userId: user.id,
            emailNormalized: input.email,
            phoneE164: phone,
            passwordHash: hashPassword(input.password),
          });
          if (input.accountType === "provider") {
            await db.createLocalProviderProfile({ userId: user.id, displayName: input.name });
          }
        } catch (error) {
          throw new TRPCError({ code: "CONFLICT", message: "Bu hesap bilgileri zaten kullanılıyor", cause: error });
        }
        let verification: Awaited<ReturnType<typeof issueVerificationCode>> | null = null;
        let verificationBlocker: string | null = null;
        try {
          verification = await issueVerificationCode({
            userId: user.id,
            purpose: "verify_email",
            destination: input.email,
          });
        } catch (error) {
          if (error instanceof TRPCError && error.code === "PRECONDITION_FAILED") {
            verificationBlocker = error.message;
          } else {
            throw error;
          }
        }
        return {
          user: await setLocalSession(ctx, user, input.nativeSession),
          verificationRequired: true,
          verificationDelivery: verification,
          verificationBlocker,
        };
      }),
    login: publicProcedure
      .input(z.object({
        identifier: z.string().trim().min(3).max(320),
        password: z.string().min(1).max(128),
        nativeSession: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const email = input.identifier.toLowerCase();
        const local = await db.getUserByEmailNormalized(email);
        const credential = local?.credential;
        if (!local || !credential || !verifyPassword(input.password, credential.passwordHash)) {
          if (local?.user && credential) {
            const lockUntil = credential.failedLoginCount >= 4 ? new Date(Date.now() + 15 * 60 * 1000) : undefined;
            await db.recordLocalLoginFailure(local.user.id, lockUntil);
          }
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-posta veya parola hatalı" });
        }
        if (credential.lockedUntil && credential.lockedUntil.getTime() > Date.now()) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Çok fazla hatalı deneme yapıldı. Lütfen sonra tekrar deneyin" });
        }
        await db.resetLocalLoginFailures(local.user.id);
        return { user: await setLocalSession(ctx, local.user, input.nativeSession) };
      }),
    requestVerification: protectedProcedure
      .input(z.object({ purpose: verificationPurposeSchema }))
      .mutation(async ({ ctx, input }) => {
        const destination = input.purpose === "verify_phone"
          ? ctx.user.phone
          : ctx.user.email;
        if (!destination) throw new TRPCError({ code: "BAD_REQUEST", message: "Bu doğrulama için kayıtlı iletişim bilgisi yok" });
        const verification = await issueVerificationCode({ userId: ctx.user.id, purpose: input.purpose, destination });
        return { verificationDelivery: verification };
      }),
    sessions: protectedProcedure.query(({ ctx }) =>
      db.listLocalAuthSessions(ctx.user.id).then((sessions) => ({ sessions, currentSessionId: ctx.localSessionId })),
    ),
    revokeSession: protectedProcedure
      .input(z.object({ sessionId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const revoked = await db.revokeLocalAuthSession({ userId: ctx.user.id, sessionId: input.sessionId, reason: "user_revoked" });
        if (!revoked) throw new TRPCError({ code: "NOT_FOUND", message: "Aktif oturum bulunamadı" });
        if (ctx.localSessionId === input.sessionId) {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        }
        return { revoked: true as const };
      }),
    revokeOtherSessions: protectedProcedure.mutation(({ ctx }) =>
      db.revokeOtherLocalAuthSessions({
        userId: ctx.user.id,
        currentSessionId: ctx.localSessionId ?? null,
        reason: "user_revoked_others",
      }).then((revokedCount) => ({ revokedCount })),
    ),
    verifyCode: protectedProcedure
      .input(z.object({ purpose: verificationPurposeSchema, code: verificationCodeSchema }))
      .mutation(async ({ ctx, input }) => {
        const codeHash = hashVerificationCode(ctx.user.id, input.purpose, input.code);
        const validChallenge = await db.getActiveAuthChallenge({ userId: ctx.user.id, purpose: input.purpose, codeHash });
        if (!validChallenge) {
          const activeChallenge = await db.getLatestActiveAuthChallenge({ userId: ctx.user.id, purpose: input.purpose });
          if (activeChallenge) await db.incrementAuthChallengeAttempts(activeChallenge.id);
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kod geçersiz, süresi dolmuş veya deneme sınırına ulaşmış" });
        }
        await db.markAuthChallengeUsed(validChallenge.id);
        await db.updateUserVerification({
          userId: ctx.user.id,
          emailVerified: input.purpose === "verify_email",
          phoneVerified: input.purpose === "verify_phone",
        });
        return { verified: input.purpose };
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: emailSchema }))
      .mutation(async ({ input }) => {
        const local = await db.getUserByEmailNormalized(input.email);
        if (!local) return { accepted: true as const };
        const verification = await issueVerificationCode({
          userId: local.user.id,
          purpose: "password_reset",
          destination: input.email,
        });
        return { accepted: true as const, verificationDelivery: verification };
      }),
    resetPassword: publicProcedure
      .input(z.object({ email: emailSchema, code: verificationCodeSchema, password: passwordSchema }))
      .mutation(async ({ input }) => {
        const local = await db.getUserByEmailNormalized(input.email);
        if (!local) throw new TRPCError({ code: "BAD_REQUEST", message: "Kod geçersiz veya süresi dolmuş" });
        const codeHash = hashVerificationCode(local.user.id, "password_reset", input.code);
        const validChallenge = await db.getActiveAuthChallenge({ userId: local.user.id, purpose: "password_reset", codeHash });
        if (!validChallenge) {
          const activeChallenge = await db.getLatestActiveAuthChallenge({ userId: local.user.id, purpose: "password_reset" });
          if (activeChallenge) await db.incrementAuthChallengeAttempts(activeChallenge.id);
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kod geçersiz, süresi dolmuş veya deneme sınırına ulaşmış" });
        }
        await db.updateLocalCredentialPassword(local.user.id, hashPassword(input.password));
        await db.markAuthChallengeUsed(validChallenge.id);
        return { success: true as const };
      }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      if (ctx.user && ctx.localSessionId) {
        await db.revokeLocalAuthSession({ userId: ctx.user.id, sessionId: ctx.localSessionId, reason: "logout" });
      }
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
        const [details, media] = await Promise.all([
          db.getServiceRequestDetails(input.id),
          db.getServiceRequestMedia(input.id),
        ]);
        return { ...request, details, media };
      }),
    create: protectedProcedure
      .input(z.object({
        categoryId: z.number().int().positive(),
        title: z.string().trim().min(1).max(255),
        description: z.string().trim().max(5000).optional(),
        address: z.string().trim().max(500).optional(),
        latitude: coordinateSchema.optional(),
        longitude: coordinateSchema.optional(),
        budgetMin: z.number().int().min(0).max(10_000_000).optional(),
        budgetMax: z.number().int().min(0).max(10_000_000).optional(),
        distanceKm: z.number().int().min(0).max(5000).optional(),
        estimatedPrice: z.number().int().min(0).max(10_000_000).optional(),
        details: serviceRequestDetailsSchema.optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.budgetMin != null && input.budgetMax != null && input.budgetMin > input.budgetMax) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Minimum bütçe maksimum bütçeden büyük olamaz" });
        }

        const categories = await db.getActiveServiceCategories();
        const category = categories.find((item) => item.id === input.categoryId);
        if (!category) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Aktif hizmet kategorisi bulunamadı" });
        }

        if (input.details?.subcategoryId != null) {
          const subcategory = category.subcategories.find(
            (item) => item.id === input.details?.subcategoryId,
          );
          if (!subcategory) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Alt kategori bu hizmete ait değil" });
          }
        }

        if (input.details) {
          const categoryTypeMap: Record<string, db.ServiceRequestType> = {
            painting: "painting",
            electrical: "electrical",
            plumbing: "plumbing",
            cleaning: "cleaning",
            moving: "moving",
            courier: "courier",
            towing: "tow_truck",
            tow_truck: "tow_truck",
            roadside: "roadside",
          };
          const expectedType = categoryTypeMap[category.slug] ?? "generic";
          if (input.details.serviceType !== "generic" && input.details.serviceType !== expectedType) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Hizmet ayrıntıları seçilen kategoriyle uyuşmuyor" });
          }
          if (["moving", "courier", "tow_truck"].includes(input.details.serviceType)) {
            if (!input.details.pickupAddress || !input.details.destinationAddress) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Başlangıç ve varış adresleri zorunludur" });
            }
          }
        }
        return db.createServiceRequest({ ...input, userId: ctx.user.id });
      }),
    uploadMedia: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        originalName: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .regex(/^[^\\/\u0000-\u001f]+$/, "Geçersiz dosya adı"),
        mimeType: z.enum([
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic",
          "image/heif",
          "video/mp4",
          "video/quicktime",
        ]),
        base64: z.string().min(4).max(36_000_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const request = await db.getServiceRequestById(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Hizmet talebi bulunamadı" });
        if (request.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Bu talebe medya ekleme yetkiniz yok" });
        }
        if (request.status !== "pending") {
          throw new TRPCError({ code: "CONFLICT", message: "Yalnız bekleyen taleplere medya eklenebilir" });
        }

        const existingMedia = await db.getServiceRequestMedia(input.requestId);
        if (existingMedia.length >= 8) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Bir talebe en fazla 8 medya eklenebilir" });
        }

        const policy = allowedRequestMedia[input.mimeType];
        const buffer = decodeStrictBase64(input.base64);
        if (buffer.length > policy.maxBytes) {
          throw new TRPCError({
            code: "PAYLOAD_TOO_LARGE",
            message: policy.kind === "image" ? "Görsel en fazla 8 MB olabilir" : "Video en fazla 25 MB olabilir",
          });
        }
        if (!hasExpectedMediaSignature(buffer, input.mimeType)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Dosya içeriği medya türüyle uyuşmuyor" });
        }

        const sha256 = createHash("sha256").update(buffer).digest("hex");
        const relKey = `service-requests/${input.requestId}/${ctx.user.id}/${randomUUID()}.${policy.extension}`;
        const uploaded = await storagePut(relKey, buffer, input.mimeType);
        const mediaId = await db.createServiceRequestMedia({
          requestId: input.requestId,
          ownerUserId: ctx.user.id,
          purpose: "request",
          kind: policy.kind,
          storageKey: uploaded.key,
          originalName: input.originalName,
          mimeType: input.mimeType,
          sizeBytes: buffer.length,
          sha256,
        });
        return {
          id: mediaId,
          kind: policy.kind,
          mimeType: input.mimeType,
          sizeBytes: buffer.length,
          sha256,
          url: uploaded.url,
        };
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

  agreements: router({
    changeOrders: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        runAgreementOperation(() => db.listJobChangeOrders(input.requestId, ctx.user.id)),
      ),
    createChangeOrder: protectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          kind: z.enum(["scope", "schedule", "amount"]),
          description: z.string().trim().min(10).max(2_000),
          amountDelta: z.number().int().min(0).max(1_000_000).default(0),
          evidenceMediaIds: agreementEvidenceMediaIdsSchema.default([]),
        }),
      )
      .mutation(({ ctx, input }) =>
        runAgreementOperation(() => db.createJobChangeOrder({ ...input, userId: ctx.user.id })),
      ),
    respondToChangeOrder: protectedProcedure
      .input(
        z.object({
          changeOrderId: z.number().int().positive(),
          decision: z.enum(["accepted", "rejected"]),
        }),
      )
      .mutation(({ ctx, input }) =>
        runAgreementOperation(() => db.respondToJobChangeOrder({ ...input, userId: ctx.user.id })),
      ),
    withdrawChangeOrder: protectedProcedure
      .input(z.object({ changeOrderId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        runAgreementOperation(() => db.withdrawJobChangeOrder(input.changeOrderId, ctx.user.id)),
      ),
    expenses: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        runAgreementOperation(() => db.listJobExpensesForParticipant(input.requestId, ctx.user.id)),
      ),
    createExpense: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        category: z.enum(["fuel", "toll", "parking", "material", "part", "paint", "equipment", "transport", "packaging", "other"]),
        amount: z.number().int().positive().max(1_000_000),
        description: z.string().trim().min(3).max(2_000),
        purchasedAt: z.coerce.date(),
        vendorName: z.string().trim().max(191).optional(),
        brand: z.string().trim().max(120).optional(),
        model: z.string().trim().max(120).optional(),
        quantity: z.number().int().positive().max(100_000).optional(),
        locationUrl: z.string().url().max(500).optional(),
        mediaIds: z.array(z.number().int().positive()).max(8).superRefine((items, ctx) => {
          if (new Set(items).size !== items.length) ctx.addIssue({ code: "custom", message: "Tekrarlayan medya kaydı gönderilemez" });
        }).default([]),
      }))
      .mutation(({ ctx, input }) =>
        runAgreementOperation(() => db.createJobExpense({ ...input, providerUserId: ctx.user.id })),
      ),
    submitExpenseRefund: protectedProcedure
      .input(z.object({
        expenseId: z.number().int().positive(),
        requestedAmount: z.number().int().positive().max(1_000_000),
        materialAssessmentJson: z.string().trim().min(2).max(8_000),
      }))
      .mutation(({ ctx, input }) =>
        runAgreementOperation(() => db.submitExpenseRefundRequest({ ...input, providerUserId: ctx.user.id })),
      ),
    cancellation: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        runAgreementOperation(() => db.getJobCancellation(input.requestId, ctx.user.id)),
      ),
    openCancellation: protectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          reasonCode: z.enum(["schedule", "provider_unavailable", "customer_changed_mind", "safety", "other"]),
          description: z.string().trim().min(10).max(2_000),
          evidenceMediaIds: agreementEvidenceMediaIdsSchema.default([]),
        }),
      )
      .mutation(({ ctx, input }) =>
        runAgreementOperation(() => db.openJobCancellation({ ...input, userId: ctx.user.id })),
      ),
    withdrawCancellation: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        runAgreementOperation(() => db.withdrawJobCancellation(input.requestId, ctx.user.id)),
      ),
  }),

  // Active job tracking — customer reads; only the assigned provider writes.
  tracking: router({
    get: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        runTrackingOperation(() => db.getJobTracking(input.requestId, ctx.user.id)),
      ),
    publishLocation: protectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          latitude: z.number().finite().min(-90).max(90),
          longitude: z.number().finite().min(-180).max(180),
          accuracyMeters: z.number().finite().min(0).max(10_000).optional(),
        }),
      )
      .mutation(({ ctx, input }) =>
        runTrackingOperation(() =>
          db.publishJobLocation({
            requestId: input.requestId,
            userId: ctx.user.id,
            latitude: input.latitude.toFixed(7),
            longitude: input.longitude.toFixed(7),
            accuracyMeters:
              input.accuracyMeters == null ? undefined : Math.round(input.accuracyMeters),
          }),
        ),
      ),
    updateLifecycle: protectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          status: z.enum([
            "scheduled",
            "on_the_way",
            "arrived",
            "in_progress",
            "completed",
            "cancelled",
          ]),
          etaMinutes: z.number().int().min(0).max(24 * 60).optional(),
        }),
      )
      .mutation(({ ctx, input }) =>
        runTrackingOperation(() => db.updateJobLifecycle({ ...input, userId: ctx.user.id })),
      ),
  }),

  // Completion proof — only the assigned provider can submit proof. The customer
  // may approve or dispute before the 48-hour response deadline.
  completion: router({
    workflow: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        runCompletionOperation(() => db.getCompletionWorkflow(input.requestId, ctx.user.id)),
      ),
    submitProof: protectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          summary: z.string().trim().min(10).max(2_000),
          media: z
            .array(
              z.object({
                originalName: z
                  .string()
                  .trim()
                  .min(1)
                  .max(255)
                  .regex(/^[^\\/\u0000-\u001f]+$/, "Geçersiz dosya adı"),
                mimeType: z.enum([
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                  "image/heic",
                  "image/heif",
                  "video/mp4",
                  "video/quicktime",
                ]),
                base64: z.string().min(4).max(36_000_000),
              }),
            )
            .min(1)
            .max(4),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const workflow = await runCompletionOperation(() =>
          db.getCompletionWorkflow(input.requestId, ctx.user.id),
        );
        if (!workflow.canProviderSubmitProof) {
          throw new TRPCError({ code: "CONFLICT", message: "Bu iş için kanıt gönderemezsiniz" });
        }
        let totalSize = 0;
        const prepared = input.media.map((item) => {
          const policy = allowedRequestMedia[item.mimeType];
          const buffer = decodeStrictBase64(item.base64);
          if (buffer.length > policy.maxBytes) {
            throw new TRPCError({
              code: "PAYLOAD_TOO_LARGE",
              message: policy.kind === "image" ? "Görsel en fazla 8 MB olabilir" : "Video en fazla 25 MB olabilir",
            });
          }
          if (!hasExpectedMediaSignature(buffer, item.mimeType)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Dosya içeriği medya türüyle uyuşmuyor" });
          }
          totalSize += buffer.length;
          return { item, policy, buffer, sha256: createHash("sha256").update(buffer).digest("hex") };
        });
        if (totalSize > 32 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Toplam kanıt dosyası boyutu en fazla 32 MB olabilir" });
        }
        const aiAnalysis = await analyzeCompletionEvidence({
          summary: input.summary,
          media: prepared.map(({ policy, buffer, item }) => ({
            buffer,
            kind: policy.kind,
            mimeType: item.mimeType,
          })),
        });
        const uploaded = await Promise.all(
          prepared.map(async ({ item, policy, buffer, sha256 }) => {
            const key = `completion-proofs/${input.requestId}/${ctx.user.id}/${randomUUID()}.${policy.extension}`;
            const stored = await storagePut(key, buffer, item.mimeType);
            return {
              storageKey: stored.key,
              originalName: item.originalName,
              mimeType: item.mimeType,
              sizeBytes: buffer.length,
              sha256,
              kind: policy.kind,
            };
          }),
        );
        return runCompletionOperation(() =>
          db.submitCompletionProof({
            requestId: input.requestId,
            userId: ctx.user.id,
            summary: input.summary,
            aiAnalysis,
            media: uploaded,
          }),
        );
      }),
    approve: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        runCompletionOperation(() => db.approveCompletionProof({ requestId: input.requestId, userId: ctx.user.id })),
      ),
    dispute: protectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          reasonCode: z.enum(["incomplete_work", "quality_issue", "damage", "wrong_service", "other"]),
          description: z.string().trim().min(10).max(2_000),
        }),
      )
      .mutation(({ ctx, input }) =>
        runCompletionOperation(() => db.openCompletionDispute({ ...input, userId: ctx.user.id })),
      ),
  }),

  // Service categories — shared by customer discovery and service request flows
  categories: router({
    list: publicProcedure.query(() => db.getActiveServiceCategories()),
    subcategories: publicProcedure
      .input(z.object({ categoryId: z.number().int().positive().optional() }).optional())
      .query(({ input }) => db.getActiveServiceSubcategories(input?.categoryId)),
    bySlug: publicProcedure
      .input(z.object({ slug: z.string().trim().min(1).max(100) }))
      .query(({ input }) => db.getServiceCategoryBySlug(input.slug)),
  }),

  // Messages
  messages: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getMessageConversations(ctx.user.id);
    }),
    participant: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        otherUserId: z.number().int().positive(),
      }))
      .query(async ({ ctx, input }) => {
        const participant = await runMessageOperation(() =>
          db.getMessageParticipant(input.requestId, ctx.user.id, input.otherUserId),
        );
        if (!participant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Mesaj katılımcısı bulunamadı" });
        }
        return participant;
      }),
    conversation: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        otherUserId: z.number().int().positive(),
      }))
      .query(async ({ ctx, input }) => {
        const conversation = await runMessageOperation(() =>
          db.getConversation(input.requestId, ctx.user.id, input.otherUserId),
        );
        return conversation.map((message) => ({
          ...message,
          isOwn: message.senderId === ctx.user.id,
        }));
      }),
    send: protectedProcedure
      .input(z.object({
        receiverId: z.number().int().positive(),
        content: z.string().trim().min(1).max(4000),
        requestId: z.number().int().positive(),
      }))
      .mutation(({ ctx, input }) =>
        runMessageOperation(() => db.sendMessage({ ...input, senderId: ctx.user.id })),
      ),
    sendVoice: protectedProcedure
      .input(z.object({
        receiverId: z.number().int().positive(),
        requestId: z.number().int().positive(),
        mimeType: voiceMimeTypeSchema,
        durationMs: z.number().int().min(250).max(5 * 60 * 1000),
        base64: z.string().min(4).max(14_000_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = decodeStrictBase64(input.base64);
        if (buffer.length > 10 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Sesli mesaj en fazla 10 MB olabilir" });
        }
        if (!hasExpectedVoiceSignature(buffer, input.mimeType)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ses dosyası türü doğrulanamadı" });
        }
        await runMessageOperation(() =>
          db.validateMessageParticipant(input.requestId, ctx.user.id, input.receiverId),
        );
        const extension = input.mimeType === "audio/mpeg" ? "mp3" : input.mimeType === "audio/ogg" ? "ogg" : input.mimeType === "audio/webm" ? "webm" : input.mimeType === "audio/wav" ? "wav" : "m4a";
        const uploaded = await storagePut(
          `messages/${input.requestId}/${ctx.user.id}/${randomUUID()}.${extension}`,
          buffer,
          input.mimeType,
        );
        const id = await runMessageOperation(() =>
          db.createVoiceMessageMetadata({
            senderId: ctx.user.id,
            receiverId: input.receiverId,
            requestId: input.requestId,
            storageKey: uploaded.key,
            mediaUrl: uploaded.url,
            mimeType: input.mimeType,
            sizeBytes: buffer.length,
            durationMs: input.durationMs,
            sha256: createHash("sha256").update(buffer).digest("hex"),
          }),
        );
        return { id, kind: "audio" as const, durationMs: input.durationMs };
      }),
    markRead: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        otherUserId: z.number().int().positive(),
      }))
      .mutation(({ ctx, input }) =>
        runMessageOperation(() =>
          db.markConversationRead(input.requestId, ctx.user.id, input.otherUserId),
        ),
      ),
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
    updateAvailability: protectedProcedure
      .input(z.object({ isAvailable: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.updateProviderAvailability(ctx.user.id, input.isAvailable);
        } catch (error) {
          if (error instanceof Error && error.message === "PROVIDER_NOT_FOUND") {
            throw new TRPCError({ code: "NOT_FOUND", message: "Profesyonel profili bulunamadı" });
          }
          throw error;
        }
      }),
    uploadDocument: protectedProcedure
      .input(z.object({
        type: providerDocumentTypeSchema,
        fileName: z.string().trim().min(1).max(255).regex(/^[^\\/\u0000-\u001f]+$/, "Geçersiz dosya adı"),
        mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
        base64: z.string().min(4).max(14_000_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const provider = await db.getProviderProfile(ctx.user.id);
        if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Bu işlem yalnız profesyonel hesaplara açıktır" });
        const buffer = decodeStrictBase64(input.base64);
        if (buffer.length > 10 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Belge en fazla 10 MB olabilir" });
        }
        if (!hasExpectedProviderDocumentSignature(buffer, input.mimeType)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Belge içeriği seçilen dosya türüyle uyuşmuyor" });
        }
        const extension = input.mimeType === "application/pdf" ? "pdf" : input.mimeType.split("/")[1];
        const uploaded = await storagePut(
          `provider-documents/${provider.id}/${input.type}/${randomUUID()}.${extension}`,
          buffer,
          input.mimeType,
        );
        const id = await db.createProviderDocument({
          providerId: provider.id,
          ownerUserId: ctx.user.id,
          type: input.type,
          storageKey: uploaded.key,
          fileUrl: uploaded.url,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: buffer.length,
          sha256: createHash("sha256").update(buffer).digest("hex"),
        });
        const verificationStatus = await db.refreshProviderVerificationStatus(provider.id);
        return { id, status: "pending" as const, verificationStatus };
      }),
    getDocuments: protectedProcedure.query(async ({ ctx }) => {
      const provider = await db.getProviderProfile(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Bu işlem yalnız profesyonel hesaplara açıktır" });
      return db.getProviderDocuments(provider.id);
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
          return await db.approveCompletionProofForPayment({
            paymentId: input.paymentId,
            userId: ctx.user.id,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "PAYMENT_RELEASE_FAILED";
          if (message === "PAYMENT_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Ödeme bulunamadı" });
          if (message === "PAYMENT_FORBIDDEN") throw new TRPCError({ code: "FORBIDDEN", message: "Bu ödemeyi serbest bırakma yetkiniz yok" });
          if (message.startsWith("COMPLETION_") || message === "ESCROW_NOT_HELD") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Ödeme yalnızca teslim kanıtı ve müşteri onayı sonrasında serbest bırakılabilir",
            });
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

  admin: router({
    configureCompletionAutoRelease: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Bu işlem yönetici yetkisi gerektirir" });
      }
      if (!ENV.completionAutoReleaseSecret) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Otomatik emanet serbest bırakma sırrı yapılandırılmadı",
        });
      }

      const name = "movefix-completion-auto-release";
      const job = {
        cron: "0 15 * * * *",
        path: "/api/scheduled/completion-auto-release",
        method: "POST" as const,
        payload: { token: ENV.completionAutoReleaseSecret, limit: 25 },
        description: "Move&Fix 48 saatlik iş kanıtı yanıt süresi dolan emanetleri idempotent olarak çözer.",
      };
      const existing = await listHeartbeatJobs("", { page: 1, pageSize: 100 });
      const prior = existing.jobs.find((item) => item.name === name);
      if (prior) {
        const updated = await updateHeartbeatJob(prior.taskUid, { ...job, enable: true }, "");
        return { taskUid: prior.taskUid, updated: true, nextExecutionAt: updated.nextExecutionAt ?? null };
      }
      const created = await createHeartbeatJob({ name, ...job }, "");
      return { taskUid: created.taskUid, updated: false, nextExecutionAt: created.nextExecutionAt ?? null };
    }),
    reviewProviderDocument: protectedProcedure
      .input(z.object({
        documentId: z.number().int().positive(),
        status: z.enum(["approved", "rejected"]),
        reviewNote: z.string().trim().max(500).optional(),
      }).superRefine((input, issue) => {
        if (input.status === "rejected" && !input.reviewNote) {
          issue.addIssue({
            code: "custom",
            path: ["reviewNote"],
            message: "Red gerekçesi zorunludur",
          });
        }
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Bu işlem yönetici yetkisi gerektirir" });
        }
        const document = await db.getProviderDocumentById(input.documentId);
        if (!document) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Profesyonel belgesi bulunamadı" });
        }
        await db.updateProviderDocumentStatus({
          id: document.id,
          status: input.status,
          reviewNote: input.reviewNote,
          reviewedByUserId: ctx.user.id,
        });
        const verificationStatus = await db.refreshProviderVerificationStatus(document.providerId);
        return { id: document.id, status: input.status, verificationStatus };
      }),
    resolveCompletionDispute: protectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          resolution: z.enum(["customer", "provider"]),
          resolutionNote: z.string().trim().min(10).max(2_000),
        }),
      )
      .mutation(({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Bu işlem yönetici yetkisi gerektirir" });
        }
        return runCompletionOperation(() =>
          db.resolveCompletionDispute({
            ...input,
            adminUserId: ctx.user.id,
          }),
        );
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
        bankAccountId: z.string().trim().regex(/^TR\d{24}$/, "TR ile başlayan 26 karakterli geçerli bir IBAN girin"),
        idempotencyKey: z.string().trim().min(16).max(96),
        reauthPassword: z.string().min(1).max(128),
        reauthCode: verificationCodeSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        const provider = await db.getProviderProfile(ctx.user.id);
        if (!provider) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Para çekme yalnızca profesyonel hesaplara açıktır" });
        }
        // A withdrawal is a high-risk action. OAuth-only users must first add a
        // local credential instead of receiving a weaker, silently bypassable flow.
        const local = ctx.user.email ? await db.getUserByEmailNormalized(ctx.user.email) : null;
        if (!local || local.user.id !== ctx.user.id || !verifyPassword(input.reauthPassword, local.credential.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Para çekme için parolanızı yeniden doğrulayın" });
        }
        const codeHash = hashVerificationCode(ctx.user.id, "sensitive_transaction", input.reauthCode);
        const validChallenge = await db.getActiveAuthChallenge({
          userId: ctx.user.id,
          purpose: "sensitive_transaction",
          codeHash,
        });
        if (!validChallenge) {
          const activeChallenge = await db.getLatestActiveAuthChallenge({ userId: ctx.user.id, purpose: "sensitive_transaction" });
          if (activeChallenge) await db.incrementAuthChallengeAttempts(activeChallenge.id);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Para çekme güvenlik kodu geçersiz veya süresi dolmuş" });
        }
        await db.markAuthChallengeUsed(validChallenge.id);
        try {
          const { reauthPassword: _reauthPassword, reauthCode: _reauthCode, ...request } = input;
          return await db.requestWalletWithdrawal({ ...request, userId: ctx.user.id });
        } catch (error) {
          if (error instanceof db.WalletWithdrawalError) {
            const code = error.reason === "INVALID_IBAN" ? "BAD_REQUEST" : "FORBIDDEN";
            throw new TRPCError({ code, message: error.message });
          }
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
