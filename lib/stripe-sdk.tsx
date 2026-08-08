import type { StripeAppProviderProps, StripePaymentSheetController } from "./stripe-sdk.types";

export function StripeAppProvider({ children }: StripeAppProviderProps) {
  return children;
}

export function useStripePaymentSheet(): StripePaymentSheetController {
  const unsupported = async () => ({
    error: {
      code: "UNSUPPORTED_PLATFORM",
      message: "Stripe PaymentSheet bu platformda desteklenmiyor.",
    },
  });

  return {
    initPaymentSheet: unsupported,
    presentPaymentSheet: unsupported,
  };
}
