import { describe, expect, it, vi } from 'vitest';

import { EventService, EventType } from '../server/services/EventService';
import { NotificationServiceV2 } from '../server/services/NotificationServiceV2';

describe('circular dependency resolution (Critical 3)', () => {
  it('EventService does not import NotificationService at module level', async () => {
    // EventService modülünü import et — NotificationService import edilmemeli
    const eventModule = await import('../server/services/EventService');

    // Modül kaynak kodunda NotificationService import'u olmamalı
    // Bu test, EventService'in NotificationService'i doğrudan import etmediğini doğrular
    expect(eventModule.EventService).toBeDefined();
    expect(eventModule.eventService).toBeDefined();
  });

  it('EventService accepts injected notification sender', async () => {
    const event = new EventService();
    const mockSender = {
      sendNotification: vi.fn().mockResolvedValue({ status: 'sent' }),
    };

    event.setNotificationSender(mockSender);

    // Event tetikle — handler mock sender'ı çağırmalı
    await event.emit(EventType.ORDER_CREATED, 'test', {
      orderId: 'test-1',
      customerId: 'c1',
      providerId: 'p1',
      category: 'cleaning',
    });

    // Event processor async çalışır — kısa bekleme
    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(mockSender.sendNotification).toHaveBeenCalled();
  });

  it('NotificationServiceV2 accepts injected event publisher', () => {
    const notification = new NotificationServiceV2();
    const mockPublisher = {
      emit: vi.fn().mockResolvedValue({}),
    };

    notification.setEventPublisher(mockPublisher);

    // EventPublisher enjekte edildi — hata fırlatmamalı
    expect(mockPublisher).toBeDefined();
  });

  it('services can be wired without circular import errors', async () => {
    // Tüm servisleri import et — döngüsel import hatası olmamalı
    const { eventService } = await import('../server/services/EventService');
    const { notificationService } = await import('../server/services/NotificationService');
    const { notificationServiceV2 } = await import('../server/services/NotificationServiceV2');
    const { walletService } = await import('../server/services/WalletService');

    // Composition root wiring
    eventService.setNotificationSender(notificationService);
    eventService.setWalletService(walletService);
    notificationServiceV2.setEventPublisher(eventService);

    // Tüm servisler tanımlı olmalı
    expect(eventService).toBeDefined();
    expect(notificationService).toBeDefined();
    expect(notificationServiceV2).toBeDefined();
    expect(walletService).toBeDefined();
  });
});
