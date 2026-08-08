import { useState, useRef } from "react";
import { View, Text, Pressable, FlatList, TextInput, KeyboardAvoidingView, Platform } from "react-native";
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
          paddingVertical: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: colors.primary + "15",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 10,
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 15 }}>
            {conversation?.name?.charAt(0) || "U"}
          </Text>
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
            {conversation?.name || "Kullanıcı"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success, marginRight: 5 }} />
            <Text style={{ fontSize: 12, color: colors.success, fontWeight: "500" }}>Çevrimiçi</Text>
          </View>
        </View>
        <Pressable style={{ padding: 6, marginRight: 6 }}>
          <IconSymbol name="phone.fill" size={18} color={colors.primary} />
        </Pressable>
        <Pressable style={{ padding: 6 }}>
          <IconSymbol name="video.fill" size={18} color={colors.primary} />
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
                backgroundColor: item.isUser ? colors.primary : colors.card,
                borderRadius: 20,
                borderTopRightRadius: item.isUser ? 6 : 20,
                borderTopLeftRadius: item.isUser ? 20 : 6,
                padding: 14,
                borderWidth: item.isUser ? 0 : 0.5,
                borderColor: colors.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 1,
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
                marginTop: 4,
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
            paddingBottom: Platform.OS === "ios" ? 10 : 12,
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
              backgroundColor: colors.card,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.foreground,
              marginHorizontal: 8,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <Pressable style={{ padding: 6, marginRight: 4 }}>
            <IconSymbol name="mic.fill" size={20} color={colors.muted} />
          </Pressable>
          <Pressable
            onPress={sendMessage}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.8 : 1,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 2,
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
