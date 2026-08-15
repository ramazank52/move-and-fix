import { and, desc, eq } from "drizzle-orm";

import { inAppNotifications, userNotificationPreferences, userPushTokens } from "../../drizzle/schema";
import { getDb } from "../db";

export type PushPlatform = "ios" | "android";

export type StoredNotificationPreferences = {
  channels: Record<string, { enabled: boolean; quietHours?: { start: string; end: string } }>;
  notificationTypes: Record<string, { enabled: boolean; channels?: string[] }>;
};

export async function getStoredNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId)).limit(1);
  if (!row) return null;
  try {
    return {
      channels: JSON.parse(row.channelsJson) as StoredNotificationPreferences["channels"],
      notificationTypes: JSON.parse(row.notificationTypesJson) as StoredNotificationPreferences["notificationTypes"],
    } satisfies StoredNotificationPreferences;
  } catch {
    throw new Error("NOTIFICATION_PREFERENCES_CORRUPTED");
  }
}

export async function saveNotificationPreferences(input: {
  userId: number;
  preferences: StoredNotificationPreferences;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const values = {
    userId: input.userId,
    channelsJson: JSON.stringify(input.preferences.channels),
    notificationTypesJson: JSON.stringify(input.preferences.notificationTypes),
  };
  await db.insert(userNotificationPreferences).values(values).onDuplicateKeyUpdate({
    set: {
      channelsJson: values.channelsJson,
      notificationTypesJson: values.notificationTypesJson,
      updatedAt: new Date(),
    },
  });
}

export async function upsertPushToken(input: {
  userId: number;
  token: string;
  platform: PushPlatform;
  deviceId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");

  await db.insert(userPushTokens).values({
    userId: input.userId,
    token: input.token,
    platform: input.platform,
    deviceId: input.deviceId,
    active: 1,
    lastSeenAt: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      userId: input.userId,
      platform: input.platform,
      deviceId: input.deviceId,
      active: 1,
      lastSeenAt: new Date(),
    },
  });
}

export async function getActivePushTokens(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userPushTokens).where(and(eq(userPushTokens.userId, userId), eq(userPushTokens.active, 1)));
}

export async function deactivatePushToken(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(userPushTokens).set({ active: 0 }).where(eq(userPushTokens.token, token));
}

export async function saveInAppNotification(input: {
  userId: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status?: "pending" | "sent" | "failed" | "read";
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const dataJson = input.data && Object.keys(input.data).length > 0 ? JSON.stringify(input.data) : null;
  const inserted = await db.insert(inAppNotifications).values({
    userId: input.userId,
    type: input.type.slice(0, 80),
    title: input.title.slice(0, 200),
    body: input.body,
    dataJson,
    status: input.status ?? "sent",
  });
  return inserted[0].insertId;
}

export async function listInAppNotifications(userId: number, limit: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inAppNotifications)
    .where(eq(inAppNotifications.userId, userId))
    .orderBy(desc(inAppNotifications.createdAt))
    .limit(limit);
}

export async function markInAppNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.update(inAppNotifications).set({ status: "read", readAt: new Date() })
    .where(and(eq(inAppNotifications.id, notificationId), eq(inAppNotifications.userId, userId)));
}
