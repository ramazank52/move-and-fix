import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { AppError } from "./errors";
import { hasActiveSuperAdminRole, hasValidAdminMfaGrant } from "../db";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

function toTRPCCode(statusCode: number) {
  switch (statusCode) {
    case 400:
    case 402:
      return "BAD_REQUEST" as const;
    case 401:
      return "UNAUTHORIZED" as const;
    case 403:
      return "FORBIDDEN" as const;
    case 404:
      return "NOT_FOUND" as const;
    case 409:
      return "CONFLICT" as const;
    case 429:
      return "TOO_MANY_REQUESTS" as const;
    case 502:
      return "BAD_GATEWAY" as const;
    default:
      return "INTERNAL_SERVER_ERROR" as const;
  }
}

const mapAppErrors = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw new TRPCError({
        code: toTRPCCode(error.statusCode),
        message: error.message,
        cause: error,
      });
    }

    throw error;
  }
});

export const publicProcedure = t.procedure.use(mapAppErrors);

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(mapAppErrors).use(requireUser);

export const adminProcedure = t.procedure.use(mapAppErrors).use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/** Applies to data-changing and sensitive MoveOS operations after base admin authorization. */
export const adminMfaProcedure = adminProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user || !ctx.sessionFingerprint) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "MoveOS için bu oturumda ikinci faktör doğrulaması gerekli" });
    }
    const granted = await hasValidAdminMfaGrant({ userId: ctx.user.id, sessionFingerprint: ctx.sessionFingerprint });
    if (!granted) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "MoveOS için ikinci faktör doğrulaması gerekli" });
    }
    return next({ ctx });
  }),
);

/** Highest-privilege MoveOS operations require both an MFA grant and an active, database-backed scope. */
export const superAdminMfaProcedure = adminMfaProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user || !(await hasActiveSuperAdminRole(ctx.user.id))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Bu MoveOS işlemi için Super Admin yetkisi gerekli" });
    }
    return next({ ctx });
  }),
);
