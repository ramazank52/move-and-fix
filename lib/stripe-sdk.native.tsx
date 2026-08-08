import { StripeProvider, useStripe } from "@stripe/stripe-react-native";

import type {
  PaymentSheetSetupParams,
  StripeAppProviderProps,
  StripePaymentSheetController,
} from "./stripe-sdk.types";

const PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "pk_test_placeholder";

export function StripeAppProvider({ children }: StripeAppProviderProps) {
  return (
    <StripeProvider
      publishableKey={PUBLISHABLE_KEY}
      merchantIdentifier="merchant.space.manus.moveandfix"
      urlScheme="moveandfix"
    >
      {children}
    </StripeProvider>
  );
}

export function useStripePaymentSheet(): StripePaymentSheetController {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  return {
    initPaymentSheet: (params: PaymentSheetSetupParams) => initPaymentSheet(params),
    presentPaymentSheet,
  };
}
