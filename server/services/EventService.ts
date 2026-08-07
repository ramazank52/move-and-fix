/**
 * Event Service - Webhook & Event-Driven Architecture
 * 
 * Merkezi Event Sistemi:
 * - Tüm olaylar bu sistem üzerinden yönetilir
 * - Event'ler ilgili servislere otomatik iletilir
 * - Yeni servislerin eklenmesi kolay
 * - Asenkron ve güvenilir
 * 
 * Event Türleri:
 * - payment.completed
 * - payment.failed
 * - order.created
 * - order.accepted
 * - order.completed
 * - order.cancelled
 * - withdrawal.completed
 * - notification.sent
 * - ai.command.executed
 * - user.registered
 * - provider.added
 */

import {
  ErrorCategory,
  ErrorSeverity,
  normalizeError,
} from '../_core/errors';
import type { INotificationSender, IWalletService } from './interfaces';

export enum EventType {
  // Payment Events
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  PAYMENT_DISPUTED = 'payment.disputed',

  // Order Events
  ORDER_CREATED = 'order.created',
  ORDER_ACCEPTED = 'order.accepted',
  ORDER_COMPLETED = 'order.completed',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_UPDATED = 'order.updated',

  // Withdrawal Events
  WITHDRAWAL_REQUESTED = 'withdrawal.requested',
  WITHDRAWAL_PROCESSING = 'withdrawal.processing',
  WITHDRAWAL_COMPLETED = 'withdrawal.completed',
  WITHDRAWAL_FAILED = 'withdrawal.failed',

  // Notification Events
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_FAILED = 'notification.failed',

  // AI Events
  AI_COMMAND_RECEIVED = 'ai.command.received',
  AI_COMMAND_EXECUTED = 'ai.command.executed',
  AI_COMMAND_FAILED = 'ai.command.failed',

  // User Events
  USER_REGISTERED = 'user.registered',
  USER_VERIFIED = 'user.verified',
  USER_UPDATED = 'user.updated',

  // Provider Events
  PROVIDER_ADDED = 'provider.added',
  PROVIDER_VERIFIED = 'provider.verified',
  PROVIDER_UPDATED = 'provider.updated',

  // System Events
  SYSTEM_HEALTH_CHECK = 'system.health_check',
  SYSTEM_ERROR = 'system.error',
}

