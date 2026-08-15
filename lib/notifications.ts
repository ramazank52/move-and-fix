import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Notification types for Move&Fix
export type NotificationType =
  | "new_offer"
  | "offer_accepted"
  | "message"
  | "payment"
  | "job_started"
  | "job_completed"
  | "provider_arriving"
  | "review_request"
  | "promotion"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
}

// Notification channel configuration
export const NOTIFICATION_CHANNELS = {
  messages: {
    id: "messages",
    name: "Mesajlar",
    description: "Yeni mesaj bildirimleri",
    importance: 4, // HIGH
    sound: true,
    vibrate: true,
  },
  offers: {
    id: "offers",
    name: "Teklifler",
    description: "Yeni teklif ve teklif güncellemeleri",
    importance: 4,
    sound: true,
    vibrate: true,
  },
  payments: {
    id: "payments",
    name: "Ödemeler",
    description: "Ödeme bildirimleri",
    importance: 3, // DEFAULT
    sound: true,
    vibrate: false,
  },
  jobs: {
    id: "jobs",
    name: "İş Güncellemeleri",
    description: "İş durumu değişiklikleri",
    importance: 4,
    sound: true,
    vibrate: true,
  },
  promotions: {
    id: "promotions",
    name: "Kampanyalar",
    description: "Kampanya ve indirim bildirimleri",
    importance: 2, // LOW
    sound: false,
    vibrate: false,
  },
};

// Register for push notifications
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Move&Fix bildirimleri",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    const permission = existing.status === "granted"
      ? existing
      : await Notifications.requestPermissionsAsync();
    if (permission.status !== "granted") return null;

    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}

// Schedule a local notification
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, string>,
  delaySeconds?: number
) {
  if (Platform.OS === "web") return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: delaySeconds ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds } : null,
  });
}

// Sample notifications for demo
export const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: "1",
    type: "new_offer",
    title: "Yeni Teklif!",
    body: "Ahmet Yılmaz klima bakımı için ₺850 teklif verdi.",
    data: { jobId: "1", providerId: "1" },
    read: false,
    createdAt: "2026-08-06T14:30:00Z",
  },
  {
    id: "2",
    type: "provider_arriving",
    title: "Usta Yolda!",
    body: "Mehmet Demir 12 dakika içinde konumunuza ulaşacak.",
    data: { jobId: "2", providerId: "2" },
    read: false,
    createdAt: "2026-08-06T13:45:00Z",
  },
  {
    id: "3",
    type: "message",
    title: "Yeni Mesaj",
    body: "Ahmet Usta: Yarın saat 10'da gelirim, uygun mu?",
    data: { chatId: "1" },
    read: true,
    createdAt: "2026-08-06T12:00:00Z",
  },
  {
    id: "4",
    type: "payment",
    title: "Ödeme Onaylandı",
    body: "₺1.200 tutarındaki ödemeniz başarıyla tamamlandı.",
    data: { paymentId: "pay_123" },
    read: true,
    createdAt: "2026-08-05T16:00:00Z",
  },
  {
    id: "5",
    type: "job_completed",
    title: "İş Tamamlandı!",
    body: "Klima montajı başarıyla tamamlandı. Değerlendirmenizi bekliyoruz.",
    data: { jobId: "3" },
    read: true,
    createdAt: "2026-08-05T10:00:00Z",
  },
  {
    id: "6",
    type: "promotion",
    title: "🎉 Özel Kampanya!",
    body: "İlk hizmetinize %20 indirim! Kod: HOSGELDIN20",
    read: true,
    createdAt: "2026-08-04T09:00:00Z",
  },
];
