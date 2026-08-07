/**
 * Notification Service - Multi-Channel Notification Center
 * 
 * Kanallar:
 * - Push Notification (Expo)
 * - SMS (Twilio vb.)
 * - E-posta (SendGrid vb.)
 * - Uygulama İçi (Database)
 * 
 * Sorumluluğu:
 * - Bildirim gönderme
 * - Bildirim tercihlerini yönetme
 * - Bildirim geçmişi
 * - Bildirim şablonları
 * - Bildirim kuyruğu
 */

export enum NotificationChannel {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export enum NotificationType {
  ORDER_CREATED = 'order_created',
  ORDER_ACCEPTED = 'order_accepted',
  ORDER_COMPLETED = 'order_completed',
  ORDER_CANCELLED = 'order_cancelled',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  PROVIDER_NEARBY = 'provider_nearby',
  MESSAGE_RECEIVED = 'message_received',
  REVIEW_REQUESTED = 'review_requested',
  PROMOTION = 'promotion',
  SYSTEM_ALERT = 'system_alert',
}

export interface NotificationPreference {
  userId: string;
  channels: {
    [key in NotificationChannel]?: {
      enabled: boolean;
      quietHours?: { start: string; end: string }; // "09:00" - "21:00"
    };
  };
  notificationTypes: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels?: NotificationChannel[];
    };
  };
}

export interface NotificationMessage {
  id: string;
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  title: string;
  body: string;
  data?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'read';
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  bodyTemplate: string; // {{variable}} syntax
  channels: NotificationChannel[];
  active: boolean;
}

export class NotificationService {
  private templates: Map<NotificationType, NotificationTemplate> = new Map();
  private queue: NotificationMessage[] = [];

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Bildirim şablonlarını başlat
   */
  private initializeTemplates() {
    this.templates.set(NotificationType.ORDER_CREATED, {
      id: 'tpl-order-created',
      type: NotificationType.ORDER_CREATED,
      title: 'Yeni Sipariş',
      bodyTemplate: '{{providerName}}, {{categoryName}} kategorisinde yeni bir sipariş var!',
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      active: true,
    });

    this.templates.set(NotificationType.ORDER_COMPLETED, {
      id: 'tpl-order-completed',
      type: NotificationType.ORDER_COMPLETED,
      title: 'Sipariş Tamamlandı',
      bodyTemplate: '{{providerName}} siparişinizi tamamladı. Değerlendirme yapmayı unutmayın!',
      channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      active: true,
    });

    this.templates.set(NotificationType.PAYMENT_RECEIVED, {
      id: 'tpl-payment-received',
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'Ödeme Alındı',
      bodyTemplate: '₺{{amount}} ödemeniz başarıyla alındı.',
      channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.EMAIL],
      active: true,
    });

