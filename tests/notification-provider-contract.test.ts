import { describe, expect, it, vi } from "vitest";

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

import {
  NotificationChannel,
  NotificationServiceV2,
} from "../server/services/NotificationServiceV2";

describe("OTP sağlayıcı yapılandırma sözleşmesi", () => {
  it("SendGrid credential'ı olmadan e-posta OTP teslimatını başarısız açık blocker ile kapatır", async () => {
    const result = await new NotificationServiceV2().sendVerificationCode({
      channel: NotificationChannel.EMAIL,
      destination: "customer@example.test",
      code: "123456",
      purpose: "verify_email",
    });

    expect(result).toEqual({
      deliveryStatus: "blocked",
      blocker: "EMAIL_VERIFICATION_PROVIDER_REQUIRED",
    });
  });

  it("Twilio credential'ı olmadan SMS OTP teslimatını başarısız açık blocker ile kapatır", async () => {
    const result = await new NotificationServiceV2().sendVerificationCode({
      channel: NotificationChannel.SMS,
      destination: "+905555555555",
      code: "123456",
      purpose: "verify_phone",
    });

    expect(result).toEqual({
      deliveryStatus: "blocked",
      blocker: "SMS_VERIFICATION_PROVIDER_REQUIRED",
    });
  });
});
