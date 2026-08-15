import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
}));

vi.mock("../server/services/NotificationService", () => ({
  NotificationType: {
    ORDER_CREATED: "order_created",
    ORDER_ACCEPTED: "order_accepted",
    ORDER_COMPLETED: "order_completed",
    ORDER_CANCELLED: "order_cancelled",
    PAYMENT_RECEIVED: "payment_received",
    PAYMENT_FAILED: "payment_failed",
    PROVIDER_NEARBY: "provider_nearby",
    MESSAGE_RECEIVED: "message_received",
    REVIEW_REQUESTED: "review_requested",
    PROMOTION: "promotion",
    SYSTEM_ALERT: "system_alert",
  },
  notificationService: {
    getUserPreferences: mocks.getUserPreferences,
    updateUserPreferences: mocks.updateUserPreferences,
  },
}));

import { appRouter } from "../server/routers";

function createContext(authenticated = true) {
  return {
    user: authenticated
      ? { id: 97, openId: "notification-user-97", email: "notification@movefix.test", name: "Notification User", role: "user" }
      : null,
    req: { protocol: "https", hostname: "localhost", headers: {} },
    res: {},
  } as never;
}

describe("bildirim tercihleri router sözleşmesi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserPreferences.mockResolvedValue({ userId: "97", channels: {}, notificationTypes: {} });
    mocks.updateUserPreferences.mockResolvedValue({ userId: "97", channels: {}, notificationTypes: {} });
  });

  it("oturumsuz isteklerde tercih geçmişi veya değişikliği yapmaz", async () => {
    const caller = appRouter.createCaller(createContext(false));

    await expect(caller.notifications.preferences()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.notifications.updatePreferences({ channels: { push: { enabled: false } } })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.getUserPreferences).not.toHaveBeenCalled();
    expect(mocks.updateUserPreferences).not.toHaveBeenCalled();
  });

  it("tercihleri yalnız oturum sahibinin kimliğiyle okur ve tek kanal güncellemesini kabul eder", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.notifications.preferences()).resolves.toMatchObject({ userId: "97" });
    await expect(caller.notifications.updatePreferences({ channels: { push: { enabled: false } } })).resolves.toMatchObject({ userId: "97" });

    expect(mocks.getUserPreferences).toHaveBeenCalledWith("97");
    expect(mocks.updateUserPreferences).toHaveBeenCalledWith("97", { channels: { push: { enabled: false } } });
  });

  it("boş tercih güncellemesini fail-closed reddeder", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.notifications.updatePreferences({})).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateUserPreferences).not.toHaveBeenCalled();
  });
});