    this.templates.set(NotificationType.MESSAGE_RECEIVED, {
      id: 'tpl-message-received',
      type: NotificationType.MESSAGE_RECEIVED,
      title: 'Yeni Mesaj',
      bodyTemplate: '{{senderName}}: {{messagePreview}}',
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      active: true,
    });
  }

  /**
   * Bildirim gönder
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    data: Record<string, any>
  ): Promise<NotificationMessage> {
    // Kullanıcı tercihlerini getir
    const preferences = await this.getUserPreferences(userId);

    // Bildirim şablonunu getir
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Bildirim şablonu bulunamadı: ${type}`);
    }

    // Başlık ve gövdeyi hazırla
    const title = template.title;
    const body = this.interpolateTemplate(template.bodyTemplate, data);

    // Etkin kanalları belirle
    const channels = this.getEnabledChannels(
      preferences,
      type,
      template.channels
    );

    if (channels.length === 0) {
      console.log(`Kullanıcı ${userId} için bildirim devre dışı`);
      return {
        id: `NOTIF-${Date.now()}`,
        userId,
        type,
        channels: [],
        title,
        body,
        status: 'pending',
        createdAt: new Date(),
      };
    }

    // Bildirim mesajı oluştur
    const message: NotificationMessage = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      channels,
      title,
      body,
      data,
      status: 'pending',
      createdAt: new Date(),
    };

    // Her kanala gönder
    for (const channel of channels) {
      try {
        switch (channel) {
          case NotificationChannel.PUSH:
            await this.sendPushNotification(userId, message);
            break;
          case NotificationChannel.SMS:
            await this.sendSMS(userId, message);
            break;
          case NotificationChannel.EMAIL:
            await this.sendEmail(userId, message);
            break;
          case NotificationChannel.IN_APP:
            await this.saveInAppNotification(userId, message);
            break;
        }
      } catch (error) {
        console.error(`${channel} gönderimi başarısız:`, error);
      }
    }

    message.status = 'sent';
    message.sentAt = new Date();

    return message;
  }

  /**
   * Push Notification gönder (Expo)
   */
  private async sendPushNotification(userId: string, message: NotificationMessage) {
    // Expo Push Notification API'sine gönder
    // const expoPushToken = await this.getExpoPushToken(userId);
    // await fetch('https://exp.host/--/api/v2/push/send', { ... })
    console.log(`📱 Push: ${message.title} → ${userId}`);
  }

  /**
   * SMS gönder (Twilio vb.)
   */
  private async sendSMS(userId: string, message: NotificationMessage) {
    // Twilio API'sine gönder
    // const phoneNumber = await this.getUserPhoneNumber(userId);
    // await twilio.messages.create({ ... })
    console.log(`📱 SMS: ${message.title} → ${userId}`);
  }

  /**
   * E-posta gönder (SendGrid vb.)
   */
  private async sendEmail(userId: string, message: NotificationMessage) {
    // SendGrid API'sine gönder
    // const email = await this.getUserEmail(userId);
    // await sendgrid.send({ ... })
    console.log(`📧 Email: ${message.title} → ${userId}`);
  }

  /**
   * Uygulama içi bildirim kaydet
   */
  private async saveInAppNotification(userId: string, message: NotificationMessage) {
    // Veritabanına kaydet
    // await db.saveInAppNotification(message);
    console.log(`🔔 In-App: ${message.title} → ${userId}`);
  }

  /**
   * Kullanıcı tercihlerini getir
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    // Veritabanından getir
    // Mock implementasyon
    return {
      userId,
      channels: {
        [NotificationChannel.PUSH]: { enabled: true },
        [NotificationChannel.SMS]: { enabled: true, quietHours: { start: '22:00', end: '08:00' } },
        [NotificationChannel.EMAIL]: { enabled: true },
        [NotificationChannel.IN_APP]: { enabled: true },
      },
      notificationTypes: {
        [NotificationType.ORDER_CREATED]: { enabled: true },
        [NotificationType.MESSAGE_RECEIVED]: { enabled: true },
        [NotificationType.PROMOTION]: { enabled: false },
      },
    };
  }

  /**
   * Kullanıcı tercihlerini güncelle
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    // Veritabanına kaydet
    // await db.updateUserPreferences(userId, preferences);
    return {
      userId,
      channels: preferences.channels || {},
      notificationTypes: preferences.notificationTypes || {},
    };
  }

  /**
   * Etkin kanalları belirle
   */
  private getEnabledChannels(
    preferences: NotificationPreference,
    type: NotificationType,
    defaultChannels: NotificationChannel[]
  ): NotificationChannel[] {
    const enabledChannels: NotificationChannel[] = [];

    // Bildirim türü tercihlerini kontrol et
    const typePreference = preferences.notificationTypes[type];
    if (typePreference && !typePreference.enabled) {
      return []; // Bildirim türü devre dışı
    }

    // Tercih edilen kanalları kontrol et
    const preferredChannels = typePreference?.channels || defaultChannels;

    for (const channel of preferredChannels) {
      const channelPreference = preferences.channels[channel];
      if (channelPreference?.enabled) {
        enabledChannels.push(channel);
      }
    }

    return enabledChannels;
  }

  /**
   * Şablonu değişkenlerle doldur
   */
  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/{{(\w+)}}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Bildirim geçmişi getir
   */
  async getNotificationHistory(
    userId: string,
    filters?: {
      type?: NotificationType;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<NotificationMessage[]> {
    // Veritabanından getir
    // Mock implementasyon
    return [];
  }

  /**
   * Bildirimi okundu olarak işaretle
   */
  async markAsRead(notificationId: string): Promise<NotificationMessage | null> {
    // Veritabanında güncelle
    // Mock implementasyon
    return null;
  }

  /**
   * Toplu bildirim gönder (Kampanya vb.)
   */
  async sendBulkNotification(
    userIds: string[],
    type: NotificationType,
    data: Record<string, any>
  ): Promise<NotificationMessage[]> {
    const messages: NotificationMessage[] = [];

    for (const userId of userIds) {
      try {
        const message = await this.sendNotification(userId, type, data);
        messages.push(message);
      } catch (error) {
        console.error(`Kullanıcı ${userId} için bildirim gönderilemedi:`, error);
      }
    }

    return messages;
  }

  /**
   * Bildirim şablonlarını yönet (Admin)
   */
  async updateTemplate(
    type: NotificationType,
    template: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate> {
    const existing = this.templates.get(type);
    if (!existing) {
      throw new Error(`Şablon bulunamadı: ${type}`);
    }

    const updated = { ...existing, ...template };
    this.templates.set(type, updated);

    return updated;
  }

  /**
   * Bildirim istatistikleri (Admin)
   */
  async getNotificationStats(dateRange?: { from: Date; to: Date }) {
    return {
      totalSent: 15420,
      totalRead: 12350,
      readRate: 80.1,
      byChannel: {
        [NotificationChannel.PUSH]: 8500,
        [NotificationChannel.EMAIL]: 4200,
        [NotificationChannel.SMS]: 1800,
        [NotificationChannel.IN_APP]: 920,
      },
      byType: {
        [NotificationType.ORDER_CREATED]: 5200,
        [NotificationType.MESSAGE_RECEIVED]: 3400,
        [NotificationType.PAYMENT_RECEIVED]: 2800,
      },
    };
  }
}

export const notificationService = new NotificationService();
