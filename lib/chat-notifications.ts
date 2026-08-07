import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface ChatNotification {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  read: boolean;
}

let notificationListener: any;
let responseListener: any;

export async function initializeChatNotifications() {
  if (Platform.OS === "web") return;

  // Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("Notification permissions not granted");
    return;
  }

  // Set notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Listen for notifications
  notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log("Notification received:", notification);
  });

  // Listen for notification responses
  responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("Notification response:", response);
  });
}

export async function sendChatNotification(notification: ChatNotification) {
  if (Platform.OS === "web") return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.senderName,
        body: notification.message,
        data: {
          senderId: notification.senderId,
          timestamp: notification.timestamp,
        },
        sound: "default",
        badge: 1,
      },
      trigger: null,
    });
  } catch (error) {
    console.error("Error sending chat notification:", error);
  }
}

export function cleanupChatNotifications() {
  if (notificationListener) {
    notificationListener.remove();
  }
  if (responseListener) {
    responseListener.remove();
  }
}
