// Move&Fix Payment Gateway Module
// Supports escrow (emanet) payment system

export type PaymentMethod = "credit_card" | "debit_card" | "bank_transfer" | "wallet";
export type PaymentStatus = "pending" | "held" | "released" | "refunded" | "cancelled";
export type EscrowStatus = "awaiting_payment" | "payment_held" | "service_completed" | "released_to_provider" | "disputed" | "refunded";

export interface PaymentCard {
  id: string;
  last4: string;
  brand: "visa" | "mastercard" | "amex" | "troy";
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  isDefault: boolean;
}

export interface EscrowPayment {
  id: string;
  requestId: string;
  customerId: string;
  providerId: string;
  amount: number;
  commission: number; // Platform commission
  providerAmount: number; // Amount after commission
  status: EscrowStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  heldAt?: string;
  releasedAt?: string;
  refundedAt?: string;
}

export interface PaymentTransaction {
  id: string;
  type: "payment" | "refund" | "commission";
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  createdAt: string;
}

// Commission rates
export const COMMISSION_RATES = {
  standard: 0.15, // 15% standard commission
  premium_provider: 0.10, // 10% for premium providers
  gold_member: 0.12, // 12% for gold members
  platinum_member: 0.08, // 8% for platinum members
};

// Payment flow steps
export const ESCROW_FLOW_STEPS = [
  { step: 1, title: "Ödeme Yapılır", description: "Müşteri ödemeyi yapar, tutar emanette bekletilir." },
  { step: 2, title: "Hizmet Verilir", description: "Hizmet sağlayıcı işi gerçekleştirir." },
  { step: 3, title: "Onay Beklenir", description: "Müşteri hizmeti onaylar veya itiraz eder." },
  { step: 4, title: "Ödeme Aktarılır", description: "Onay sonrası ödeme hizmet sağlayıcıya aktarılır." },
];

// Calculate payment breakdown
export function calculatePayment(amount: number, commissionRate: number) {
  const commission = Math.round(amount * commissionRate);
  const providerAmount = amount - commission;
  return {
    totalAmount: amount,
    commission,
    providerAmount,
    commissionRate: commissionRate * 100,
  };
}

// Sample saved cards
export const SAMPLE_CARDS: PaymentCard[] = [
  {
    id: "card_1",
    last4: "4242",
    brand: "visa",
    expiryMonth: 12,
    expiryYear: 2028,
    holderName: "AHMET YILMAZ",
    isDefault: true,
  },
  {
    id: "card_2",
    last4: "5555",
    brand: "mastercard",
    expiryMonth: 6,
    expiryYear: 2027,
    holderName: "AHMET YILMAZ",
    isDefault: false,
  },
];

// Sample transactions
export const SAMPLE_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: "txn_1",
    type: "payment",
    amount: 850,
    currency: "TRY",
    status: "released",
    description: "Klima bakım hizmeti - Mehmet Usta",
    createdAt: "2026-08-01T10:30:00Z",
  },
  {
    id: "txn_2",
    type: "payment",
    amount: 1200,
    currency: "TRY",
    status: "held",
    description: "Su tesisatı tamiri - Ali Usta",
    createdAt: "2026-08-04T14:00:00Z",
  },
  {
    id: "txn_3",
    type: "refund",
    amount: 350,
    currency: "TRY",
    status: "released",
    description: "İptal edilen temizlik hizmeti iadesi",
    createdAt: "2026-07-28T09:15:00Z",
  },
];