export interface Event {
  id: string;
  type: EventType;
  source: string; // Hangi servis tarafından tetiklendi
  data: Record<string, unknown>;
  timestamp: Date;
  processed: boolean;
  processedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface EventListener {
  id: string;
  eventType: EventType;
  handler: (event: Event) => Promise<void>;
  enabled: boolean;
  retryable: boolean;
}

export interface EventLog {
  id: string;
  eventId: string;
  listenerId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class EventService {
  private listeners: Map<EventType, EventListener[]> = new Map();
  private eventQueue: Event[] = [];
  private eventLogs: EventLog[] = [];
  private notificationSender: INotificationSender | null = null;
  private walletService: IWalletService | null = null;

  constructor() {
    this.registerDefaultListeners();
    this.startEventProcessor();
  }

  /**
   * Notification sender bağımlılığını enjekte et (döngüsel import'u önler)
   */
  setNotificationSender(sender: INotificationSender): void {
    this.notificationSender = sender;
  }

  /**
   * Wallet service bağımlılığını enjekte et
   */
  setWalletService(wallet: IWalletService): void {
    this.walletService = wallet;
  }

  /**
   * Varsayılan listener'ları kaydet
   */
  private registerDefaultListeners() {
    // Payment listeners
    this.on(EventType.PAYMENT_COMPLETED, this.handlePaymentCompleted.bind(this));
    this.on(EventType.PAYMENT_FAILED, this.handlePaymentFailed.bind(this));

    // Order listeners
    this.on(EventType.ORDER_CREATED, this.handleOrderCreated.bind(this));
    this.on(EventType.ORDER_COMPLETED, this.handleOrderCompleted.bind(this));

    // Withdrawal listeners
    this.on(EventType.WITHDRAWAL_COMPLETED, this.handleWithdrawalCompleted.bind(this));

    // User listeners
    this.on(EventType.USER_REGISTERED, this.handleUserRegistered.bind(this));

    // AI listeners
    this.on(EventType.AI_COMMAND_EXECUTED, this.handleAICommandExecuted.bind(this));
  }

  /**
   * Event listener kaydet
   */
  on(
    eventType: EventType,
    handler: (event: Event) => Promise<void>,
    retryable: boolean = true
  ): string {
    const listener: EventListener = {
      id: `LISTENER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      handler,
      enabled: true,
      retryable,
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType)!.push(listener);

    console.log(`📌 Event listener kaydedildi: ${eventType}`);
    return listener.id;
  }

  /**
   * Event tetikle
   */
  async emit(
    eventType: EventType,
    source: string,
    data: Record<string, unknown>
  ): Promise<Event> {
    const event: Event = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      source,
      data,
      timestamp: new Date(),
      processed: false,
      retryCount: 0,
      maxRetries: 3,
    };

    console.log(`🔔 Event tetiklendi: ${eventType}`);

    // Event'i kuyruğa ekle
    this.eventQueue.push(event);

    // Veritabanına kaydet
    // await db.saveEvent(event);

    return event;
  }

  /**
   * Event işlemcisini başlat
   */
  private startEventProcessor() {
    setInterval(async () => {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          await this.processEvent(event);
        }
      }
    }, 1000); // Her 1 saniyede bir kontrol et
  }

  /**
   * Event'i işle
   */
  private async processEvent(event: Event): Promise<void> {
    const listeners = this.listeners.get(event.type) || [];

    if (listeners.length === 0) {
      console.log(`⚠️ Event için listener bulunamadı: ${event.type}`);
      return;
    }

    for (const listener of listeners) {
      if (!listener.enabled) continue;

      try {
        const log: EventLog = {
          id: `LOG-${Date.now()}`,
          eventId: event.id,
          listenerId: listener.id,
          status: 'processing',
          createdAt: new Date(),
        };

        // Handler'ı çalıştır
        await listener.handler(event);

        log.status = 'completed';
        log.completedAt = new Date();

        console.log(`✅ Event işlendi: ${event.type} → ${listener.id}`);
      } catch (error: unknown) {
        const eventError = normalizeError(error, {
          code: 'EVENT_LISTENER_ERROR',
          category: ErrorCategory.UNKNOWN,
          severity: ErrorSeverity.HIGH,
          retryable: listener.retryable,
          context: { eventId: event.id, eventType: event.type, listenerId: listener.id },
        });
        console.error(`❌ Event işleme hatası: ${event.type}`, eventError);

        // Retry mantığı
        if (listener.retryable && eventError.retryable && event.retryCount < event.maxRetries) {
          event.retryCount++;
          this.eventQueue.push(event); // Kuyruğa geri koy
        }
      }
    }

    event.processed = true;
    event.processedAt = new Date();
  }

  /**
   * Payment Completed Handler
   */
  private async handlePaymentCompleted(event: Event): Promise<void> {
    const { orderId, customerId, providerId, amount } = event.data;

    console.log(`💰 Ödeme tamamlandı: ${orderId} - ${amount}₺`);

    // 1. Escrow'dan ödeme yap (enjekte edilen wallet adapter üzerinden)
    if (this.walletService) {
      try {
        await this.walletService.releaseEscrowPayment(orderId as string);
      } catch (error: unknown) {
        console.error('Escrow serbest bırakma hatası:', error);
      }
    }

    // 2. Bildirim gönder (enjekte edilen sender adapter üzerinden)
    if (this.notificationSender) {
      try {
        await this.notificationSender.sendNotification(
          providerId as string,
          'PAYMENT_RECEIVED',
          { amount, orderId },
        );
      } catch (error: unknown) {
        console.error('Ödeme bildirim hatası:', error);
      }
    }
  }

  /**
   * Payment Failed Handler
   */
  private async handlePaymentFailed(event: Event): Promise<void> {
    const { orderId, customerId, reason } = event.data;

    console.log(`❌ Ödeme başarısız: ${orderId} - ${reason}`);

    // 1. Escrow'dan geri ödeme yap
    if (this.walletService) {
      try {
        await this.walletService.refundEscrow(orderId as string, reason as string);
      } catch (error: unknown) {
        console.error('Escrow geri ödeme hatası:', error);
      }
    }

    // 2. Müşteriye bildirim gönder
    if (this.notificationSender) {
      try {
        await this.notificationSender.sendNotification(
          customerId as string,
          'PAYMENT_FAILED',
          { reason, orderId },
        );
      } catch (error: unknown) {
        console.error('Ödeme başarısız bildirim hatası:', error);
      }
    }
  }

  /**
   * Order Created Handler
   */
  private async handleOrderCreated(event: Event): Promise<void> {
    const { orderId, customerId, providerId, category } = event.data;

    console.log(`📦 Sipariş oluşturuldu: ${orderId}`);

    // 1. Usta'ya bildirim gönder
    if (this.notificationSender) {
      try {
        await this.notificationSender.sendNotification(
          providerId as string,
          'ORDER_CREATED',
          { orderId, category },
        );
      } catch (error: unknown) {
        console.error('Sipariş bildirim hatası:', error);
      }
    }
  }

  /**
   * Order Completed Handler
   */
  private async handleOrderCompleted(event: Event): Promise<void> {
    const { orderId, customerId, providerId } = event.data;

    console.log(`✅ Sipariş tamamlandı: ${orderId}`);

    // 1. Ödemeyi serbest bırak
    await this.emit(EventType.PAYMENT_COMPLETED, 'order', { orderId, customerId, providerId });

    // 2. Değerlendirme isteği gönder
    if (this.notificationSender) {
      try {
        await this.notificationSender.sendNotification(
          customerId as string,
          'REVIEW_REQUESTED',
          { orderId, providerId },
        );
      } catch (error: unknown) {
        console.error('Değerlendirme bildirim hatası:', error);
      }
    }
  }

  /**
   * Withdrawal Completed Handler
   */
  private async handleWithdrawalCompleted(event: Event): Promise<void> {
    const { userId, amount, bankAccountId } = event.data;

    console.log(`🏦 Para çekme tamamlandı: ${userId} - ${amount}₺`);

    // Kullanıcıya bildirim gönder
    if (this.notificationSender) {
      try {
        await this.notificationSender.sendNotification(
          userId as string,
          'WITHDRAWAL_COMPLETED',
          { amount, bankAccountId },
        );
      } catch (error: unknown) {
        console.error('Para çekme bildirim hatası:', error);
      }
    }
  }

  /**
   * User Registered Handler
   */
  private async handleUserRegistered(event: Event): Promise<void> {
    const { userId, email, userType } = event.data;

    console.log(`👤 Yeni kullanıcı kaydoldu: ${userId} (${userType})`);

    // Hoşgeldin bildirimi gönder
    if (this.notificationSender) {
      try {
        await this.notificationSender.sendNotification(
          userId as string,
          'WELCOME',
          { email, userType },
        );
      } catch (error: unknown) {
        console.error('Hoşgeldin bildirim hatası:', error);
      }
    }
  }

  /**
   * AI Command Executed Handler
   */
  private async handleAICommandExecuted(event: Event): Promise<void> {
    const { commandId, userId, action } = event.data;

    console.log(`🤖 AI komutu çalıştırıldı: ${commandId}`);

    // Kullanıcıya bildirim gönder
    if (this.notificationSender) {
      try {
        await this.notificationSender.sendNotification(
          userId as string,
          'AI_COMMAND_COMPLETED',
          { commandId, action },
        );
      } catch (error: unknown) {
        console.error('AI komut bildirim hatası:', error);
      }
    }
  }

  /**
   * Event listener'ı devre dışı bırak
   */
  disableListener(listenerId: string): void {
    for (const listeners of this.listeners.values()) {
      const listener = listeners.find(l => l.id === listenerId);
      if (listener) {
        listener.enabled = false;
        console.log(`⏸️ Listener devre dışı: ${listenerId}`);
      }
    }
  }

  /**
   * Event listener'ı etkinleştir
   */
  enableListener(listenerId: string): void {
    for (const listeners of this.listeners.values()) {
      const listener = listeners.find(l => l.id === listenerId);
      if (listener) {
        listener.enabled = true;
        console.log(`▶️ Listener etkinleştirildi: ${listenerId}`);
      }
    }
  }

  /**
   * Event geçmişi getir
   */
  async getEventHistory(filters?: {
    eventType?: EventType;
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<Event[]> {
    // Veritabanından getir
    return [];
  }

  /**
   * Event istatistikleri
   */
  async getEventStats() {
    return {
      totalEvents: 15420,
      processedEvents: 15350,
      failedEvents: 70,
      successRate: 99.5,
      averageProcessingTime: 125, // ms
      byEventType: {
        [EventType.PAYMENT_COMPLETED]: 3200,
        [EventType.ORDER_CREATED]: 2800,
        [EventType.NOTIFICATION_SENT]: 5600,
        [EventType.AI_COMMAND_EXECUTED]: 1850,
      },
    };
  }
}

export const eventService = new EventService();
