import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";

export default function MessagesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user's service requests to derive conversations
  const requestsQuery = trpc.requests.list.useQuery(undefined, {
    refetchOnMount: true,
  });

  // Build conversation list from requests that have an assigned provider
  const conversations = ((requestsQuery.data as any[]) || [])
    .filter((req) => req.assignedProviderId || req.providerId)
    .map((req) => ({
      id: String(req.id),
      name: req.providerName || req.title || "Usta",
      lastMessage: req.description || req.title || "",
      time: req.createdAt ? new Date(req.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "",
      unread: 0,
      otherUserId: req.assignedProviderId || req.providerId,
    }));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await requestsQuery.refetch();
    setRefreshing(false);
  }, [requestsQuery]);

  return (
    <ScreenContainer className="px-5 pt-6">
      {/* Title */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>
          Mesajlar
        </Text>
        <Pressable
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.card,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 0.5,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <IconSymbol name="square.and.pencil" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Loading State */}
      {requestsQuery.isLoading && (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>Yükleniyor...</Text>
        </View>
      )}

      {/* Error State */}
      {requestsQuery.isError && (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: colors.error + "10",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <IconSymbol name="wifi.exclamationmark" size={30} color={colors.error} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 6 }}>
            Bağlantı hatası
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: 16 }}>
            Mesajlar yüklenemedi. Lütfen tekrar deneyin.
          </Text>
          <Pressable
            onPress={() => requestsQuery.refetch()}
            style={({ pressed }) => [
              {
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={{ color: "#FFF", fontWeight: "600", fontSize: 14 }}>Tekrar Dene</Text>
          </Pressable>
        </View>
      )}

      {/* Conversation List */}
      {requestsQuery.isSuccess && (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/chat/${item.id}?otherUserId=${item.otherUserId}` as any)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: colors.card,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: colors.primary + "15",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 18 }}>
                  {item.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 15 }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{item.time}</Text>
                </View>
                <Text
                  style={{ color: colors.muted, fontSize: 14, marginTop: 3 }}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
              </View>
              {item.unread > 0 && (
                <View
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                    paddingHorizontal: 6,
                  }}
                >
                  <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>
                    {item.unread}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
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
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 6 }}>
                Henüz mesajınız yok
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                Bir usta ile iletişime geçtiğinizde mesajlarınız burada görünecek
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}
