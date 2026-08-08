import type { StripeAppProviderProps, StripePaymentSheetController } from "./stripe-sdk.types";

export function StripeAppProvider({ children }: StripeAppProviderProps) {
  return children;
}

export function useStripePaymentSheet(): StripePaymentSheetController {
  const unsupported = async () => ({
    error: {
      code: "UNSUPPORTED_PLATFORM",
      message: "Stripe PaymentSheet web önizlemede desteklenmiyor.",
    },
  });

  return {
    initPaymentSheet: unsupported,
    presentPaymentSheet: unsupported,
  };
}
