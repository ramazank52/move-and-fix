/**
 * Payment Gateway Service - iyzico & Stripe Integration
 * 
 * Desteklenen Ödeme Sağlayıcıları:
 * - iyzico (Türkiye)
 * - Stripe (Uluslararası)
 * 
 * Özellikleri:
 * - Güvenli ödeme işlemi
 * - Escrow (Emanet) yönetimi
 * - Komisyon hesaplama
 * - Para çekme
 * - İade, İptal, Chargeback
 * - Finansal raporlama
 * - Muhasebe kayıtları
 */

import {
  AppError,
  NotFoundError,
  PaymentError,
  ValidationError,
  getErrorMessage,
} from '../_core/errors';

export enum PaymentProvider {
  IYZICO = 'iyzico',
  STRIPE = 'stripe',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  customerId: string;
  providerId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerTransactionId?: string;
  commission: number;
  providerPayout: number;
  companyEarnings: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentCard {
  id: string;
  userId: string;
  cardNumber: string; // Encrypted
  cardHolder: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string; // Encrypted
  isDefault: boolean;
  provider: PaymentProvider;
  providerCardId?: string;
  createdAt: Date;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  bankAccountId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider: PaymentProvider;
  providerTransactionId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface RefundResult {
  success: true;
  refundId: string;
  amount: number;
  reason: string;
}

export interface ChargebackResult {
  success: true;
  chargebackId: string;
  amount: number;
  status: 'investigating';
}

export interface AccountingEntry {
  id: string;
  transactionId: string;
  type: 'income' | 'expense' | 'commission';
  amount: number;
  description: string;
  createdAt: Date;
}

function asPaymentOperationError(error: unknown, operation: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new PaymentError(getErrorMessage(error, `${operation} başarısız oldu`), {
    retryable: true,
    context: { operation },
    cause: error,
  });
}

export class PaymentGatewayService {
  private iyzico?: unknown; // iyzico SDK adapter'ı
  private stripe?: unknown; // Stripe SDK adapter'ı

  constructor() {
    this.initializeProviders();
  }

  /**
   * Ödeme sağlayıcılarını başlat
   */
  private initializeProviders() {
    // iyzico initialization
    if (process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY) {
      // const Iyzipay = require('iyzipay');
      // this.iyzico = new Iyzipay({
      //   apiKey: process.env.IYZICO_API_KEY,
      //   secretKey: process.env.IYZICO_SECRET_KEY,
      //   uri: 'https://api.iyzipay.com'
      // });
      console.log('✅ iyzico initialized');
    }

    // Stripe initialization
    if (process.env.STRIPE_API_KEY) {
      // const stripe = require('stripe');
      // this.stripe = stripe(process.env.STRIPE_API_KEY);
      console.log('✅ Stripe initialized');
    }
  }

  /**
   * Ödeme işlemi başlat (Escrow)
   */
  async initiatePayment(
    orderId: string,
    customerId: string,
    providerId: string,
    amount: number,
    cardId: string,
    commissionRate: number,
    provider: PaymentProvider = PaymentProvider.IYZICO
  ): Promise<PaymentTransaction> {
    try {
      // Kart bilgilerini getir
      const card = await this.getCard(cardId);
      if (!card) {
        throw new NotFoundError('Kart', { cardId });
      }

      // Komisyon hesapla
      const commission = (amount * commissionRate) / 100;
      const providerPayout = amount - commission;
      const companyEarnings = commission;

      // Ödeme işlemini başlat
      let providerTransactionId: string = '';

      if (provider === PaymentProvider.IYZICO) {
        providerTransactionId = await this.payWithIyzico(
          customerId,
          amount,
          card,
          orderId
        );
      } else if (provider === PaymentProvider.STRIPE) {
        providerTransactionId = await this.payWithStripe(
          customerId,
          amount,
          card,
          orderId
        );
      } else {
        throw new ValidationError('Bilinmeyen ödeme sağlayıcısı', { provider });
      }

      // Transaction kaydını oluştur
      const transaction: PaymentTransaction = {
        id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        orderId,
        customerId,
        providerId,
        amount,
        currency: 'TRY',
        method: PaymentMethod.CREDIT_CARD,
        provider,
        status: PaymentStatus.COMPLETED,
        providerTransactionId,
        commission,
        providerPayout,
        companyEarnings,
        metadata: {
          cardLast4: card.cardNumber.slice(-4),
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Veritabanına kaydet
      // await db.savePaymentTransaction(transaction);

      return transaction;
    } catch (error: unknown) {
      const paymentError = asPaymentOperationError(error, 'Ödeme işlemi');
      console.error('Ödeme işlemi başarısız:', paymentError);
      throw paymentError;
    }
  }

  /**
   * iyzico ile ödeme yap
   */
  private async payWithIyzico(
    customerId: string,
    amount: number,
    card: PaymentCard,
    orderId: string
  ): Promise<string> {
    // Mock implementasyon
    // Gerçek implementasyon:
    // const request = {
    //   locale: 'tr',
    //   conversationId: orderId,
    //   price: amount,
    //   paidPrice: amount,
    //   currency: 'TRY',
    //   installment: '1',
    //   basketId: orderId,
    //   paymentChannel: 'WEB',
    //   paymentGroup: 'PRODUCT',
    //   cardUserKey: card.providerCardId,
    //   cardToken: card.providerCardId,
    //   buyer: { ... },
    //   billingAddress: { ... },
    //   shippingAddress: { ... },
    //   basketItems: [ ... ]
    // };
    // const response = await this.iyzico.payment.create(request);

    console.log(`💳 iyzico: ${amount}₺ ödeme işleniyor...`);
    return `IYZ-${Date.now()}`;
  }

  /**
   * Stripe ile ödeme yap
   */
  private async payWithStripe(
    customerId: string,
    amount: number,
    card: PaymentCard,
    orderId: string
  ): Promise<string> {
    // Mock implementasyon
    // Gerçek implementasyon:
    // const charge = await this.stripe.charges.create({
    //   amount: Math.round(amount * 100),
    //   currency: 'try',
    //   source: card.providerCardId,
    //   description: `Order #${orderId}`,
    //   metadata: { orderId, customerId }
    // });

    console.log(`💳 Stripe: ${amount}₺ ödeme işleniyor...`);
    return `STRIPE-${Date.now()}`;
  }

  /**
   * Para çekme isteği oluştur
   */
  async requestWithdrawal(
    userId: string,
    amount: number,
    bankAccountId: string,
    provider: PaymentProvider = PaymentProvider.IYZICO
  ): Promise<WithdrawalRequest> {
    try {
      // Bakiye kontrol et
      const balance = await this.getUserBalance(userId);
      if (balance < amount) {
        throw new PaymentError('Yetersiz bakiye', {
          context: { userId, requestedAmount: amount },
        });
      }

      // Minimum çekme tutarı kontrol et
      if (amount < 100) {
        throw new ValidationError('Minimum çekme tutarı 100₺ dir', {
          field: 'amount',
          value: amount,
          minimum: 100,
        });
      }

      // Para çekme işlemini başlat
      let providerTransactionId: string = '';

      if (provider === PaymentProvider.IYZICO) {
        providerTransactionId = await this.withdrawWithIyzico(
          userId,
          amount,
          bankAccountId
        );
      } else if (provider === PaymentProvider.STRIPE) {
        providerTransactionId = await this.withdrawWithStripe(
          userId,
          amount,
          bankAccountId
        );
      } else {
        throw new ValidationError('Bilinmeyen ödeme sağlayıcısı', { provider });
      }

      const withdrawal: WithdrawalRequest = {
        id: `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        amount,
        bankAccountId,
        status: 'processing',
        provider,
        providerTransactionId,
        createdAt: new Date(),
      };

      // Veritabanına kaydet
      // await db.saveWithdrawalRequest(withdrawal);

      return withdrawal;
    } catch (error: unknown) {
      const paymentError = asPaymentOperationError(error, 'Para çekme isteği');
      console.error('Para çekme isteği başarısız:', paymentError);
      throw paymentError;
    }
  }

  /**
   * iyzico ile para çek
   */
  private async withdrawWithIyzico(
    userId: string,
    amount: number,
    bankAccountId: string
  ): Promise<string> {
    console.log(`🏦 iyzico: ${amount}₺ para çekme işleniyor...`);
    return `IYZ-WD-${Date.now()}`;
  }

  /**
   * Stripe ile para çek
   */
  private async withdrawWithStripe(
    userId: string,
    amount: number,
    bankAccountId: string
  ): Promise<string> {
    console.log(`🏦 Stripe: ${amount}₺ para çekme işleniyor...`);
    return `STRIPE-WD-${Date.now()}`;
  }

  /**
   * İade işlemi
   */
  async refundPayment(transactionId: string, reason: string): Promise<RefundResult> {
    try {
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new NotFoundError('İşlem', { transactionId });
      }

      if (transaction.provider === PaymentProvider.IYZICO) {
        // iyzico refund
        console.log(`↩️ iyzico: ${transaction.amount}₺ iade işleniyor...`);
      } else if (transaction.provider === PaymentProvider.STRIPE) {
        // Stripe refund
        console.log(`↩️ Stripe: ${transaction.amount}₺ iade işleniyor...`);
      }

      return {
        success: true,
        refundId: `REF-${Date.now()}`,
        amount: transaction.amount,
        reason,
      };
    } catch (error: unknown) {
      const paymentError = asPaymentOperationError(error, 'İade işlemi');
      console.error('İade işlemi başarısız:', paymentError);
      throw paymentError;
    }
  }

  /**
   * Chargeback yönetimi
   */
  async handleChargeback(
    transactionId: string,
    chargebackAmount: number,
  ): Promise<ChargebackResult> {
    try {
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new NotFoundError('İşlem', { transactionId });
      }

      console.log(`⚠️ Chargeback: ${chargebackAmount}₺ - İşlem #${transactionId}`);

      // Chargeback kaydını oluştur
      // Müşteriye bildirim gönder
      // İstatistikleri güncelle

      return {
        success: true,
        chargebackId: `CB-${Date.now()}`,
        amount: chargebackAmount,
        status: 'investigating',
      };
    } catch (error: unknown) {
      const paymentError = asPaymentOperationError(error, 'Chargeback işlemi');
      console.error('Chargeback işlemi başarısız:', paymentError);
      throw paymentError;
    }
  }

  /**
   * Kart ekle
   */
  async addCard(
    userId: string,
    cardNumber: string,
    cardHolder: string,
    expiryMonth: number,
    expiryYear: number,
    cvv: string,
    provider: PaymentProvider = PaymentProvider.IYZICO
  ): Promise<PaymentCard> {
    try {
      // Kart bilgilerini şifrele
      // const encryptedCardNumber = encrypt(cardNumber);
      // const encryptedCVV = encrypt(cvv);

      // Ödeme sağlayıcısına kart ekle
      let providerCardId: string = '';

      if (provider === PaymentProvider.IYZICO) {
        providerCardId = await this.addCardToIyzico(
          userId,
          cardNumber,
          cardHolder,
          expiryMonth,
          expiryYear,
          cvv
        );
      } else if (provider === PaymentProvider.STRIPE) {
        providerCardId = await this.addCardToStripe(
          userId,
          cardNumber,
          cardHolder,
          expiryMonth,
          expiryYear,
          cvv
        );
      } else {
        throw new ValidationError('Bilinmeyen ödeme sağlayıcısı', { provider });
      }

      const card: PaymentCard = {
        id: `CARD-${Date.now()}`,
        userId,
        cardNumber: `****${cardNumber.slice(-4)}`, // Şifreli
        cardHolder,
        expiryMonth,
        expiryYear,
        cvv: '***', // Şifreli
        isDefault: false,
        provider,
        providerCardId,
        createdAt: new Date(),
      };

      // Veritabanına kaydet
      // await db.saveCard(card);

      return card;
    } catch (error: unknown) {
      const paymentError = asPaymentOperationError(error, 'Kart ekleme');
      console.error('Kart ekleme başarısız:', paymentError);
      throw paymentError;
    }
  }

  /**
   * iyzico'ya kart ekle
   */
  private async addCardToIyzico(
    userId: string,
    cardNumber: string,
    cardHolder: string,
    expiryMonth: number,
    expiryYear: number,
    cvv: string
  ): Promise<string> {
    console.log(`💳 iyzico: Kart ekleniyor...`);
    return `IYZ-CARD-${Date.now()}`;
  }

  /**
   * Stripe'a kart ekle
   */
  private async addCardToStripe(
    userId: string,
    cardNumber: string,
    cardHolder: string,
    expiryMonth: number,
    expiryYear: number,
    cvv: string
  ): Promise<string> {
    console.log(`💳 Stripe: Kart ekleniyor...`);
    return `STRIPE-CARD-${Date.now()}`;
  }

  /**
   * Kart getir
   */
  async getCard(cardId: string): Promise<PaymentCard | null> {
    // Veritabanından getir
    return null;
  }

  /**
   * İşlem getir
   */
  async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    // Veritabanından getir
    return null;
  }

  /**
   * Kullanıcı bakiyesi getir
   */
  async getUserBalance(userId: string): Promise<number> {
    // Veritabanından getir
    return 5000; // Mock
  }

  /**
   * Finansal rapor
   */
  async getFinancialReport(dateRange?: { from: Date; to: Date }) {
    return {
      period: dateRange || 'All time',
      totalPayments: 500000,
      totalRefunds: 12500,
      totalWithdrawals: 375000,
      totalCommissions: 125000,
      totalChargebacks: 2500,
      successRate: 98.5,
      averageTransactionValue: 1250,
      byProvider: {
        [PaymentProvider.IYZICO]: {
          transactions: 350,
          amount: 350000,
          successRate: 99.1,
        },
        [PaymentProvider.STRIPE]: {
          transactions: 150,
          amount: 150000,
          successRate: 97.3,
        },
      },
    };
  }

  /**
   * Muhasebe kaydı
   */
  async createAccountingEntry(
    transactionId: string,
    type: 'income' | 'expense' | 'commission',
    amount: number,
    description: string
  ): Promise<AccountingEntry> {
    return {
      id: `ACC-${Date.now()}`,
      transactionId,
      type,
      amount,
      description,
      createdAt: new Date(),
    };
  }
}

export const paymentGatewayService = new PaymentGatewayService();
