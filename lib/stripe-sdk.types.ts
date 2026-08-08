import type { ReactElement } from "react";

export interface StripeAppProviderProps {
  children: ReactElement | ReactElement[];
}

export interface PaymentSheetSetupParams {
  merchantDisplayName: string;
  paymentIntentClientSecret: string;
  returnURL: string;
  allowsDelayedPaymentMethods: boolean;
  style: "automatic" | "alwaysDark" | "alwaysLight";
}

export interface PaymentSheetOperationResult {
  error?: {
    code?: string;
    message: string;
  };
}

export interface StripePaymentSheetController {
  initPaymentSheet: (
    params: PaymentSheetSetupParams,
  ) => Promise<PaymentSheetOperationResult>;
  presentPaymentSheet: () => Promise<PaymentSheetOperationResult>;
}
