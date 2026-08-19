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
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VoiceAudioBubble } from "@/components/voice-audio-bubble";
import { useColors } from "@/hooks/use-colors";
import { readUriAsBase64 } from "@/lib/file-to-base64";
import { useTranslation } from "@/lib/i18n";
import { localeForLanguage } from "@/lib/i18n-core";
import { trpc } from "@/lib/trpc";

export default function ChatRoomScreen() {
  const { id, requestId: requestIdParam, otherUserId } = useLocalSearchParams<{
    id: string;
    requestId?: string;
    otherUserId?: string;
  }>();
  const colors = useColors();
  const { t, language } = useTranslation();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [input, setInput] = useState("");
  const [messageTranslations, setMessageTranslations] = useState<Record<number, { text: string; showingTranslation: boolean }>>({});
  const [locallyHiddenMessageIds, setLocallyHiddenMessageIds] = useState<Set<number>>(() => new Set());
  const flatListRef = useRef<FlatList>(null);
  const markedReadForRef = useRef("");
  const voiceStartedAtRef = useRef<number | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
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
  const sendVoiceMutation = trpc.messages.sendVoice.useMutation({
    onSuccess: async () => {
      await Promise.all([messagesQuery.refetch(), utils.messages.list.invalidate()]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    },
  });
  const translateMessageMutation = trpc.messages.translate.useMutation({
    onSuccess: (result) => {
      setMessageTranslations((current) => ({
        ...current,
        [result.messageId]: { text: result.translatedText, showingTranslation: true },
      }));
    },
  });
  const hideForMeMutation = trpc.messages.hideForMe.useMutation({
    onSuccess: (result) => {
      setLocallyHiddenMessageIds((current) => new Set([...current, result.messageId]));
      void messagesQuery.refetch();
    },
  });
  const translationPreferenceQuery = trpc.messages.getTranslationPreference.useQuery();
  const setTranslationPreferenceMutation = trpc.messages.setTranslationPreference.useMutation({
    onSuccess: () => translationPreferenceQuery.refetch(),
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

  const translateOrToggleMessage = useCallback((messageId: number) => {
    const current = messageTranslations[messageId];
    if (current) {
      setMessageTranslations((translations) => ({
        ...translations,
        [messageId]: { ...current, showingTranslation: !current.showingTranslation },
      }));
      return;
    }
    if (translateMessageMutation.isPending) return;
    translateMessageMutation.mutate({ messageId, targetLanguage: language });
  }, [language, messageTranslations, translateMessageMutation]);

  const hideMessageForMe = useCallback((messageId: number) => {
    if (hideForMeMutation.isPending) return;
    hideForMeMutation.mutate({ messageId });
  }, [hideForMeMutation]);

  const toggleAutoTranslation = useCallback(() => {
    if (setTranslationPreferenceMutation.isPending) return;
    const preference = translationPreferenceQuery.data ?? {
      autoTranslateMessages: false,
      preferredTranslationLanguage: language,
    };
    setTranslationPreferenceMutation.mutate({
      autoTranslateMessages: !preference.autoTranslateMessages,
      preferredTranslationLanguage: language,
    });
  }, [language, setTranslationPreferenceMutation, translationPreferenceQuery.data]);

  const toggleVoiceRecording = useCallback(async () => {
    if (!hasValidConversationContext || sendVoiceMutation.isPending) return;
    try {
      if (!recorderState.isRecording) {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) return;
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        voiceStartedAtRef.current = Date.now();
        return;
      }

      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      const startedAt = voiceStartedAtRef.current;
      voiceStartedAtRef.current = null;
      if (!uri || !startedAt) return;
      const durationMs = Math.max(250, Math.min(5 * 60 * 1000, Date.now() - startedAt));
      const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/mp4";
      const base64 = await readUriAsBase64(uri);
      sendVoiceMutation.mutate({
        receiverId: otherUid,
        requestId: requestId!,
        mimeType,
        durationMs,
        base64,
      });
    } catch {
      voiceStartedAtRef.current = null;
    }
  }, [audioRecorder, hasValidConversationContext, otherUid, recorderState.isRecording, requestId, sendVoiceMutation]);

  const participantName = participantQuery.data?.displayName ?? t("chat.providerFallback");
  const participantInitial = participantName.charAt(0).toLocaleUpperCase(localeForLanguage(language));

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
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("chat.backAccessibility")}
          style={({ pressed }) => ({ padding: 5, opacity: pressed ? 0.6 : 1 })}
        >
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
                ? t("chat.providerMeta", { rating: Number(participantQuery.data.rating).toFixed(1) })
                : t("chat.providerFallback")
              : t("chat.userMeta")}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={toggleAutoTranslation}
        disabled={translationPreferenceQuery.isLoading || setTranslationPreferenceMutation.isPending}
        accessibilityRole="switch"
        accessibilityLabel={t("chat.autoTranslateTitle")}
        accessibilityHint={t("chat.autoTranslateBody")}
        accessibilityState={{
          checked: translationPreferenceQuery.data?.autoTranslateMessages ?? false,
          disabled: translationPreferenceQuery.isLoading || setTranslationPreferenceMutation.isPending,
          busy: setTranslationPreferenceMutation.isPending,
        }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          marginHorizontal: 16,
          marginTop: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: colors.border,
          backgroundColor: colors.card,
          opacity: pressed || translationPreferenceQuery.isLoading || setTranslationPreferenceMutation.isPending ? 0.66 : 1,
        })}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{t("chat.autoTranslateTitle")}</Text>
          <Text style={{ marginTop: 2, fontSize: 11, lineHeight: 16, color: colors.muted }}>{t("chat.autoTranslateBody")}</Text>
        </View>
        <View
          style={{
            minWidth: 36,
            height: 22,
            borderRadius: 11,
            padding: 3,
            justifyContent: translationPreferenceQuery.data?.autoTranslateMessages ? "flex-end" : "flex-start",
            backgroundColor: translationPreferenceQuery.data?.autoTranslateMessages ? colors.primary : colors.border,
          }}
        >
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF" }} />
        </View>
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
        <FlatList
          ref={flatListRef}
          data={(messagesQuery.data ?? []).filter((item) => !locallyHiddenMessageIds.has(item.id))}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 10, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            !hasValidConversationContext ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <IconSymbol name="exclamationmark.shield.fill" size={30} color={colors.error} />
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8 }}>
                  {t("chat.invalidContext")}
                </Text>
              </View>
            ) : messagesQuery.isLoading ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>{t("chat.loading")}</Text>
              </View>
            ) : messagesQuery.isError ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <IconSymbol name="wifi.exclamationmark" size={30} color={colors.error} />
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8 }}>{t("chat.loadError")}</Text>
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
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>{t("chat.emptyTitle")}</Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{t("chat.emptyBody")}</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const translation = messageTranslations[item.id];
            const canTranslate = item.kind !== "audio" && Boolean(item.content?.trim());
            const visibleText = translation?.showingTranslation ? translation.text : item.content;
            return (
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
                {item.kind === "audio" && item.mediaUrl ? (
                  <VoiceAudioBubble uri={item.mediaUrl} durationMs={item.mediaDurationMs} isOwn={item.isOwn} />
                ) : (
                  <Text style={{ fontSize: 14, color: item.isOwn ? "#FFFFFF" : colors.foreground, lineHeight: 20 }}>
                    {visibleText}
                  </Text>
                )}
                {canTranslate ? (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 7 }}>
                    <Pressable
                      onPress={() => translateOrToggleMessage(item.id)}
                      disabled={translateMessageMutation.isPending}
                      accessibilityRole="button"
                      accessibilityLabel={translation ? (translation.showingTranslation ? t("chat.showOriginal") : t("chat.showTranslation")) : t("chat.translate")}
                      style={({ pressed }) => ({ opacity: pressed || translateMessageMutation.isPending ? 0.64 : 1 })}
                    >
                      {translateMessageMutation.isPending ? (
                        <ActivityIndicator size="small" color={item.isOwn ? "#FFFFFFCC" : colors.primary} />
                      ) : (
                        <Text style={{ color: item.isOwn ? "#FFFFFFCC" : colors.primary, fontSize: 11, fontWeight: "700" }}>
                          {translation ? (translation.showingTranslation ? t("chat.showOriginal") : t("chat.showTranslation")) : t("chat.translate")}
                        </Text>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => hideMessageForMe(item.id)}
                      disabled={hideForMeMutation.isPending}
                      accessibilityRole="button"
                      accessibilityLabel={t("chat.hideForMe")}
                      style={({ pressed }) => ({ opacity: pressed || hideForMeMutation.isPending ? 0.64 : 1 })}
                    >
                      <Text style={{ color: item.isOwn ? "#FFFFFFCC" : colors.muted, fontSize: 11, fontWeight: "700" }}>
                        {t("chat.hideForMe")}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                  <Text style={{ fontSize: 10, color: item.isOwn ? "#FFFFFFB3" : colors.muted }}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleTimeString(localeForLanguage(language), { hour: "2-digit", minute: "2-digit" })
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
            );
          }}
        />

        {sendMessageMutation.isError || sendVoiceMutation.isError || translateMessageMutation.isError || hideForMeMutation.isError || setTranslationPreferenceMutation.isError ? (
          <Text accessibilityRole="alert" style={{ paddingHorizontal: 16, paddingBottom: 6, color: colors.error, fontSize: 12 }}>
            {setTranslationPreferenceMutation.isError
              ? t("chat.autoTranslateSaveError")
              : translateMessageMutation.isError
                ? t("chat.translationUnavailable")
                : sendVoiceMutation.isError
                  ? t("chat.voiceSendError")
                  : t("chat.sendError")}
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
            placeholder={t("chat.placeholder")}
            accessibilityLabel={t("chat.placeholder")}
            accessibilityHint={t("chat.inputHint")}
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
            onPress={toggleVoiceRecording}
            disabled={!hasValidConversationContext || sendVoiceMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel={recorderState.isRecording ? t("chat.stopRecordAndSend") : t("chat.recordVoice")}
            accessibilityState={{
              disabled: !hasValidConversationContext || sendVoiceMutation.isPending,
              busy: sendVoiceMutation.isPending,
            }}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 15,
              backgroundColor: recorderState.isRecording ? colors.error : colors.card,
              borderWidth: recorderState.isRecording ? 0 : 0.5,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.76 : !hasValidConversationContext || sendVoiceMutation.isPending ? 0.48 : 1,
            })}
          >
            {sendVoiceMutation.isPending ? <ActivityIndicator size="small" color={colors.primary} /> : <IconSymbol name="mic.fill" size={19} color={recorderState.isRecording ? "#FFFFFF" : colors.primary} />}
          </Pressable>
          <Pressable
            onPress={sendMessage}
            disabled={!input.trim() || sendMessageMutation.isPending || otherUid <= 0}
            accessibilityRole="button"
            accessibilityLabel="Mesajı gönder"
            accessibilityState={{
              disabled: !input.trim() || sendMessageMutation.isPending || otherUid <= 0,
              busy: sendMessageMutation.isPending,
            }}
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
