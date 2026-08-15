import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/lib/i18n";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  suggestions?: string[];
  category?: string;
  requestId?: number;
  draftId?: number;
  draftStatus?: "draft" | "blocked";
}

export default function AIAssistantScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { height: viewportHeight } = useWindowDimensions();
  const quickPrompts = useMemo(
    () => [t("ai.prompt.plumbing"), t("ai.prompt.roadside"), t("ai.prompt.airConditioning"), t("ai.prompt.towTruck"), t("ai.prompt.courier"), t("ai.prompt.priceEstimate")],
    [t],
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: t("ai.welcome"),
      isUser: false,
      timestamp: new Date().toISOString(),
      suggestions: quickPrompts,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    setMessages((current) => current.length === 1 && !current[0]?.isUser
      ? [{ ...current[0], text: t("ai.welcome"), suggestions: quickPrompts }]
      : current);
  }, [t, quickPrompts]);

  const aiCommandMutation = trpc.ai.command.useMutation({
    onSuccess: (data: any) => {
      setLoading(false);
      const response: Message = {
        id: Date.now().toString() + "-ai",
        text: data.response || data.message || t("ai.fallback"),
        isUser: false,
        timestamp: new Date().toISOString(),
        suggestions: data.suggestions || undefined,
        category: data.category || undefined,
        requestId: data.requestId || undefined,
        draftId: data.draftId || undefined,
        draftStatus: data.draftStatus || undefined,
      };
      setMessages((prev) => [...prev, response]);

    },
    onError: (_error, variables) => {
      setLoading(false);
      const fallback = getLocalResponse(variables.message);
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

  const confirmDraftMutation = trpc.ai.confirmDraft.useMutation({
    onSuccess: (data) => {
      Alert.alert(
        t("ai.requestCreatedTitle"),
        t("ai.requestCreatedBody"),
        [{ text: t("ai.viewProviders"), onPress: () => router.push(`/job/${data.requestId}` as any) }],
      );
      setMessages((current) => current.map((message) => message.draftId === data.draftId
        ? { ...message, draftStatus: undefined, requestId: data.requestId }
        : message));
    },
    onError: (error) => Alert.alert("Taslak onaylanamadı", error.message || "Lütfen taslağı yeniden oluşturun."),
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
        text: "Araç arızası için çekici veya yol yardımı gerekiyor. Çekici: ₺200 başlangıç + ₺25/km. Yol yardımı: ₺100 başlangıç + ₺18/km.",
        suggestions: ["Çekici çağır", "Yol yardımı çağır", "Fiyat hesapla"],
        category: "towing",
      };
    }
    if (lower.includes("klima") && (lower.includes("soğut") || lower.includes("çalış"))) {
      return {
        text: "Klima arızası için size en yakın klima servisini buluyorum. Tahmini ücret: ₺600-₺1.200.",
        suggestions: ["Klima servisi çağır", "Fiyat öğren", "Başka bir sorunum var"],
        category: "hvac",
      };
    }
    if (lower.includes("çekici")) {
      return {
        text: "Çekici hizmeti için konumunuzu paylaşır mısınız? Ücretlendirme: ₺200 başlangıç + ₺25/km.",
        suggestions: ["Çekici çağır", "Fiyat hesapla"],
        category: "towing",
      };
    }
    if (lower.includes("kurye")) {
      return {
        text: "Kurye hizmeti için paket bilgilerinizi paylaşır mısınız? Ücretlendirme: ₺50 başlangıç + ₺12/km.",
        suggestions: ["Kurye çağır", "Fiyat hesapla"],
        category: "courier",
      };
    }
    if (lower.includes("fiyat") || lower.includes("ücret") || lower.includes("kaç para")) {
      return {
        text: "Fiyat tahmini için hizmet türünü belirtir misiniz? Örneğin: temizlik (₺300-₺800), elektrik (₺200-₺600), su tesisatı (₺200-₺500), çekici (₺200+₺25/km), kurye (₺50+₺12/km).",
        suggestions: ["Temizlik", "Elektrik", "Su Tesisatı", "Çekici"],
      };
    }
    return {
      text: "Sorununuzu anladım. Size yardımcı olmak istiyorum. Hangi hizmete ihtiyacınız var? Acil bir durum mu yoksa randevulu bir hizmet mi?",
      suggestions: quickPrompts,
    };
  };

  const sendMessage = useCallback((textOverride?: string) => {
    const messageText = (textOverride ?? input).trim();
    if (!messageText || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    aiCommandMutation.mutate({ message: messageText });
  }, [input, loading, aiCommandMutation]);

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-background"
      safeAreaClassName="flex-1 bg-background"
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={{
          flex: 1,
          minHeight: Platform.OS === "web" ? viewportHeight : undefined,
          backgroundColor: colors.background,
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: colors.background }}
        >
        {/* Header — MoveAI avatar + mor tema */}
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
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>

          {/* MoveAI Avatar — mor gradient container */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.accentPurple,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <IconSymbol name="sparkles" size={20} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
              MoveAI
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.success,
                  marginRight: 4,
                }}
              />
              <Text style={{ fontSize: 11, color: colors.muted }}>{t("ai.online")}</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          style={{ paddingHorizontal: 16, paddingVertical: 12 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                marginBottom: 12,
                maxWidth: "85%",
                alignSelf: msg.isUser ? "flex-end" : "flex-start",
              }}
            >
              {/* AI avatar for non-user messages */}
              {!msg.isUser && (
                <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colors.accentPurple,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                      marginBottom: 4,
                    }}
                  >
                    <IconSymbol name="sparkles" size={14} color="#FFFFFF" />
                  </View>
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      borderTopLeftRadius: 4,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      backgroundColor: colors.surface,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
                      {msg.text}
                    </Text>
                  </View>
                </View>
              )}

              {/* User messages */}
              {msg.isUser && (
                <View
                  style={{
                    borderRadius: 16,
                    borderTopRightRadius: 4,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: colors.primary,
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#FFFFFF", lineHeight: 20 }}>
                    {msg.text}
                  </Text>
                </View>
              )}

              {/* Suggestions */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8, marginLeft: msg.isUser ? 0 : 36 }}>
                  {msg.suggestions.map((sug, i) => (
                    <Pressable
                      key={i}
                      onPress={() => handleSuggestion(sug)}
                      style={({ pressed }) => [
                        {
                          marginRight: 6,
                          marginBottom: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          backgroundColor: colors.accentPurple + "10",
                          borderWidth: 1,
                          borderColor: colors.accentPurple + "40",
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

              {msg.draftId && msg.draftStatus === "draft" && (
                <View style={{ marginTop: 8, marginLeft: 36 }}>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>
                    Taslak hazır. Hizmet talebi yalnızca onayınızla oluşturulur.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="MoveAI hizmet taslağını onayla"
                    disabled={confirmDraftMutation.isPending}
                    onPress={() => confirmDraftMutation.mutate({ draftId: msg.draftId! })}
                    style={({ pressed }) => ({
                      alignSelf: "flex-start",
                      backgroundColor: colors.accentPurple,
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 12,
                      opacity: pressed || confirmDraftMutation.isPending ? 0.75 : 1,
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                      {confirmDraftMutation.isPending ? "Onaylanıyor…" : "Taslağı onayla"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {msg.draftStatus === "blocked" && (
                <Text style={{ marginTop: 8, marginLeft: 36, fontSize: 12, color: colors.error }}>
                  Bu taslak güvenlik incelemesi nedeniyle onaylanamaz.
                </Text>
              )}

              <Text
                style={{
                  fontSize: 10,
                  color: colors.muted,
                  marginTop: 4,
                  textAlign: msg.isUser ? "right" : "left",
                  marginLeft: msg.isUser ? 0 : 36,
                }}
              >
                {new Date(msg.timestamp).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={{ alignSelf: "flex-start", marginBottom: 12, flexDirection: "row", alignItems: "flex-end" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.accentPurple,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                }}
              >
                <IconSymbol name="sparkles" size={14} color="#FFFFFF" />
              </View>
              <View
                style={{
                  borderRadius: 16,
                  borderTopLeftRadius: 4,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="small" color={colors.accentPurple} />
                <Text style={{ marginLeft: 8, fontSize: 13, color: colors.muted }}>
                  {t("ai.thinking")}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input — Referans yapısı */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t("ai.inputPlaceholder")}
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginRight: 10,
              backgroundColor: colors.surface,
              color: colors.foreground,
              fontSize: 14,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />
          <Pressable
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={({ pressed }) => [
              {
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: input.trim() ? colors.accentPurple : colors.surface,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <IconSymbol
              name="paperplane.fill"
              size={20}
              color={input.trim() ? "#FFFFFF" : colors.muted}
            />
          </Pressable>
        </View>
        </KeyboardAvoidingView>
      </View>
    </ScreenContainer>
  );
}
