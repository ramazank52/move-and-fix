import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { AppError } from "./errors";

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
