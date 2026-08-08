import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  suggestions?: string[];
  category?: string;
  requestId?: number;
}

const QUICK_PROMPTS = [
  "Evimin suyu akıyor",
  "Arabam yolda kaldı",
  "Klima soğutmuyor",
  "Çekici lazım",
  "Kurye lazım",
  "Fiyat tahmini",
];

export default function AIAssistantScreen() {
  const colors = useColors();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Merhaba! Ben MoveAI. Size nasıl yardımcı olabilirim? Acil bir sorun mu var, hizmet mi arıyorsunuz?",
      isUser: false,
      timestamp: new Date().toISOString(),
      suggestions: QUICK_PROMPTS,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const aiCommandMutation = trpc.owner.aiCommand.useMutation({
    onSuccess: (data: any) => {
      const response: Message = {
        id: Date.now().toString() + "-ai",
        text: data.response || data.message || "Size yardımcı olmaya çalışıyorum. Lütfen biraz daha açıklayıcı olur musunuz?",
        isUser: false,
        timestamp: new Date().toISOString(),
        suggestions: data.suggestions || undefined,
        category: data.category || undefined,
        requestId: data.requestId || undefined,
      };
      setMessages((prev) => [...prev, response]);

      // If AI created a service request, offer navigation
      if (data.requestId) {
        Alert.alert(
          "Hizmet Talebi Oluşturuldu",
          "MoveAI talebinizi oluşturdu. Şimdi uygun ustaları görüntülemek ister misiniz?",
          [
            { text: "Sonra", style: "cancel" },
            {
              text: "Ustaları Gör",
              onPress: () => router.push(`/category/${data.categoryId || 1}`),
            },
          ]
        );
      }
    },
    onError: (err) => {
      // Fallback: if backend AI is not available, use local keyword matching
      const fallback = getLocalResponse(input);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-ai",
          text: fallback.text,
          isUser: false,
          timestamp: new Date().toISOString(),
          suggestions: fallback.suggestions,
          category: fallback.category,
        },
      ]);
    },
  });

  const getLocalResponse = (text: string): { text: string; suggestions?: string[]; category?: string } => {
    const lower = text.toLowerCase();
    if (lower.includes("su") && (lower.includes("akıyo") || lower.includes("patla"))) {
      return {
        text: "Su tesisatı acil durumu anlıyorum. Size en yakın su tesisatçısını buluyorum. Tahmini ücret: ₺200-₺500 (duruma göre). Acil servis için talep oluşturabilirim.",
        suggestions: ["Su tesisatçısı çağır", "Fiyat öğren", "Başka bir sorunum var"],
        category: "plumbing",
      };
    }
    if (lower.includes("araba") && (lower.includes("kal") || lower.includes("bozul"))) {
      return {
        text: "Araç arızası için çekici veya yol yardımı gerekiyor. Size en yakın çekici hizmetini buluyorum. Çekici: ₺200 başlangıç + ₺25/km. Yol yardımı: ₺100 başlangıç + ₺18/km.",
        suggestions: ["Çekici çağır", "Yol yardımı çağır", "Fiyat hesapla"],
        category: "towing",
      };
    }
    if (lower.includes("klima") && (lower.includes("soğut") || lower.includes("çalış"))) {
      return {
        text: "Klima arızası için size en yakın klima servisini buluyorum. Tahmini ücret: ₺600-₺1.200. Klima bakımı mı yoksa onarım mı gerekiyor?",
        suggestions: ["Klima servisi çağır", "Fiyat öğren", "Başka bir sorunum var"],
        category: "hvac",
      };
    }
    if (lower.includes("çekici")) {
      return {
        text: "Çekici hizmeti için konumunuzu paylaşır mısınız? Ücretlendirme: ₺200 başlangıç + ₺25/km. Size en yakın çekici firmalarını öneriyorum.",
        suggestions: ["Çekici çağır", "Fiyat hesapla"],
        category: "towing",
      };
    }
    if (lower.includes("kurye")) {
      return {
        text: "Kurye hizmeti için paket bilgilerinizi paylaşır mısınız? Ücretlendirme: ₺50 başlangıç + ₺12/km. Size en uygun kurye hizmetini buluyorum.",
        suggestions: ["Kurye çağır", "Fiyat hesapla"],
        category: "courier",
      };
    }
    if (lower.includes("fiyat") || lower.includes("ücret") || lower.includes("kaç para")) {
      return {
        text: "Fiyat tahmini için hizmet türünü belirtir misiniz? Örneğin: temizlik (₺300-₺800), elektrik (₺200-₺600), su tesisatı (₺200-₺500), çekici (₺200+₺25/km), kurye (₺50+₺12/km).",
        suggestions: ["Temizlik", "Elektrik", "Su tesisatı", "Çekici"],
      };
    }
    return {
      text: "Sorununuzu anladım. Size yardımcı olmak istiyorum. Hangi hizmete ihtiyacınız var? Acil bir durum mu yoksa randevulu bir hizmet mi?",
      suggestions: QUICK_PROMPTS,
    };
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      isUser: true,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const messageText = input.trim();
    setInput("");
    setLoading(true);

    try {
      // Try backend AI first
      aiCommandMutation.mutate({ command: messageText });
    } catch {
      // Fallback handled in onError
    }
    setLoading(false);
  }, [input, loading, aiCommandMutation]);

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => sendMessage(), 100);
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b" style={{ borderColor: colors.border }}>
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold" style={{ color: colors.foreground }}>
              MoveAI Asistan
            </Text>
            <Text className="text-xs" style={{ color: colors.muted }}>
              Yapay zeka destekli hizmet asistanı
            </Text>
          </View>
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.success }} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              className={`mb-3 max-w-[85%] ${msg.isUser ? "self-end" : "self-start"}`}
            >
              <View
                className="rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: msg.isUser ? colors.primary : colors.surface,
                  borderWidth: msg.isUser ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  className="text-sm"
                  style={{ color: msg.isUser ? "#fff" : colors.foreground }}
                >
                  {msg.text}
                </Text>
              </View>

              {/* Suggestions */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <View className="flex-row flex-wrap mt-2">
                  {msg.suggestions.map((sug, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleSuggestion(sug)}
                      className="mr-2 mb-2 px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.primary,
                      }}
                    >
                      <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                        {sug}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text
                className="text-[10px] mt-1"
                style={{ color: colors.muted, textAlign: msg.isUser ? "right" : "left" }}
              >
                {new Date(msg.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          ))}

          {loading && (
            <View className="self-start mb-3">
              <View
                className="rounded-2xl px-4 py-3 flex-row items-center"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="ml-2 text-sm" style={{ color: colors.muted }}>
                  MoveAI düşünüyor...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View
          className="flex-row items-center px-4 py-3 border-t"
          style={{ borderColor: colors.border, backgroundColor: colors.background }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Sorunuzu yazın..."
            placeholderTextColor={colors.muted}
            className="flex-1 rounded-full px-4 py-2.5 mr-2"
            style={{
              backgroundColor: colors.surface,
              color: colors.foreground,
              fontSize: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: input.trim() ? colors.primary : colors.surface,
            }}
          >
            <IconSymbol name="paperplane.fill" size={20} color={input.trim() ? "#fff" : colors.muted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
