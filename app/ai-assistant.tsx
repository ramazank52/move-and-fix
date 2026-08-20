import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
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

type MoveAiAttachment = {
  opaqueId: string;
  kind: "image" | "audio";
  originalName: string;
};

export default function AIAssistantScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, language, locale } = useTranslation();
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
  const [mediaConsentGranted, setMediaConsentGranted] = useState(false);
  const [attachments, setAttachments] = useState<MoveAiAttachment[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [countrySelectionDraftId, setCountrySelectionDraftId] = useState<number | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
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
      setAttachments([]);

    },
    onError: () => {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-ai",
          text: t("ai.fallback"),
          isUser: false,
          timestamp: new Date().toISOString(),
          suggestions: undefined,
          category: undefined,
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
      setCountrySelectionDraftId(null);
      setMessages((current) => current.map((message) => message.draftId === data.draftId
        ? { ...message, draftStatus: undefined, requestId: data.requestId }
        : message));
    },
    onError: (error) => Alert.alert("Taslak onaylanamadı", error.message || "Lütfen taslağı yeniden oluşturun."),
  });
  const countryOptionsQuery = trpc.countryRegistry.list.useQuery();
  const selectableCountries = useMemo(
    () => countryOptionsQuery.data?.filter((option) => option.selectable) ?? [],
    [countryOptionsQuery.data],
  );
  const requestDraftConfirmation = useCallback((draftId: number) => {
    if (countryOptionsQuery.isLoading) {
      Alert.alert(t("ai.countryLoading"));
      return;
    }
    if (selectableCountries.length === 0) {
      Alert.alert(t("ai.countryUnavailable"));
      return;
    }
    if (selectableCountries.length === 1) {
      confirmDraftMutation.mutate({ draftId, countryCode: selectableCountries[0]!.countryCode });
      return;
    }
    setCountrySelectionDraftId(draftId);
  }, [confirmDraftMutation, countryOptionsQuery.isLoading, selectableCountries, t]);

  const stageMediaMutation = trpc.ai.stageMedia.useMutation();

  const requireMediaConsent = useCallback(() => {
    if (mediaConsentGranted) return true;
    Alert.alert(
      "Açık rıza gerekli",
      "Eklediğiniz görsel veya ses dosyası yalnızca onayladığınız hizmet talebine aktarılabilir. Devam etmek için açık rızanızı onaylayın.",
    );
    return false;
  }, [mediaConsentGranted]);

  const stageLocalMedia = useCallback(async (inputMedia: { uri: string; mimeType: string; originalName: string }) => {
    if (!requireMediaConsent()) return;
    if (attachments.length >= 4) {
      Alert.alert("Medya sınırı", "En fazla dört görsel veya ses girdisi ekleyebilirsiniz.");
      return;
    }
    setMediaBusy(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(inputMedia.uri, { encoding: FileSystem.EncodingType.Base64 });
      const staged = await stageMediaMutation.mutateAsync({
        mediaConsentGranted: true,
        originalName: inputMedia.originalName,
        mimeType: inputMedia.mimeType as any,
        base64,
      });
      setAttachments((current) => [...current, {
        opaqueId: staged.opaqueId,
        kind: staged.kind,
        originalName: inputMedia.originalName,
      }]);
    } catch (error) {
      Alert.alert("Medya eklenemedi", error instanceof Error ? error.message : "Dosya güvenli biçimde eklenemedi.");
    } finally {
      setMediaBusy(false);
    }
  }, [attachments.length, requireMediaConsent, stageMediaMutation]);

  const pickImage = useCallback(async () => {
    if (!requireMediaConsent()) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Fotoğraf izni gerekli", "Görsel eklemek için fotoğraf kitaplığı izni vermelisiniz.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType && ["image/jpeg", "image/png", "image/webp"].includes(asset.mimeType)
      ? asset.mimeType
      : "image/jpeg";
    await stageLocalMedia({
      uri: asset.uri,
      mimeType,
      originalName: asset.fileName || `moveai-image-${Date.now()}.jpg`,
    });
  }, [requireMediaConsent, stageLocalMedia]);

  const toggleAudioRecording = useCallback(async () => {
    if (recorderState.isRecording) {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) await stageLocalMedia({ uri, mimeType: "audio/m4a", originalName: `moveai-audio-${Date.now()}.m4a` });
      return;
    }
    if (!requireMediaConsent()) return;
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Mikrofon izni gerekli", "Sesli açıklama kaydetmek için mikrofon izni vermelisiniz.");
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  }, [audioRecorder, recorderState.isRecording, requireMediaConsent, stageLocalMedia]);

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
    aiCommandMutation.mutate({
      message: messageText,
      attachedMediaOpaqueIds: attachments.map((attachment) => attachment.opaqueId),
      mediaConsentGranted: attachments.length > 0 ? mediaConsentGranted : false,
      language,
    });
  }, [input, loading, aiCommandMutation, attachments, mediaConsentGranted, language]);

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            onPress={() => router.back()}
            style={{ marginRight: 12 }}
          >
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
                      accessibilityRole="button"
                      accessibilityLabel={sug}
                      accessibilityHint={t("aiAssistant")}
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
                    {t("ai.draftReady")}
                  </Text>
                  {countrySelectionDraftId === msg.draftId && (
                    <View style={{ gap: 6, marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{t("ai.chooseCountry")}</Text>
                      {selectableCountries.map((country) => (
                        <Pressable
                          key={country.countryCode}
                          accessibilityRole="button"
                          accessibilityLabel={country.displayName}
                          onPress={() => confirmDraftMutation.mutate({ draftId: msg.draftId!, countryCode: country.countryCode })}
                          style={({ pressed }) => ({ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}
                        >
                          <Text style={{ color: colors.text, fontWeight: "600" }}>{country.displayName}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="MoveAI hizmet taslağını onayla"
                    accessibilityHint="Taslağı onayladıktan sonra gerçek hizmet talebi oluşturulur."
                    disabled={confirmDraftMutation.isPending}
                    onPress={() => requestDraftConfirmation(msg.draftId!)}
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
                      {confirmDraftMutation.isPending ? t("ai.confirmingDraft") : t("ai.confirmDraft")}
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

        {attachments.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingTop: 8, backgroundColor: colors.background }}>
            {attachments.map((attachment) => (
              <Pressable
                key={attachment.opaqueId}
                accessibilityRole="button"
                accessibilityLabel={`${attachment.kind === "image" ? "Görsel" : "Ses"} ekini kaldır`}
                onPress={() => setAttachments((current) => current.filter((item) => item.opaqueId !== attachment.opaqueId))}
                style={{ flexDirection: "row", alignItems: "center", borderRadius: 14, backgroundColor: colors.accentPurple + "16", paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 4 }}
              >
                <IconSymbol name={attachment.kind === "image" ? "photo.fill" : "mic.fill"} size={15} color={colors.accentPurple} />
                <Text numberOfLines={1} style={{ maxWidth: 140, marginLeft: 5, fontSize: 12, color: colors.foreground }}>{attachment.originalName}</Text>
                <IconSymbol name="xmark" size={14} color={colors.muted} style={{ marginLeft: 5 }} />
              </Pressable>
            ))}
          </View>
        )}
        {/* Input — Referans yapısı */}
        <View
          style={{
            flexDirection: "column",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              value={input}
              accessibilityLabel={t("ai.inputPlaceholder")}
              accessibilityHint={t("aiAssistant")}
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
              accessibilityRole="button"
              accessibilityLabel="MoveAI mesajını gönder"
              accessibilityHint={t("ai.inputPlaceholder")}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: input.trim() ? colors.accentPurple : colors.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <IconSymbol name="paperplane.fill" size={20} color={input.trim() ? "#FFFFFF" : colors.muted} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: mediaConsentGranted }}
              accessibilityLabel="MoveAI medya açık rızası"
              onPress={() => setMediaConsentGranted((current) => !current)}
              style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingVertical: 4 }}
            >
              <IconSymbol name={mediaConsentGranted ? "checkmark.circle.fill" : "circle"} size={18} color={mediaConsentGranted ? colors.accentPurple : colors.muted} />
              <Text style={{ flex: 1, marginLeft: 7, fontSize: 11, lineHeight: 15, color: colors.muted }}>
                Görsel veya ses eklersem, yalnızca onayladığım hizmet talebine aktarılmasına izin veriyorum.
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Görsel ekle" disabled={mediaBusy || attachments.length >= 4} onPress={pickImage} style={{ padding: 8, opacity: mediaBusy ? 0.5 : 1 }}>
              <IconSymbol name="photo.fill" size={22} color={colors.accentPurple} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={recorderState.isRecording ? "Ses kaydını durdur" : "Ses kaydı başlat"} disabled={mediaBusy || attachments.length >= 4} onPress={toggleAudioRecording} style={{ padding: 8, marginLeft: 4, opacity: mediaBusy ? 0.5 : 1 }}>
              {mediaBusy ? <ActivityIndicator size="small" color={colors.accentPurple} /> : <IconSymbol name="mic.fill" size={22} color={recorderState.isRecording ? colors.error : colors.accentPurple} />}
            </Pressable>
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>
    </ScreenContainer>
  );
}
