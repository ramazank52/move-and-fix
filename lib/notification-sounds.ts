import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export type NotificationType =
  | "new_offer"
  | "new_message"
  | "provider_approaching"
  | "provider_arrived"
  | "job_completed"
  | "payment_received"
  | "review_received"
  | "promotion";

interface NotificationConfig {
  title: string;
  hapticType: "light" | "medium" | "heavy" | "success" | "warning" | "error";
  vibrationPattern: number[];
  soundName: string;
  priority: "low" | "normal" | "high" | "urgent";
}

const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationConfig> = {
  new_offer: {
    title: "Yeni Teklif",
    hapticType: "medium",
    vibrationPattern: [0, 200, 100, 200],
    soundName: "offer",
    priority: "high",
  },
  new_message: {
    title: "Yeni Mesaj",
    hapticType: "light",
    vibrationPattern: [0, 150],
    soundName: "message",
    priority: "normal",
  },
  provider_approaching: {
    title: "Usta Yaklaşıyor",
    hapticType: "medium",
    vibrationPattern: [0, 100, 50, 100, 50, 100],
    soundName: "approaching",
    priority: "high",
  },
  provider_arrived: {
    title: "Usta Geldi!",
    hapticType: "heavy",
    vibrationPattern: [0, 300, 100, 300],
    soundName: "arrived",
    priority: "urgent",
  },
  job_completed: {
    title: "İş Tamamlandı",
    hapticType: "success",
    vibrationPattern: [0, 200, 100, 400],
    soundName: "complete",
    priority: "high",
  },
  payment_received: {
    title: "Ödeme Alındı",
    hapticType: "success",
    vibrationPattern: [0, 150, 100, 150],
    soundName: "payment",
    priority: "normal",
  },
  review_received: {
    title: "Yeni Değerlendirme",
    hapticType: "light",
    vibrationPattern: [0, 100],
    soundName: "review",
    priority: "low",
  },
  promotion: {
    title: "Kampanya",
    hapticType: "light",
    vibrationPattern: [0, 100],
    soundName: "promo",
    priority: "low",
  },
};

export async function triggerNotificationFeedback(type: NotificationType): Promise<void> {
  if (Platform.OS === "web") return;

  const config = NOTIFICATION_CONFIGS[type];

  try {
    switch (config.hapticType) {
      case "light":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (e) {
    // Haptics not available
  }
}

export function getNotificationConfig(type: NotificationType): NotificationConfig {
  return NOTIFICATION_CONFIGS[type];
}

export interface NotificationSoundSettings {
  enabled: boolean;
  vibrationEnabled: boolean;
  soundVolume: number; // 0-1
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "23:00"
  quietHoursEnd: string; // "07:00"
  perTypeSettings: Record<NotificationType, { sound: boolean; vibration: boolean }>;
}

export const DEFAULT_SOUND_SETTINGS: NotificationSoundSettings = {
  enabled: true,
  vibrationEnabled: true,
  soundVolume: 0.8,
  quietHoursEnabled: false,
  quietHoursStart: "23:00",
  quietHoursEnd: "07:00",
  perTypeSettings: {
    new_offer: { sound: true, vibration: true },
    new_message: { sound: true, vibration: true },
    provider_approaching: { sound: true, vibration: true },
    provider_arrived: { sound: true, vibration: true },
    job_completed: { sound: true, vibration: true },
    payment_received: { sound: true, vibration: true },
    review_received: { sound: true, vibration: false },
    promotion: { sound: false, vibration: false },
  },
};
