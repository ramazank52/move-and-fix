/**
 * Service Interfaces — Kritik Bulgu #4 ve #8
 *
 * Servisler arası doğrudan import bağımlılıklarını kaldırmak ve test
 * edilebilirliği artırmak için ortak arayüz sözleşmeleri.
 *
 * Her servis somut sınıfını bu arayüzlerden birini implement eder;
 * bağımlılık enjeksiyonu composition root'ta (routers.ts) yapılır.
 */

import type { EventType, Event } from './EventService';
import type { NotificationType } from './NotificationService';

/* ────────────────── Event Publisher (EventService) ────────────────── */

export interface IEventPublisher {
  emit(
    eventType: EventType,
    source: string,
    data: Record<string, unknown>,
  ): Promise<Event>;
}

/* ────────────────── Notification Sender ────────────────── */

export interface INotificationSender {
  sendNotification(
    userId: string,
    type: NotificationType | string,
    data: Record<string, unknown>,
  ): Promise<unknown>;
}

/* ────────────────── Wallet Service ────────────────── */

export interface EscrowRecord {
  id: string;
  orderId: string;
  customerId: string;
  providerId: string;
  amount: number;
  commissionRate: number;
  commissionAmount?: number;
  providerPayout?: number;
  companyEarnings?: number;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  createdAt?: Date;
  heldAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
}

export interface WalletBalance {
  userId: string;
  userType?: 'customer' | 'provider' | 'company' | 'owner';
  available?: number;
  pending?: number;
  currency?: string;
  availableBalance?: number;
  pendingBalance?: number;
  totalBalance?: number;
  lastUpdated: Date;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  amount: number;
  bankAccountId?: string;
  status: 'pending' | 'completed' | 'failed' | string;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IWalletService {
  holdPaymentInEscrow(
    orderId: string,
    customerId: string,
    providerId: string,
    amount: number,
    commissionRate: number,
  ): Promise<EscrowRecord>;

  releaseEscrowPayment(escrowId: string): Promise<EscrowRecord>;
  refundEscrow(escrowId: string, reason: string): Promise<EscrowRecord>;
  getBalance(userId: string): Promise<WalletBalance>;
  requestWithdrawal(
    userId: string,
    amount: number,
    bankAccountId: string,
  ): Promise<WithdrawalRecord>;
  getTransactionHistory(
    userId: string,
    filters?: Record<string, unknown>,
  ): Promise<unknown[]>;
}

/* ────────────────── AI Service ────────────────── */

export interface AIProvider {
  name: string;
  generateResponse(
    messages: AIMessage[],
    options?: Record<string, unknown>,
  ): Promise<string>;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICommandResult {
  success: boolean;
  action: string;
  result: unknown;
  message: string;
}

export interface IAIService {
  setProvider(provider: AIProvider): void;
  processCommand(
    command: string,
    context?: Record<string, unknown>,
  ): Promise<AICommandResult>;
  chat(messages: AIMessage[], options?: Record<string, unknown>): Promise<string>;
}

/* ────────────────── Payment Gateway ────────────────── */

export type PaymentProvider = 'iyzico' | 'stripe';

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  originalTransactionId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export interface WithdrawalResult {
  success: boolean;
  withdrawalId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export interface IPaymentGatewayService {
  processPayment(
    userId: string,
    amount: number,
    provider: PaymentProvider,
  ): Promise<PaymentResult>;

  requestWithdrawal(
    userId: string,
    amount: number,
    bankAccountId: string,
    provider: PaymentProvider,
  ): Promise<WithdrawalResult>;

  refundPayment(transactionId: string, reason: string): Promise<RefundResult>;
}

/* ────────────────── Test Doubles ────────────────── */

/**
 * In-memory test double for IWalletService.
 * Mock veritabanı kullanmadan servis sözleşmelerini test eder.
 */
export class MockWalletService implements IWalletService {
  private escrows: Map<string, EscrowRecord> = new Map();
  private balances: Map<string, WalletBalance> = new Map();
  private withdrawals: WithdrawalRecord[] = [];

  async holdPaymentInEscrow(
    orderId: string,
    customerId: string,
    providerId: string,
    amount: number,
    commissionRate: number,
  ): Promise<EscrowRecord> {
    const record: EscrowRecord = {
      id: `escrow-${Date.now()}`,
      orderId,
      customerId,
      providerId,
      amount,
      commissionRate,
      status: 'held',
      createdAt: new Date(),
      releasedAt: undefined,
    };
    this.escrows.set(record.id, record);
    return record;
  }

  async releaseEscrowPayment(escrowId: string): Promise<EscrowRecord> {
    const record = this.escrows.get(escrowId);
    if (!record) throw new Error('Escrow not found');
    record.status = 'released';
    record.releasedAt = new Date();
    return record;
  }

  async refundEscrow(escrowId: string, _reason: string): Promise<EscrowRecord> {
    const record = this.escrows.get(escrowId);
    if (!record) throw new Error('Escrow not found');
    record.status = 'refunded';
    return record;
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    return (
      this.balances.get(userId) || {
        userId,
        available: 0,
        pending: 0,
        currency: 'TRY',
        lastUpdated: new Date(),
      }
    );
  }

  async requestWithdrawal(
    userId: string,
    amount: number,
    bankAccountId: string,
  ): Promise<WithdrawalRecord> {
    const record: WithdrawalRecord = {
      id: `withdrawal-${Date.now()}`,
      userId,
      amount,
      bankAccountId,
      status: 'pending',
      createdAt: new Date(),
    };
    this.withdrawals.push(record);
    return record;
  }

  async getTransactionHistory(_userId: string, _filters?: Record<string, unknown>): Promise<unknown[]> {
    return this.withdrawals;
  }
}

/**
 * In-memory test double for INotificationSender.
 */
export class MockNotificationSender implements INotificationSender {
  private sent: Array<{ userId: string; type: string; data: Record<string, unknown> }> = [];

  async sendNotification(
    userId: string,
    type: string,
    data: Record<string, unknown>,
  ): Promise<unknown> {
    this.sent.push({ userId, type, data });
    return { success: true, messageId: `msg-${Date.now()}` };
  }

  getSent(): typeof this.sent {
    return this.sent;
  }
}

/**
 * In-memory test double for IPaymentGatewayService.
 */
export class MockPaymentGatewayService implements IPaymentGatewayService {
  async processPayment(
    _userId: string,
    amount: number,
    provider: PaymentProvider,
  ): Promise<PaymentResult> {
    return {
      success: true,
      transactionId: `txn-${Date.now()}`,
      amount,
      currency: 'TRY',
      provider,
      status: 'completed',
    };
  }

  async requestWithdrawal(
    _userId: string,
    amount: number,
    _bankAccountId: string,
    _provider: PaymentProvider,
  ): Promise<WithdrawalResult> {
    return {
      success: true,
      withdrawalId: `wd-${Date.now()}`,
      amount,
      status: 'pending',
    };
  }

  async refundPayment(transactionId: string, _reason: string): Promise<RefundResult> {
    return {
      success: true,
      refundId: `refund-${Date.now()}`,
      originalTransactionId: transactionId,
      amount: 0,
      status: 'completed',
    };
  }
}
