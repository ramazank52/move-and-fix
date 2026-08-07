import { describe, expect, it } from 'vitest';
import {
  MockWalletService,
  MockNotificationSender,
  MockPaymentGatewayService,
  type IWalletService,
  type INotificationSender,
  type IPaymentGatewayService,
} from '../server/services/interfaces';

describe('Service Interfaces & Test Doubles (Critical 8)', () => {
  describe('IWalletService — MockWalletService', () => {
    let wallet: IWalletService;

    it('creates as IWalletService', () => {
      wallet = new MockWalletService();
      expect(wallet).toBeDefined();
      expect(typeof wallet.holdPaymentInEscrow).toBe('function');
      expect(typeof wallet.releaseEscrowPayment).toBe('function');
      expect(typeof wallet.refundEscrow).toBe('function');
      expect(typeof wallet.getBalance).toBe('function');
      expect(typeof wallet.requestWithdrawal).toBe('function');
    });

    it('holds payment in escrow', async () => {
      wallet = new MockWalletService();
      const record = await wallet.holdPaymentInEscrow(
        'order-1',
        'customer-1',
        'provider-1',
        1000,
        0.15,
      );
      expect(record.id).toBeDefined();
      expect(record.orderId).toBe('order-1');
      expect(record.amount).toBe(1000);
      expect(record.status).toBe('held');
    });

    it('releases escrow payment', async () => {
      wallet = new MockWalletService();
      const held = await wallet.holdPaymentInEscrow('o1', 'c1', 'p1', 500, 0.1);
      const released = await wallet.releaseEscrowPayment(held.id);
      expect(released.status).toBe('released');
      expect(released.releasedAt).not.toBeNull();
    });

    it('refunds escrow', async () => {
      wallet = new MockWalletService();
      const held = await wallet.holdPaymentInEscrow('o2', 'c2', 'p2', 300, 0.1);
      const refunded = await wallet.refundEscrow(held.id, 'test reason');
      expect(refunded.status).toBe('refunded');
    });

    it('returns wallet balance', async () => {
      wallet = new MockWalletService();
      const balance = await wallet.getBalance('user-1');
      expect(balance.userId).toBe('user-1');
      expect(balance.currency).toBe('TRY');
    });

    it('processes withdrawal request', async () => {
      wallet = new MockWalletService();
      const withdrawal = await wallet.requestWithdrawal('user-1', 200, 'bank-1');
      expect(withdrawal.id).toBeDefined();
      expect(withdrawal.amount).toBe(200);
      expect(withdrawal.status).toBe('pending');
    });
  });

  describe('INotificationSender — MockNotificationSender', () => {
    let sender: INotificationSender;

    it('creates as INotificationSender', () => {
      sender = new MockNotificationSender();
      expect(sender).toBeDefined();
      expect(typeof sender.sendNotification).toBe('function');
    });

    it('sends notification and returns success', async () => {
      sender = new MockNotificationSender();
      const result = (await sender.sendNotification('user-1', 'push', {
        title: 'Test',
      })) as { success: boolean; messageId?: string };
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('IPaymentGatewayService — MockPaymentGatewayService', () => {
    let gateway: IPaymentGatewayService;

    it('creates as IPaymentGatewayService', () => {
      gateway = new MockPaymentGatewayService();
      expect(gateway).toBeDefined();
      expect(typeof gateway.processPayment).toBe('function');
      expect(typeof gateway.requestWithdrawal).toBe('function');
      expect(typeof gateway.refundPayment).toBe('function');
    });

    it('processes payment', async () => {
      gateway = new MockPaymentGatewayService();
      const result = await gateway.processPayment('user-1', 500, 'iyzico');
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.provider).toBe('iyzico');
      expect(result.status).toBe('completed');
    });

    it('processes withdrawal', async () => {
      gateway = new MockPaymentGatewayService();
      const result = await gateway.requestWithdrawal('user-1', 200, 'bank-1', 'stripe');
      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
    });

    it('processes refund', async () => {
      gateway = new MockPaymentGatewayService();
      const result = await gateway.refundPayment('txn-1', 'customer request');
      expect(result.success).toBe(true);
      expect(result.originalTransactionId).toBe('txn-1');
      expect(result.status).toBe('completed');
    });
  });
});
