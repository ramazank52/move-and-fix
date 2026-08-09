import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ChatRoomScreen() {
  const { id, requestId: requestIdParam, otherUserId } = useLocalSearchParams<{
    id: string;
    requestId?: string;
    otherUserId?: string;
  }>();
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const markedReadForRef = useRef("");
  const otherUid = Number(otherUserId);
  const parsedRequestId = Number(requestIdParam ?? id);
  const requestId = Number.isInteger(parsedRequestId) && parsedRequestId > 0 ? parsedRequestId : undefined;
  const hasValidConversationContext =
    requestId != null && Number.isInteger(otherUid) && otherUid > 0;

  const participantQuery = trpc.messages.participant.useQuery(
    { requestId: requestId ?? 0, otherUserId: otherUid },
    { enabled: hasValidConversationContext },
  );
  const messagesQuery = trpc.messages.conversation.useQuery(
    { requestId: requestId ?? 0, otherUserId: otherUid },
    {
      enabled: hasValidConversationContext,
      refetchInterval: 5_000,
    },
  );
  const markReadMutation = trpc.messages.markRead.useMutation({
    onSuccess: () => utils.messages.list.invalidate(),
  });
  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: async () => {
      setInput("");
      await Promise.all([messagesQuery.refetch(), utils.messages.list.invalidate()]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    },
  });

  useEffect(() => {
    if (
      messagesQuery.data &&
      requestId != null &&
      otherUid > 0 &&
      markedReadForRef.current !== `${requestId}:${otherUid}`
    ) {
      markedReadForRef.current = `${requestId}:${otherUid}`;
      markReadMutation.mutate({ requestId, otherUserId: otherUid });
    }
  }, [messagesQuery.data, otherUid, requestId, markReadMutation]);

  const sendMessage = useCallback(() => {
    const content = input.trim();
    if (!content || !hasValidConversationContext || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({
      receiverId: otherUid,
      content,
      requestId,
    });
  }, [hasValidConversationContext, input, otherUid, requestId, sendMessageMutation]);

  const participantName = participantQuery.data?.displayName ?? "Profesyonel";
  const participantInitial = participantName.charAt(0).toLocaleUpperCase("tr-TR");

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ padding: 5, opacity: pressed ? 0.6 : 1 })}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: colors.primary + "18",
            alignItems: "center",
            justifyContent: "center",
            marginHorizontal: 10,
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 17 }}>
            {participantInitial}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontWeight: "800", color: colors.foreground }}>
              {participantName}
            </Text>
            {participantQuery.data?.isVerified ? (
              <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} />
            ) : null}
          </View>
          <Text style={{ marginTop: 2, fontSize: 12, color: colors.muted }}>
            {participantQuery.data?.isProvider
              ? participantQuery.data.rating
                ? `Profesyonel · ${Number(participantQuery.data.rating).toFixed(1)} puan`
                : "Profesyonel"
              : "Move&Fix kullanıcısı"}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
        <FlatList
          ref={flatListRef}
          data={messagesQuery.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 10, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            !hasValidConversationContext ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <IconSymbol name="exclamationmark.shield.fill" size={30} color={colors.error} />
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8 }}>
                  Bu sohbet için geçerli bir hizmet kaydı gerekli.
                </Text>
              </View>
            ) : messagesQuery.isLoading ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>Mesajlar yükleniyor...</Text>
              </View>
            ) : messagesQuery.isError ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <IconSymbol name="wifi.exclamationmark" size={30} color={colors.error} />
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8 }}>Mesajlar yüklenemedi</Text>
              </View>
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    backgroundColor: colors.card,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <IconSymbol name="message.fill" size={26} color={colors.muted} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>Henüz mesaj yok</Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>İlk mesajı gönderin</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", justifyContent: item.isOwn ? "flex-end" : "flex-start" }}>
              {!item.isOwn ? (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 11,
                    backgroundColor: colors.primary + "18",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                    marginTop: 4,
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>{participantInitial}</Text>
                </View>
              ) : null}
              <View
                style={{
                  maxWidth: "78%",
                  backgroundColor: item.isOwn ? colors.primary : colors.card,
                  borderRadius: 18,
                  borderBottomRightRadius: item.isOwn ? 6 : 18,
                  borderBottomLeftRadius: item.isOwn ? 18 : 6,
                  paddingHorizontal: 15,
                  paddingVertical: 10,
                  borderWidth: 0.5,
                  borderColor: item.isOwn ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 14, color: item.isOwn ? "#FFFFFF" : colors.foreground, lineHeight: 20 }}>
                  {item.content}
                </Text>
                <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                  <Text style={{ fontSize: 10, color: item.isOwn ? "#FFFFFFB3" : colors.muted }}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </Text>
                  {item.isOwn ? (
                    <Text style={{ fontSize: 10, color: item.isRead === 1 ? "#D8E5FF" : "#FFFFFF8C" }}>
                      {item.isRead === 1 ? "✓✓" : "✓"}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}
        />

        {sendMessageMutation.isError ? (
          <Text style={{ paddingHorizontal: 16, paddingBottom: 6, color: colors.error, fontSize: 12 }}>
            Mesaj gönderilemedi. Lütfen tekrar deneyin.
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: Platform.OS === "web" ? 12 : 8,
            backgroundColor: colors.background,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            gap: 10,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Mesaj yazın..."
            placeholderTextColor={colors.muted}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            multiline
            maxLength={4000}
            style={{
              flex: 1,
              minHeight: 42,
              maxHeight: 104,
              backgroundColor: colors.card,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.foreground,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
          />
          <Pressable
            onPress={sendMessage}
            disabled={!input.trim() || sendMessageMutation.isPending || otherUid <= 0}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 15,
              backgroundColor:
                !input.trim() || sendMessageMutation.isPending || otherUid <= 0
                  ? colors.muted
                  : colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed && input.trim() ? 0.82 : 1,
            })}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
