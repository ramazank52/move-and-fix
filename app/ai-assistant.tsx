import { Text, View, TextInput, FlatList, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useRef } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

const AI_RESPONSES: Record<string, string> = {
  default:
    "Merhaba! Ben MoveAI, size yardımcı olmak için buradayım. Bir hizmet mi arıyorsunuz, fiyat tahmini mi istiyorsunuz, yoksa başka bir konuda yardım mı lazım?",
  klima:
    "Klima bakımı için size yardımcı olabilirim! Bölgenizdeki ortalama klima bakım fiyatı ₺600-₺1.200 arasındadır. Kaç adet klimanız var? Size en uygun ustaları bulabilirim.",
  nakliye:
    "Nakliye hizmeti için birkaç bilgiye ihtiyacım var: Kaç odalı eviniz var? Hangi kattan taşınacak? Asansör var mı? Bu bilgilerle size tahmini fiyat ve uygun nakliye firmaları önerebilirim.",
  fiyat:
    "Fiyat tahmini için hizmet türünü ve konumunuzu belirtir misiniz? Geçmiş verilere dayanarak size yaklaşık bir fiyat aralığı sunabilirim.",
};

export default function AIAssistantScreen() {
  const colors = useColors();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: AI_RESPONSES.default,
      isUser: false,
      timestamp: "Şimdi",
    },
  ]);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      timestamp: "Şimdi",
    };

    // Simple keyword matching for demo
    let response = AI_RESPONSES.default;
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes("klima") || lowerInput.includes("bakım")) {
      response = AI_RESPONSES.klima;
    } else if (lowerInput.includes("nakliye") || lowerInput.includes("taşıma") || lowerInput.includes("taşın")) {
      response = AI_RESPONSES.nakliye;
    } else if (lowerInput.includes("fiyat") || lowerInput.includes("ücret") || lowerInput.includes("kaç")) {
      response = AI_RESPONSES.fiyat;
    }

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: response,
      isUser: false,
      timestamp: "Şimdi",
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
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
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "#6366F1",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 10,
          }}
        >
          <IconSymbol name="sparkles" size={16} color="#FFF" />
        </View>
        <View style={{ marginLeft: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>MoveAI Asistan</Text>
          <Text style={{ fontSize: 12, color: colors.success }}>Çevrimiçi</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.isUser ? "flex-end" : "flex-start",
              maxWidth: "80%",
              marginBottom: 12,
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
              <Text
                style={{
                  fontSize: 14,
                  color: item.isUser ? "#FFF" : colors.foreground,
                  lineHeight: 20,
                }}
              >
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
              {item.timestamp}
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
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="MoveAI'ye sorun..."
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.foreground,
              marginRight: 10,
            }}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
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
