import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useCallback, useState } from "react";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { localeForLanguage } from "@/lib/i18n-core";
import { trpc } from "@/lib/trpc";

function formatConversationTime(value: Date | string | null, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export default function MessagesScreen() {
  const colors = useColors();
  const { t, language } = useTranslation();
  const router = useRouter();
  const locale = localeForLanguage(language);
  const [refreshing, setRefreshing] = useState(false);
  const conversationsQuery = trpc.messages.list.useQuery(undefined, {
    refetchOnMount: true,
    refetchInterval: 15_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await conversationsQuery.refetch();
    setRefreshing(false);
  }, [conversationsQuery]);

  return (
    <ScreenContainer className="px-5 pt-5">
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: "800", color: colors.foreground }}>
          {t("messages.title")}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 18, color: colors.muted }}>
          {t("messages.subtitle")}
        </Text>
      </View>

      {conversationsQuery.isLoading ? (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>{t("messages.loading")}</Text>
        </View>
      ) : conversationsQuery.isError ? (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: colors.error + "12",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <IconSymbol name="wifi.exclamationmark" size={30} color={colors.error} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
            {t("messages.errorTitle")}
          </Text>
          <Text style={{ marginTop: 6, marginBottom: 16, fontSize: 13, color: colors.muted, textAlign: "center" }}>
            {t("messages.errorBody")}
          </Text>
          <Pressable
            onPress={() => conversationsQuery.refetch()}
            style={({ pressed }) => ({
              paddingHorizontal: 20,
              paddingVertical: 11,
              borderRadius: 12,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>{t("messages.retry")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversationsQuery.data ?? []}
          keyExtractor={(item) => `${item.requestId ?? "legacy"}:${item.otherUserId}`}
          contentContainerStyle={{ gap: 10, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            return (
              <Pressable
                onPress={() => {
                  if (item.requestId == null) return;
                  router.push(`/chat/${item.requestId}?otherUserId=${item.otherUserId}` as never);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: colors.card,
                  borderWidth: item.unreadCount > 0 ? 1 : 0.5,
                  borderColor: item.unreadCount > 0 ? colors.primary + "70" : colors.border,
                  opacity: pressed ? 0.86 : 1,
                })}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 17,
                    backgroundColor: colors.primary + "18",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 13,
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 19 }}>
                    {item.displayName.charAt(0).toLocaleUpperCase("tr-TR")}
                  </Text>
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Text
                        numberOfLines={1}
                        style={{ flexShrink: 1, fontWeight: item.unreadCount > 0 ? "800" : "700", color: colors.foreground, fontSize: 15 }}
                      >
                        {item.displayName}
                      </Text>
                      {item.isVerified ? (
                        <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} />
                      ) : null}
                    </View>
                    <Text style={{ color: item.unreadCount > 0 ? colors.primary : colors.muted, fontSize: 11, fontWeight: "600" }}>
                      {formatConversationTime(item.lastMessageAt, locale)}
                    </Text>
                  </View>

                  {item.requestTitle ? (
                    <Text numberOfLines={1} style={{ marginTop: 2, color: colors.primary, fontSize: 11, fontWeight: "700" }}>
                      {item.requestTitle}
                    </Text>
                  ) : null}

                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, color: item.unreadCount > 0 ? colors.foreground : colors.muted, fontSize: 13, fontWeight: item.unreadCount > 0 ? "600" : "400" }}
                    >
                      {item.lastMessage}
                    </Text>
                    {item.unreadCount > 0 ? (
                      <View
                        style={{
                          minWidth: 22,
                          height: 22,
                          borderRadius: 11,
                          marginLeft: 8,
                          paddingHorizontal: 6,
                          backgroundColor: colors.primary,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>
                          {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  backgroundColor: colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              >
                <IconSymbol name="message.fill" size={30} color={colors.muted} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                {t("messages.emptyTitle")}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: "center" }}>
                {t("messages.emptyBody")}
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}
