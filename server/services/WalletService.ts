/**
 * Wallet Service - Escrow Mantığı ile Ödeme Yönetimi
 * 
 * Sorumluluğu:
 * - Müşteri ödemesi (Escrow'a koyma)
 * - Bekleyen bakiye yönetimi
 * - İş tamamlandıktan sonra komisyon kesintisi
 * - Ustaya ödeme
 * - Şirket bakiyesi
 * - Para çekme
 * - İşlem geçmişi
 * - Refund işlemleri
 */

import {
  ConflictError,
  NotFoundError,
  PaymentError,
  ValidationError,
} from '../_core/errors';

export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  ESCROW_HOLD = 'escrow_hold',
  COMMISSION_DEDUCTION = 'commission_deduction',
  PROVIDER_PAYOUT = 'provider_payout',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

export enum WalletTransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface WalletBalance {
  userId: string;
  userType: 'customer' | 'provider' | 'company' | 'owner';
  availableBalance: number; // Kullanılabilir bakiye
  pendingBalance: number; // Escrow'da bekleyen
  totalBalance: number; // Toplam
  lastUpdated: Date;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  status: WalletTransactionStatus;
  description: string;
  relatedOrderId?: string;
  relatedJobId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscrowTransaction {
  id: string;
  orderId: string;
  customerId: string;
  providerId: string;
  amount: number;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  commissionRate: number;
  commissionAmount: number;
  providerPayout: number;
  companyEarnings: number;
  heldAt: Date;
  releasedAt?: Date;
  refundedAt?: Date;
}

export class WalletService {
  /**
   * Müşteri ödemesini Escrow'a koy
   */
  async holdPaymentInEscrow(
    orderId: string,
    customerId: string,
    providerId: string,
    amount: number,
    commissionRate: number
  ): Promise<EscrowTransaction> {
    // Validasyon
    if (amount <= 0) {
      throw new ValidationError('Ödeme tutarı 0 dan büyük olmalıdır', {
        field: 'amount',
        value: amount,
      });
    }

    if (commissionRate < 0 || commissionRate > 100) {
      throw new ValidationError('Komisyon oranı 0-100 arasında olmalıdır', {
        field: 'commissionRate',
        value: commissionRate,
      });
    }

    // Müşterinin bakiyesini kontrol et
    const customerBalance = await this.getBalance(customerId);
    if (customerBalance.availableBalance < amount) {
      throw new PaymentError('Yetersiz bakiye', {
        context: { customerId, requestedAmount: amount },
      });
    }

    // Komisyon hesapla
    const commissionAmount = (amount * commissionRate) / 100;
    const providerPayout = amount - commissionAmount;
    const companyEarnings = commissionAmount;

    // Escrow transaction oluştur
    const escrowTx: EscrowTransaction = {
      id: `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      customerId,
      providerId,
      amount,
      status: 'held',
      commissionRate,
      commissionAmount,
      providerPayout,
      companyEarnings,
      heldAt: new Date(),
    };

    // Müşteri bakiyesinden düş (Pending'e taşı)
    await this.recordTransaction({
      userId: customerId,
      type: WalletTransactionType.ESCROW_HOLD,
      amount,
      status: WalletTransactionStatus.COMPLETED,
      description: `Sipariş #${orderId} için ödeme Escrow'a koyuldu`,
      relatedOrderId: orderId,
      metadata: { escrowId: escrowTx.id },
    });

    return escrowTx;
  }

  /**
   * İş tamamlandı - Escrow'dan ödeme yap
   */
  async releaseEscrowPayment(escrowId: string): Promise<EscrowTransaction> {
    // Escrow transaction'ı getir
    const escrow = await this.getEscrowTransaction(escrowId);

    if (!escrow) {
      throw new NotFoundError('Escrow işlemi', { escrowId });
    }

    if (escrow.status !== 'held') {
      throw new ConflictError('Escrow zaten işlenmiş', {
        escrowId,
        status: escrow.status,
      });
    }

    // Ustaya ödeme yap
    await this.recordTransaction({
      userId: escrow.providerId,
      type: WalletTransactionType.PROVIDER_PAYOUT,
      amount: escrow.providerPayout,
      status: WalletTransactionStatus.COMPLETED,
      description: `Sipariş #${escrow.orderId} tamamlandı - Ödeme alındı`,
      relatedOrderId: escrow.orderId,
      metadata: { escrowId },
    });

    // Şirket bakiyesine ekle
    await this.recordTransaction({
      userId: 'company', // Şirket hesabı
      type: WalletTransactionType.COMMISSION_DEDUCTION,
      amount: escrow.commissionAmount,
      status: WalletTransactionStatus.COMPLETED,
      description: `Sipariş #${escrow.orderId} komisyonu`,
      relatedOrderId: escrow.orderId,
      metadata: { escrowId, commissionRate: escrow.commissionRate },
    });

    // Escrow durumunu güncelle
    escrow.status = 'released';
    escrow.releasedAt = new Date();

    return escrow;
  }

