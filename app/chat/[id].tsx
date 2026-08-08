import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Pressable, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
}

export default function ChatRoomScreen() {
  const { id, otherUserId } = useLocalSearchParams<{ id: string; otherUserId?: string }>();
  const colors = useColors();
  const router = useRouter();
  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Fetch conversation messages
  const otherUid = otherUserId ? parseInt(otherUserId, 10) : 0;
  const messagesQuery = trpc.messages.conversation.useQuery(
    { otherUserId: otherUid },
    { enabled: otherUid > 0, refetchInterval: 5000 }
  );

  // Send message mutation
  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      messagesQuery.refetch();
    },
  });

  const dbMessages = ((messagesQuery.data as any[]) || []).map((msg): ChatMessage => ({
    id: String(msg.id),
    text: msg.content || msg.text || "",
    isUser: msg.senderId === undefined ? true : !msg.isProvider,
    time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "",
  }));

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  const allMessages = [...dbMessages, ...localMessages];

  const sendMessage = useCallback(() => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    const text = input.trim();
    const newMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      text,
      isUser: true,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    };
    setLocalMessages((prev) => [...prev, newMsg]);
    setInput("");
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

    sendMessageMutation.mutate({
      requestId: parseInt(id, 10) || 0,
      content: text,
      receiverId: otherUid,
    });
  }, [input, sendMessageMutation, id, otherUserId]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: colors.primary + "15",
            alignItems: "center",
            justifyContent: "center",
            marginHorizontal: 10,
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 16 }}>U</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>Usta</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E", marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: colors.muted }}>Çevrimiçi</Text>
          </View>
        </View>
        <Pressable style={{ padding: 4 }}>
          <IconSymbol name="phone.fill" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          messagesQuery.isLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>Mesajlar yükleniyor...</Text>
            </View>
          ) : messagesQuery.isError ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <IconSymbol name="wifi.exclamationmark" size={30} color={colors.error} />
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8 }}>Mesajlar yüklenemedi</Text>
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
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
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>Henüz mesaj yok</Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>İlk mesajı gönderin</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", justifyContent: item.isUser ? "flex-end" : "flex-start" }}>
            {!item.isUser && (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 12,
                  backgroundColor: colors.primary + "15",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                  marginTop: 4,
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>U</Text>
              </View>
            )}
            <View
              style={{
                maxWidth: "75%",
                backgroundColor: item.isUser ? colors.primary : colors.card,
                borderRadius: 18,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderWidth: 0.5,
                borderColor: item.isUser ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontSize: 14, color: item.isUser ? "#FFF" : colors.foreground, lineHeight: 20 }}>
                {item.text}
              </Text>
              <Text style={{ fontSize: 11, color: item.isUser ? "#FFFFFF80" : colors.muted, marginTop: 4, textAlign: "right" }}>
                {item.time}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            paddingBottom: Platform.OS === "web" ? 12 : 24,
            backgroundColor: colors.background,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            gap: 10,
          }}
        >
          <Pressable
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 14,
                backgroundColor: colors.card,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 0.5,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <IconSymbol name="plus" size={18} color={colors.muted} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Mesaj yazın..."
            placeholderTextColor={colors.muted}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.foreground,
              borderWidth: 0.5,
              borderColor: colors.border,
              maxHeight: 100,
            }}
          />
          <Pressable
            onPress={sendMessage}
            disabled={!input.trim() || sendMessageMutation.isPending}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 14,
                backgroundColor: !input.trim() || sendMessageMutation.isPending ? colors.muted : colors.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed && input.trim() ? 0.85 : 1,
              },
            ]}
          >
            <IconSymbol name="paperplane.fill" size={18} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
