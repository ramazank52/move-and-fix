import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  recordConsentEvents: vi.fn(),
  getActivePushTokens: vi.fn(),
  deactivatePushToken: vi.fn(),
  getStoredNotificationPreferences: vi.fn(),
  saveNotificationPreferences: vi.fn(),
  saveInAppNotification: vi.fn(),
}));

vi.mock("../server/_core/env", () => ({
  ENV: {
    sendgridApiKey: "",
    verificationEmailFrom: "",
    netgsmUsername: "",
    netgsmPassword: "",
    netgsmMsgHeader: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioFromNumber: "",
  },
}));

vi.mock("../server/db", () => ({ getUserById: mocks.getUserById, recordConsentEvents: mocks.recordConsentEvents }));
vi.mock("../server/notifications/push-store", () => ({
  getActivePushTokens: mocks.getActivePushTokens,
  deactivatePushToken: mocks.deactivatePushToken,
  getStoredNotificationPreferences: mocks.getStoredNotificationPreferences,
  saveNotificationPreferences: mocks.saveNotificationPreferences,
  saveInAppNotification: mocks.saveInAppNotification,
}));

import { NotificationService, NotificationType } from "../server/services/NotificationService";

describe("çok kanallı bildirim teslimatı sözleşmesi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getUserById.mockResolvedValue({ id: 7, email: "customer@example.test", phone: "+905555555555" });
    mocks.getActivePushTokens.mockResolvedValue([{ token: "ExponentPushToken[test-token]" }]);
    mocks.getStoredNotificationPreferences.mockResolvedValue(null);
    mocks.saveNotificationPreferences.mockResolvedValue(undefined);
    mocks.recordConsentEvents.mockResolvedValue(undefined);
    mocks.saveInAppNotification.mockResolvedValue(1);
  });

  it("Expo kabulü ve uygulama içi kayıt varken credential'sız e-postayı teslim edildi diye saymaz", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: "ok" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new NotificationService().sendNotification("7", NotificationType.ORDER_COMPLETED, {
      providerName: "Deneme Usta",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://exp.host/--/api/v2/push/send");
    expect(mocks.saveInAppNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      type: NotificationType.ORDER_COMPLETED,
    }));
    expect(result.status).toBe("sent");
  });

  it("tüm canlı kanallar yapılandırılmamışsa bildirimi başarısız durumunda döndürür", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mocks.getActivePushTokens.mockResolvedValue([]);

    const result = await new NotificationService().sendNotification("7", NotificationType.PAYMENT_RECEIVED, {
      amount: "100",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.status).toBe("failed");
  });

  it("pazarlama bildirimi tercihini immutable opt-in/out kanıtı olmadan güncellemez", async () => {
    await new NotificationService().updateUserPreferences("7", {
      notificationTypes: { [NotificationType.PROMOTION]: { enabled: true } },
    });

    expect(mocks.recordConsentEvents).toHaveBeenCalledWith([expect.objectContaining({
      userId: 7,
      consentKey: "marketing_notifications",
      purpose: "marketing",
      action: "granted",
      source: "notification_preferences",
    })]);
    expect(mocks.saveNotificationPreferences).toHaveBeenCalledTimes(1);
  });
});
