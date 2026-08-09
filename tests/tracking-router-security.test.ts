import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  getJobTracking: vi.fn(),
  publishJobLocation: vi.fn(),
  updateJobLifecycle: vi.fn(),
}));

import * as trackingDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 55): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `tracking-user-${id}`,
    email: `tracking-${id}@example.com`,
    name: "Tracking Test User",
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

describe("tracking router security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives tracking read identity only from the authenticated session", async () => {
    vi.mocked(trackingDb.getJobTracking).mockResolvedValue({
      requestId: 42,
      viewerRole: "customer",
      lifecycleStatus: "scheduled",
    } as Awaited<ReturnType<typeof trackingDb.getJobTracking>>);
    const caller = appRouter.createCaller(createContext(73));

    await expect(caller.tracking.get({ requestId: 42 })).resolves.toMatchObject({ requestId: 42 });
    expect(trackingDb.getJobTracking).toHaveBeenCalledWith(42, 73);
  });

  it("normalizes provider location and derives writer identity from the session", async () => {
    vi.mocked(trackingDb.publishJobLocation).mockResolvedValue({
      success: true,
      requestId: 42,
      lastLocationAt: new Date("2026-08-09T07:00:00.000Z"),
    });
    const caller = appRouter.createCaller(createContext(81));

    await caller.tracking.publishLocation({
      requestId: 42,
      latitude: 41.0082371,
      longitude: 28.9783589,
      accuracyMeters: 12.6,
    });

    expect(trackingDb.publishJobLocation).toHaveBeenCalledWith({
      requestId: 42,
      userId: 81,
      latitude: "41.0082371",
      longitude: "28.9783589",
      accuracyMeters: 13,
    });
  });

  it("rejects unauthenticated tracking access before database operations", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });

    await expect(caller.tracking.get({ requestId: 42 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.tracking.publishLocation({ requestId: 42, latitude: 41, longitude: 29 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.tracking.updateLifecycle({ requestId: 42, status: "on_the_way" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(trackingDb.getJobTracking).not.toHaveBeenCalled();
    expect(trackingDb.publishJobLocation).not.toHaveBeenCalled();
    expect(trackingDb.updateJobLifecycle).not.toHaveBeenCalled();
  });

  it("rejects invalid identifiers, coordinates and ETA before database access", async () => {
    const caller = appRouter.createCaller(createContext(81));

    await expect(caller.tracking.get({ requestId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.tracking.publishLocation({ requestId: 42, latitude: 90.1, longitude: 29 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.tracking.publishLocation({ requestId: 42, latitude: 41, longitude: 180.1 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.tracking.updateLifecycle({ requestId: 42, status: "on_the_way", etaMinutes: 1441 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(trackingDb.getJobTracking).not.toHaveBeenCalled();
    expect(trackingDb.publishJobLocation).not.toHaveBeenCalled();
    expect(trackingDb.updateJobLifecycle).not.toHaveBeenCalled();
  });

  it("maps unauthorized writes and invalid transitions to fail-closed tRPC errors", async () => {
    vi.mocked(trackingDb.publishJobLocation).mockRejectedValue(
      new Error("Only the assigned provider can publish job location"),
    );
    vi.mocked(trackingDb.updateJobLifecycle).mockRejectedValue(
      new Error("Invalid job lifecycle transition: scheduled -> completed"),
    );
    const caller = appRouter.createCaller(createContext(81));

    await expect(
      caller.tracking.publishLocation({ requestId: 42, latitude: 41, longitude: 29 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.tracking.updateLifecycle({ requestId: 42, status: "completed" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
