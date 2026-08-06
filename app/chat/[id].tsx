import { Text, View, TextInput, FlatList, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SAMPLE_CONVERSATIONS } from "@/lib/data/messages";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const conversation = SAMPLE_CONVERSATIONS.find((c) => c.id === id);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", text: "Merhaba, hizmetiniz hakkında bilgi almak istiyorum.", isUser: true, time: "14:20" },
    { id: "2", text: "Merhaba! Tabii, nasıl yardımcı olabilirim?", isUser: false, time: "14:22" },
    { id: "3", text: "Yarın saat 10'da müsait misiniz?", isUser: true, time: "14:25" },
    { id: "4", text: "Evet, yarın 10'da uygun. Adresinizi paylaşır mısınız?", isUser: false, time: "14:28" },
  ]);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
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
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 10,
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 14 }}>
            {conversation?.name?.charAt(0) || "U"}
          </Text>
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
            {conversation?.name || "Kullanıcı"}
          </Text>
          <Text style={{ fontSize: 12, color: colors.success }}>Çevrimiçi</Text>
        </View>
        <Pressable style={{ padding: 4 }}>
          <IconSymbol name="phone.fill" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 10 }}
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.isUser ? "flex-end" : "flex-start",
              maxWidth: "78%",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                backgroundColor: item.isUser ? colors.primary : colors.surface,
                borderRadius: 16,
                borderTopRightRadius: item.isUser ? 4 : 16,
                borderTopLeftRadius: item.isUser ? 16 : 4,
                padding: 12,
              }}
            >
              <Text style={{ fontSize: 14, color: item.isUser ? "#FFF" : colors.foreground, lineHeight: 20 }}>
                {item.text}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                color: colors.muted,
                marginTop: 3,
                alignSelf: item.isUser ? "flex-end" : "flex-start",
              }}
            >
              {item.time}
            </Text>
          </View>
        )}
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <Pressable style={{ padding: 6 }}>
            <IconSymbol name="camera.fill" size={22} color={colors.muted} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Mesaj yazın..."
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.foreground,
              marginHorizontal: 8,
            }}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <Pressable
            onPress={sendMessage}
            style={({ pressed }) => [
              {
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <IconSymbol name="paperplane.fill" size={16} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
