import { GatewayCheckoutError, GatewayCheckoutService } from "../server/payments/GatewayCheckoutService";

const service = new GatewayCheckoutService({
  // Bu deneme yalnız checkout başlangıcını doğrular; tahsilat, kart bilgisi veya veritabanı kaydı oluşturmaz.
  callbackBaseUrl: "https://example.com",
});

async function verifyIyzicoSandbox() {
  try {
    const result = await service.initialize({
    provider: "iyzico",
    paymentId: 900000001,
    requestId: 900000001,
    requestTitle: "Move&Fix iyzico sandbox credential doğrulaması",
    amount: 1,
    currency: "TRY",
    idempotencyKey: "credential-verification-only",
    buyer: {
      id: 900000001,
      name: "Higher Faster",
      email: "stronger@example.com",
      gsmNumber: "+905555434332",
      identityNumber: "74300864791",
      address: "Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1",
      city: "Istanbul",
      zipCode: "34000",
      ipAddress: "85.34.78.112",
    },
    });

    if (!result.checkoutToken || !result.paymentPageUrl) {
      throw new Error("IYZICO_SANDBOX_INIT_INCOMPLETE");
    }
    console.log("IYZICO_SANDBOX_INIT_SUCCESS");
  } catch (error) {
    if (error instanceof GatewayCheckoutError) {
      const normalizedMessage = error.message.toLocaleLowerCase("tr-TR");
      const credentialRejected =
        normalizedMessage.includes("api key") ||
        normalizedMessage.includes("secret key") ||
        normalizedMessage.includes("credential") ||
        normalizedMessage.includes("authentication");
      const requestRejected =
        normalizedMessage.includes("identity") ||
        normalizedMessage.includes("kimlik") ||
        normalizedMessage.includes("gsm") ||
        normalizedMessage.includes("telefon") ||
        normalizedMessage.includes("buyer") ||
        normalizedMessage.includes("address") ||
        normalizedMessage.includes("adres") ||
        normalizedMessage.includes("email") ||
        normalizedMessage.includes("ip address");
      console.log(
        credentialRejected
          ? "IYZICO_SANDBOX_INIT_CREDENTIAL_REJECTED"
          : requestRejected
            ? "IYZICO_SANDBOX_INIT_PROVIDER_VALIDATED_REQUEST_REJECTED"
          : `IYZICO_SANDBOX_INIT_${error.code}`,
      );
      process.exitCode = 1;
    } else {
      console.log("IYZICO_SANDBOX_INIT_UNEXPECTED_FAILURE");
      process.exitCode = 1;
    }
  }
}

void verifyIyzicoSandbox();