  /**
   * Escrow'dan geri ödeme (İptal/Anlaşmazlık)
   */
  async refundEscrow(escrowId: string, reason: string): Promise<EscrowTransaction> {
    const escrow = await this.getEscrowTransaction(escrowId);

    if (!escrow) {
      throw new NotFoundError('Escrow işlemi', { escrowId });
    }

    if (escrow.status !== 'held') {
      throw new ConflictError(
        'Sadece bekleme durumundaki Escrow işlemleri geri alınabilir',
        { escrowId, status: escrow.status },
      );
    }

    // Müşteriye geri ödeme yap
    await this.recordTransaction({
      userId: escrow.customerId,
      type: WalletTransactionType.REFUND,
      amount: escrow.amount,
      status: WalletTransactionStatus.COMPLETED,
      description: `Sipariş #${escrow.orderId} iptal - Geri ödeme: ${reason}`,
      relatedOrderId: escrow.orderId,
      metadata: { escrowId, reason },
    });

    // Escrow durumunu güncelle
    escrow.status = 'refunded';
    escrow.refundedAt = new Date();

    return escrow;
  }

  /**
   * Bakiye getir
   */
  async getBalance(userId: string): Promise<WalletBalance> {
    // Veritabanından bakiye bilgisini getir
    // Mock implementasyon
    return {
      userId,
      userType: 'customer',
      availableBalance: 5000,
      pendingBalance: 1500,
      totalBalance: 6500,
      lastUpdated: new Date(),
    };
  }

  /**
   * İşlem kaydı oluştur
   */
  async recordTransaction(data: {
    userId: string;
    type: WalletTransactionType;
    amount: number;
    status: WalletTransactionStatus;
    description: string;
    relatedOrderId?: string;
    relatedJobId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<WalletTransaction> {
    const transaction: WalletTransaction = {
      id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      status: data.status,
      description: data.description,
      relatedOrderId: data.relatedOrderId,
      relatedJobId: data.relatedJobId,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Veritabanına kaydet
    // await db.saveTransaction(transaction);

    return transaction;
  }

  /**
   * Para çekme isteği oluştur
   */
  async requestWithdrawal(
    userId: string,
    amount: number,
    bankAccountId: string
  ): Promise<WalletTransaction> {
    // Bakiye kontrol et
    const balance = await this.getBalance(userId);

    if (balance.availableBalance < amount) {
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

    // Para çekme işlemi oluştur
    const transaction = await this.recordTransaction({
      userId,
      type: WalletTransactionType.WITHDRAWAL,
      amount,
      status: WalletTransactionStatus.PENDING,
      description: `Para çekme isteği - Banka hesabı: ${bankAccountId}`,
      metadata: { bankAccountId },
    });

    // Ödeme gateway'ine gönder (iyzico, Stripe vb.)
    // await paymentGateway.processWithdrawal(userId, amount, bankAccountId);

    return transaction;
  }

  /**
   * İşlem geçmişi getir
   */
  async getTransactionHistory(
    userId: string,
    filters?: {
      type?: WalletTransactionType;
      status?: WalletTransactionStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<WalletTransaction[]> {
    // Veritabanından işlem geçmişini getir
    // Mock implementasyon
    return [
      {
        id: 'TXN-001',
        userId,
        type: WalletTransactionType.DEPOSIT,
        amount: 5000,
        status: WalletTransactionStatus.COMPLETED,
        description: 'Kart ile para yatırma',
        createdAt: new Date('2024-08-01'),
        updatedAt: new Date('2024-08-01'),
      },
      {
        id: 'TXN-002',
        userId,
        type: WalletTransactionType.ESCROW_HOLD,
        amount: 1500,
        status: WalletTransactionStatus.COMPLETED,
        description: 'Sipariş #123 için ödeme',
        relatedOrderId: '123',
        createdAt: new Date('2024-08-02'),
        updatedAt: new Date('2024-08-02'),
      },
    ];
  }

  /**
   * Escrow işlemi getir
   */
  async getEscrowTransaction(escrowId: string): Promise<EscrowTransaction | null> {
    // Veritabanından getir
    // Mock implementasyon
    return null;
  }

  /**
   * Şirket bakiyesi getir
   */
  async getCompanyBalance(): Promise<WalletBalance> {
    return {
      userId: 'company',
      userType: 'owner',
      availableBalance: 125000,
      pendingBalance: 45000,
      totalBalance: 170000,
      lastUpdated: new Date(),
    };
  }

  /**
   * Bakiye raporu (Admin için)
   */
  async getBalanceReport(dateRange?: { from: Date; to: Date }) {
    return {
      period: dateRange || 'All time',
      totalDeposits: 500000,
      totalWithdrawals: 375000,
      totalCommissions: 125000,
      totalRefunds: 12500,
      activeEscrows: 45,
      escrowValue: 67500,
      companyBalance: 125000,
    };
  }
}

export const walletService = new WalletService();
