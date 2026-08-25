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

import {
  ErrorCategory,
  ErrorSeverity,
  NotFoundError,
  normalizeError,
} from '../_core/errors';
import { ENV } from "../_core/env";
import { getMarketingConsentPreference, getUserById, setMarketingConsentPreference } from "../db";
import {
  deactivatePushToken,
  getActivePushTokens,
  getStoredNotificationPreferences,
  listInAppNotifications,
  markInAppNotificationRead,
  saveNotificationPreferences,
  saveInAppNotification as persistInAppNotification,
} from "../notifications/push-store";

function normalizeTurkishPhone(destination?: string | null): string | null {
  if (!destination) return null;
  const digits = destination.replace(/\D/g, "");
  const domesticNumber = digits.startsWith("90") ? digits.slice(2) : digits;
  return /^5\d{9}$/.test(domesticNumber) ? domesticNumber : null;
}

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
  data?: Record<string, unknown>;
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
    data: Record<string, unknown>
  ): Promise<NotificationMessage> {
    const numericUserId = Number(userId);
    if (!Number.isSafeInteger(numericUserId) || numericUserId <= 0) {
      throw new Error("NOTIFICATION_RECIPIENT_INVALID");
    }
    if (type === NotificationType.PROMOTION) {
      const marketingConsent = await getMarketingConsentPreference(numericUserId);
      if (!marketingConsent.enabled) throw new Error("MARKETING_CONSENT_REQUIRED");
    }
    // Kullanıcı tercihlerini getir
    const preferences = await this.getUserPreferences(userId);

    // Bildirim şablonunu getir
    const template = this.templates.get(type);
    if (!template) {
      throw new NotFoundError('Bildirim şablonu', { type });
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

    // Her kanala gönder. Bir kanalın başarısızlığı diğer kanalı engellemez;
    // ancak hiçbiri teslim edilemezse işlem başarı olarak raporlanmaz.
    let deliveredChannelCount = 0;
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
        deliveredChannelCount += 1;
      } catch (error: unknown) {
        const channelError = normalizeError(error, {
          code: 'NOTIFICATION_CHANNEL_ERROR',
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.HIGH,
          retryable: true,
          context: { userId, type, channel },
        });
        console.error(`${channel} gönderimi başarısız:`, channelError);
      }
    }

    message.status = deliveredChannelCount > 0 ? 'sent' : 'failed';
    if (deliveredChannelCount > 0) message.sentAt = new Date();

    return message;
  }

  /**
   * Push Notification gönder (Expo)
   */
  private async sendPushNotification(userId: string, message: NotificationMessage) {
    const numericUserId = Number(userId);
    if (!Number.isSafeInteger(numericUserId) || numericUserId <= 0) throw new Error("PUSH_RECIPIENT_INVALID");
    const tokens = await getActivePushTokens(numericUserId);
    if (tokens.length === 0) throw new Error("PUSH_TOKEN_NOT_REGISTERED");

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(tokens.map(({ token }) => ({
        to: token,
        sound: "default",
        title: message.title,
        body: message.body,
        data: message.data ?? {},
      }))),
    });
    if (!response.ok) throw new Error("EXPO_PUSH_PROVIDER_REJECTED");
    const payload = await response.json() as { data?: Array<{ status?: string; details?: { error?: string } }> };
    const tickets = payload.data ?? [];
    await Promise.all(tickets.map(async (ticket, index) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" && tokens[index]) {
        await deactivatePushToken(tokens[index].token);
      }
    }));
    if (tickets.length !== tokens.length || tickets.every((ticket) => ticket.status !== "ok")) {
      throw new Error("EXPO_PUSH_DELIVERY_REJECTED");
    }
  }

  /**
   * SMS gönder (Twilio vb.)
   */
  private async sendSMS(userId: string, message: NotificationMessage) {
    const user = await this.getRecipient(userId);
    const recipient = normalizeTurkishPhone(user.phone);
    if (!recipient) throw new Error("SMS_RECIPIENT_INVALID");
    const body = `${message.title}: ${message.body}`.slice(0, 900);

    if (ENV.netgsmUsername && ENV.netgsmPassword && ENV.netgsmMsgHeader) {
      const credentials = Buffer.from(`${ENV.netgsmUsername}:${ENV.netgsmPassword}`).toString("base64");
      const response = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
        method: "POST",
        headers: { authorization: `Basic ${credentials}`, "content-type": "application/json" },
        body: JSON.stringify({
          msgheader: ENV.netgsmMsgHeader,
          messages: [{ msg: body, no: recipient }],
          encoding: "TR",
          iysfilter: "0",
          appname: "MoveFix",
        }),
      });
      const result = await response.json().catch(() => null) as { code?: string } | null;
      if (!response.ok || result?.code !== "00") throw new Error("NETGSM_SMS_REJECTED");
      return;
    }

    if (!ENV.twilioAccountSid || !ENV.twilioAuthToken || !ENV.twilioFromNumber) {
      throw new Error("SMS_PROVIDER_NOT_CONFIGURED");
    }
    const credentials = Buffer.from(`${ENV.twilioAccountSid}:${ENV.twilioAuthToken}`).toString("base64");
    const form = new URLSearchParams({ To: user.phone!, From: ENV.twilioFromNumber, Body: body });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ENV.twilioAccountSid}/Messages.json`, {
      method: "POST",
      headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!response.ok) throw new Error("TWILIO_SMS_REJECTED");
  }

  /**
   * E-posta gönder (SendGrid vb.)
   */
  private async sendEmail(userId: string, message: NotificationMessage) {
    const user = await this.getRecipient(userId);
    if (!user.email || !ENV.sendgridApiKey || !ENV.verificationEmailFrom) {
      throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
    }
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { authorization: `Bearer ${ENV.sendgridApiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: user.email }] }],
        from: { email: ENV.verificationEmailFrom, name: "Move&Fix" },
        subject: message.title,
        content: [{ type: "text/plain", value: message.body }],
      }),
    });
    if (!response.ok) throw new Error("SENDGRID_EMAIL_REJECTED");
  }

  /**
   * Uygulama içi bildirim kaydet
   */
  private async saveInAppNotification(userId: string, message: NotificationMessage) {
    const numericUserId = Number(userId);
    if (!Number.isSafeInteger(numericUserId) || numericUserId <= 0) throw new Error("IN_APP_RECIPIENT_INVALID");
    await persistInAppNotification({
      userId: numericUserId,
      type: message.type,
      title: message.title,
      body: message.body,
      data: message.data,
    });
  }

  private async getRecipient(userId: string) {
    const numericUserId = Number(userId);
    if (!Number.isSafeInteger(numericUserId) || numericUserId <= 0) throw new Error("NOTIFICATION_RECIPIENT_INVALID");
    const user = await getUserById(numericUserId);
    if (!user) throw new Error("NOTIFICATION_RECIPIENT_NOT_FOUND");
    return user;
  }

  /**
   * Kullanıcı tercihlerini getir
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    const numericUserId = Number(userId);
    if (!Number.isSafeInteger(numericUserId) || numericUserId <= 0) {
      throw new Error("NOTIFICATION_RECIPIENT_INVALID");
    }
    const defaults: NotificationPreference = {
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
    const stored = await getStoredNotificationPreferences(numericUserId);
    if (!stored) return defaults;
    return {
      userId,
      channels: { ...defaults.channels, ...stored.channels },
      notificationTypes: { ...defaults.notificationTypes, ...stored.notificationTypes },
    } as NotificationPreference;
  }

  /**
   * Kullanıcı tercihlerini güncelle
   */
  async updateUserPreferences(
    userId: string,
    preferences: {
      channels?: Partial<Record<NotificationChannel, { enabled: boolean; quietHours?: { start: string; end: string } }>>;
      notificationTypes?: Partial<Record<NotificationType, { enabled: boolean; channels?: NotificationChannel[] }>>;
    }
  ): Promise<NotificationPreference> {
    const numericUserId = Number(userId);
    if (!Number.isSafeInteger(numericUserId) || numericUserId <= 0) {
      throw new Error("NOTIFICATION_RECIPIENT_INVALID");
    }
    const current = await this.getUserPreferences(userId);
    const updated: NotificationPreference = {
      userId,
      channels: { ...current.channels, ...preferences.channels },
      notificationTypes: { ...current.notificationTypes, ...preferences.notificationTypes },
    };
    const promotionPreference = preferences.notificationTypes?.[NotificationType.PROMOTION];
    if (promotionPreference) {
      await setMarketingConsentPreference({
        userId: numericUserId,
        enabled: promotionPreference.enabled,
        source: "notification_preferences",
      });
    }
    await saveNotificationPreferences({
      userId: numericUserId,
      preferences: {
        channels: updated.channels,
        notificationTypes: updated.notificationTypes,
      },
    });
    return updated;
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
  private interpolateTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/{{(\w+)}}/g, (match, key) => {
      const value = data[key];
      return value === undefined || value === null ? match : String(value);
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
    const numericUserId = Number(userId);
    if (!Number.isSafeInteger(numericUserId) || numericUserId <= 0) {
      throw new Error("NOTIFICATION_RECIPIENT_INVALID");
    }
    const safeLimit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const rows = await listInAppNotifications(numericUserId, safeLimit);
    return rows
      .filter((row) => !filters?.type || row.type === filters.type)
      .filter((row) => !filters?.status || row.status === filters.status)
      .slice(Math.max(filters?.offset ?? 0, 0))
      .map((row) => ({
        id: String(row.id),
        userId,
        type: row.type as NotificationType,
        channels: [NotificationChannel.IN_APP],
        title: row.title,
        body: row.body,
        data: row.dataJson ? JSON.parse(row.dataJson) as Record<string, unknown> : undefined,
        status: row.status as NotificationMessage["status"],
        sentAt: row.status === "sent" ? row.createdAt : undefined,
        readAt: row.readAt ?? undefined,
        createdAt: row.createdAt,
      }));
  }

  /**
   * Bildirimi okundu olarak işaretle
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const numericUserId = Number(userId);
    const numericNotificationId = Number(notificationId);
    if (!Number.isSafeInteger(numericUserId) || numericUserId <= 0 || !Number.isSafeInteger(numericNotificationId) || numericNotificationId <= 0) {
      throw new Error("NOTIFICATION_IDENTIFIER_INVALID");
    }
    await markInAppNotificationRead(numericUserId, numericNotificationId);
    return true;
  }

  /**
   * Toplu bildirim gönder (Kampanya vb.)
   */
  async sendBulkNotification(
    userIds: string[],
    type: NotificationType,
    data: Record<string, unknown>
  ): Promise<NotificationMessage[]> {
    const messages: NotificationMessage[] = [];

    for (const userId of userIds) {
      try {
        const message = await this.sendNotification(userId, type, data);
        messages.push(message);
      } catch (error: unknown) {
        const notificationError = normalizeError(error, {
          code: 'NOTIFICATION_DELIVERY_ERROR',
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.HIGH,
          retryable: true,
          context: { userId, type },
        });
        console.error(`Kullanıcı ${userId} için bildirim gönderilemedi:`, notificationError);
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
      throw new NotFoundError('Bildirim şablonu', { type });
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
