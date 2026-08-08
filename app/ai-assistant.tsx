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
  suggestions?: string[];
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

const QUICK_PROMPTS = [
  "Klima bakımı",
  "Nakliye fiyatı",
  "Acil tesisatçı",
  "Ev temizliği",
  "Çekici çağır",
  "Kurye lazım",
];

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
      suggestions: QUICK_PROMPTS.slice(0, 3),
    },
  ]);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: "Şimdi",
    };

    let response = AI_RESPONSES.default;
    const lowerInput = text.toLowerCase();
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
      suggestions: ["En yakın usta", "Fiyat karşılaştır", "Randevu al"],
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
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: colors.accentPurple + "15",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 10,
          }}
        >
          <IconSymbol name="sparkles" size={22} color={colors.accentPurple} />
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>MoveAI Asistanı</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success, marginRight: 5 }} />
            <Text style={{ fontSize: 12, color: colors.success, fontWeight: "500" }}>Çevrimiçi</Text>
          </View>
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
              maxWidth: "82%",
              marginBottom: 12,
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
              {!item.isUser && (
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <IconSymbol name="sparkles" size={14} color={colors.accentPurple} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.accentPurple, marginLeft: 5 }}>
                    MoveAI
                  </Text>
                </View>
              )}
              <Text
                style={{
                  fontSize: 14,
                  color: item.isUser ? "#FFF" : colors.foreground,
                  lineHeight: 20,
                }}
              >
                {item.text}
              </Text>
              {item.suggestions && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {item.suggestions.map((sug: string, si: number) => (
                    <Pressable
                      key={si}
                      onPress={() => sendMessage(sug)}
                      style={({ pressed }) => [
                        {
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 12,
                          backgroundColor: colors.accentPurple + "12",
                          borderWidth: 0.5,
                          borderColor: colors.accentPurple + "30",
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.accentPurple }}>
                        {sug}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
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

      {/* Quick Prompts — only show when no user messages yet */}
      {messages.length <= 1 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10 }}>
            Hızlı Sorular
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {QUICK_PROMPTS.map((prompt, pi) => (
              <Pressable
                key={pi}
                onPress={() => sendMessage(prompt)}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 14,
                    backgroundColor: colors.card,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <IconSymbol name="sparkles" size={12} color={colors.accentPurple} />
                <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: "500", marginLeft: 6 }}>
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

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
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="MoveAI'ya soru sorun..."
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.foreground,
              marginHorizontal: 4,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
          />
          <Pressable
            onPress={() => sendMessage(input)}
            style={({ pressed }) => [
              {
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.accentPurple,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 6,
                opacity: pressed ? 0.8 : 1,
                shadowColor: colors.accentPurple,
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
