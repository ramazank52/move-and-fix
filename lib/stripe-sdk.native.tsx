import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  PaymentSheetSetupParams,
  StripeAppProviderProps,
  StripePaymentSheetController,
} from "./stripe-sdk.types";

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
// Must match app.config.ts. Apple Pay merchant registration is intentionally
// not simulated when Stripe credentials or Apple merchant provisioning are absent.
const STRIPE_MERCHANT_IDENTIFIER = "merchant.com.moveandfix";
const MOVE_AND_FIX_URL_SCHEME = "moveandfix";

const unavailableStripePaymentSheetController: StripePaymentSheetController = {
  initPaymentSheet: async () => ({
    error: {
      code: "stripe_not_configured",
      message: "Stripe istemci anahtarı yapılandırılmadı; tahsilat başlatılamaz.",
    },
  }),
  presentPaymentSheet: async () => ({
    error: {
      code: "stripe_not_configured",
      message: "Stripe istemci anahtarı yapılandırılmadı; tahsilat başlatılamaz.",
    },
  }),
};

const StripePaymentSheetContext = createContext<StripePaymentSheetController>(
  unavailableStripePaymentSheetController,
);

function StripePaymentSheetControllerProvider({ children }: { children: ReactNode }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const controller = useMemo<StripePaymentSheetController>(
    () => ({
      initPaymentSheet: (params: PaymentSheetSetupParams) => initPaymentSheet(params),
      presentPaymentSheet,
    }),
    [initPaymentSheet, presentPaymentSheet],
  );

  return (
    <StripePaymentSheetContext.Provider value={controller}>
      {children}
    </StripePaymentSheetContext.Provider>
  );
}

export function StripeAppProvider({ children }: StripeAppProviderProps) {
  if (!PUBLISHABLE_KEY) {
    return (
      <StripePaymentSheetContext.Provider value={unavailableStripePaymentSheetController}>
        {children}
      </StripePaymentSheetContext.Provider>
    );
  }

  return (
    <StripeProvider
      publishableKey={PUBLISHABLE_KEY}
      merchantIdentifier={STRIPE_MERCHANT_IDENTIFIER}
      urlScheme={MOVE_AND_FIX_URL_SCHEME}
    >
      <StripePaymentSheetControllerProvider>{children}</StripePaymentSheetControllerProvider>
    </StripeProvider>
  );
}

export function useStripePaymentSheet(): StripePaymentSheetController {
  return useContext(StripePaymentSheetContext);
}
