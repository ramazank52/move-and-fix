import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("../server/_core/env", () => ({
  ENV: {
    sendgridApiKey: "",
    verificationEmailFrom: "",
    netgsmUsername: "",
    netgsmPassword: "",
    netgsmMsgHeader: "",
    twilioAccountSid: "AC_test",
    twilioAuthToken: "token",
    twilioFromNumber: "+905551112233",
  },
}));

vi.mock("../server/db", () => ({
  getMarketingConsentPreference: vi.fn(),
  getUserById: vi.fn(async () => ({ id: 7, phone: "0555 555 55 55", email: null })),
  setMarketingConsentPreference: vi.fn(),
}));

vi.mock("../server/notifications/push-store", () => ({
  deactivatePushToken: vi.fn(),
  getActivePushTokens: vi.fn(),
  getStoredNotificationPreferences: vi.fn(),
  listInAppNotifications: vi.fn(),
  markInAppNotificationRead: vi.fn(),
  saveNotificationPreferences: vi.fn(),
  saveInAppNotification: vi.fn(),
}));

import { NotificationService, NotificationType } from "../server/services/NotificationService";

describe("P35 Twilio SMS recipient contract", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("normalizes valid national input and submits the verified recipient in E.164", async () => {
    const service = new NotificationService();
    await (service as unknown as { sendSMS: (userId: string, message: unknown) => Promise<void> }).sendSMS("7", {
      title: "Move&Fix",
      body: "Test",
      type: NotificationType.SYSTEM_ALERT,
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(String(request.body)).toContain("To=%2B905555555555");
    expect(String(request.body)).not.toContain("0555+555+55+55");
  });
});
