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
