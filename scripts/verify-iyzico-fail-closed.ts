import { GatewayCheckoutError, GatewayCheckoutService } from "../server/payments/GatewayCheckoutService";

type Mode = "missing" | "invalid";

const mode = process.argv[2] as Mode;
if (mode !== "missing" && mode !== "invalid") {
  console.log("IYZICO_FAIL_CLOSED_USAGE_ERROR");
  process.exitCode = 1;
} else {
  const service = new GatewayCheckoutService({
    callbackBaseUrl: "https://example.com",
    ...(mode === "missing"
      ? { iyzicoApiKey: "", iyzicoSecretKey: "" }
      : {
          iyzicoApiKey: "invalid-api-key-for-fail-closed-verification",
          iyzicoSecretKey: "invalid-secret-key-for-fail-closed-verification",
        }),
  });

  const input = {
    provider: "iyzico" as const,
    paymentId: mode === "missing" ? 900000002 : 900000003,
    requestId: mode === "missing" ? 900000002 : 900000003,
    requestTitle: "Move&Fix iyzico fail-closed doğrulaması",
    amount: 1,
    currency: "TRY" as const,
    idempotencyKey: `fail-closed-${mode}`,
    buyer: {
      id: mode === "missing" ? 900000002 : 900000003,
      name: "Higher Faster",
      email: "stronger@example.com",
      gsmNumber: "+905555434332",
      identityNumber: "74300864791",
      address: "Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1",
      city: "Istanbul",
      zipCode: "34000",
      ipAddress: "85.34.78.112",
    },
  };

  void service
    .initialize(input)
    .then(() => {
      console.log("IYZICO_FAIL_CLOSED_UNEXPECTED_SUCCESS");
      process.exitCode = 1;
    })
    .catch((error: unknown) => {
      const expectedCode = mode === "missing" ? "GATEWAY_NOT_CONFIGURED" : "GATEWAY_REJECTED";
      if (error instanceof GatewayCheckoutError && error.code === expectedCode) {
        console.log(`IYZICO_FAIL_CLOSED_${mode.toUpperCase()}_PASS`);
        return;
      }
      console.log(`IYZICO_FAIL_CLOSED_${mode.toUpperCase()}_FAIL`);
      process.exitCode = 1;
    });
}
