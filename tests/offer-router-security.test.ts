import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  acceptOffer: vi.fn(),
  rejectOffer: vi.fn(),
}));

import * as offerDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 55): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `offer-user-${id}`,
    email: `offer-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "Offer Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("offer router security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives accept and reject ownership from the authenticated session", async () => {
    vi.mocked(offerDb.acceptOffer).mockResolvedValue({ success: true, offerId: 91, requestId: 12 });
    vi.mocked(offerDb.rejectOffer).mockResolvedValue({ success: true, offerId: 92, requestId: 12 });
    const caller = appRouter.createCaller(createContext(73));

    await expect(caller.offers.accept({ offerId: 91 })).resolves.toEqual({ success: true, offerId: 91, requestId: 12 });
    await expect(caller.offers.reject({ offerId: 92 })).resolves.toEqual({ success: true, offerId: 92, requestId: 12 });

    expect(offerDb.acceptOffer).toHaveBeenCalledWith(91, 73);
    expect(offerDb.rejectOffer).toHaveBeenCalledWith(92, 73);
  });

  it("rejects unauthenticated offer mutations before database access", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });

    await expect(caller.offers.accept({ offerId: 91 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.offers.reject({ offerId: 92 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(offerDb.acceptOffer).not.toHaveBeenCalled();
    expect(offerDb.rejectOffer).not.toHaveBeenCalled();
  });

  it("rejects non-positive and non-integer offer identifiers before database access", async () => {
    const caller = appRouter.createCaller(createContext(73));

    await expect(caller.offers.accept({ offerId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.offers.reject({ offerId: 1.5 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(offerDb.acceptOffer).not.toHaveBeenCalled();
    expect(offerDb.rejectOffer).not.toHaveBeenCalled();
  });
});
