import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { createHash } from "crypto";
import type { User } from "../../drizzle/schema";
import { getLocalAuthSessionByTokenHash, touchLocalAuthSession } from "../db";
import { COOKIE_NAME } from "../../shared/const";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  localSessionId?: string | null;
  sessionFingerprint?: string | null;
};

function getSessionToken(req: CreateExpressContextOptions["req"]) {
  const authorization = req.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const encodedName = `${COOKIE_NAME}=`;
  const value = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(encodedName));
  return value ? decodeURIComponent(value.slice(encodedName.length)) : null;
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  let localSessionId: string | null = null;
  let sessionFingerprint: string | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    const sessionToken = getSessionToken(opts.req);
    if (user && sessionToken) {
      const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
      sessionFingerprint = tokenHash;
      const localSession = await getLocalAuthSessionByTokenHash(tokenHash);
      if (localSession) {
        const valid =
          localSession.userId === user.id &&
          localSession.revokedAt === null &&
          localSession.expiresAt.getTime() > Date.now();
        if (!valid) {
          user = null;
        } else {
          localSessionId = localSession.id;
          void touchLocalAuthSession(localSession.id);
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    localSessionId,
    sessionFingerprint,
  };
}
