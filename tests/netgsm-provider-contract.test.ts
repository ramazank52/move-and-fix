import { beforeEach, describe, expect, it, vi } from "vitest";

const { env } = vi.hoisted(() => ({ env: {
  sendgridApiKey: "",
  verificationEmailFrom: "",
  netgsmUsername: "netgsm-user",
  netgsmPassword: "netgsm-password",
  netgsmMsgHeader: "MOVEFIX",
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioFromNumber: "",
} }));

vi.mock("../server/_core/env", () => ({ ENV: env }));

import { NotificationChannel, NotificationServiceV2 } from "../server/services/NotificationServiceV2";

describe("NetGSM OTP sağlayıcı sözleşmesi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("NetGSM kabul yanıtında Türkçe numarayı normalize ederek teslim edildi döner", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "00", jobid: "job-1", description: "queued" }), { status: 200 }),
    );

    const result = await new NotificationServiceV2().sendVerificationCode({
      channel: NotificationChannel.SMS,
      destination: "+90 (555) 555 55 55",
      code: "123456",
      purpose: "verify_phone",
    });

    expect(result).toEqual({ deliveryStatus: "delivered" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.netgsm.com.tr/sms/rest/v2/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: expect.stringMatching(/^Basic /) }),
        body: expect.stringContaining('"no":"5555555555"'),
      }),
    );
  });

  it("sağlayıcı başarı kodu dönmezse teslimatı başarı saymaz", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "30", description: "authentication failed" }), { status: 401 }),
    );

    await expect(
      new NotificationServiceV2().sendVerificationCode({
        channel: NotificationChannel.SMS,
        destination: "5555555555",
        code: "123456",
        purpose: "verify_phone",
      }),
    ).rejects.toThrow("Doğrulama SMS’i teslimat için kabul edilmedi");
  });

  it("Türkiye mobil numarası olmayan alıcıyı sağlayıcıya hiç göndermeden kapatır", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await new NotificationServiceV2().sendVerificationCode({
      channel: NotificationChannel.SMS,
      destination: "+442071838750",
      code: "123456",
      purpose: "verify_phone",
    });

    expect(result).toEqual({ deliveryStatus: "blocked", blocker: "NETGSM_RECIPIENT_INVALID" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
