import { describe, expect, it } from 'vitest';

import {
  NotFoundError,
  PaymentError,
  ValidationError,
} from '../server/_core/errors';
import { AIProvider, AIService } from '../server/services/AIService';
import {
  NotificationService,
  NotificationType,
} from '../server/services/NotificationService';
import {
  PaymentGatewayService,
  PaymentProvider,
} from '../server/services/PaymentGatewayService';
import { WalletService } from '../server/services/WalletService';

describe('service error contract', () => {
  it('uses ValidationError for invalid escrow amounts', async () => {
    const wallet = new WalletService();

    await expect(
      wallet.holdPaymentInEscrow('order-1', 'customer-1', 'provider-1', 0, 10),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('uses NotFoundError for an unknown escrow operation', async () => {
    const wallet = new WalletService();

    await expect(wallet.releaseEscrowPayment('missing')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('uses PaymentError for insufficient withdrawal balance', async () => {
    const payment = new PaymentGatewayService();

    await expect(
      payment.requestWithdrawal(
        'provider-1',
        6_000,
        'bank-1',
        PaymentProvider.IYZICO,
      ),
    ).rejects.toBeInstanceOf(PaymentError);
  });

  it('uses NotFoundError for an unavailable AI provider', async () => {
    const ai = new AIService();

    await expect(ai.setProvider(AIProvider.CLAUDE)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('uses NotFoundError for a missing notification template', async () => {
    const notifications = new NotificationService();

    await expect(
      notifications.updateTemplate(NotificationType.ORDER_ACCEPTED, { active: false }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
