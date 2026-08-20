import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";

type PrivacyRequestType = "export" | "erasure" | "rectification";
type PrivacyRequestStatus = "open" | "in_review" | "blocked_legal_hold" | "approved" | "rejected" | "completed";
type PrivacyDataScope = {
  translationPreference: { configured: boolean; autoTranslateMessages: boolean; preferredTranslationLanguage: string };
  translationProvenance: { records: unknown[]; truncated: boolean };
  contactVerificationHistory: { records: unknown[]; truncated: boolean };
  contactChangeHistory: { records: unknown[]; truncated: boolean };
  erasureHandling: { automaticErasure: boolean; status: "retention_review_required" };
};

export default function PrivacyCenterScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t, isRTL } = useTranslation();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);
  const utils = trpc.useUtils();
  const [requestType, setRequestType] = useState<PrivacyRequestType>("export");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dataScope, setDataScope] = useState<PrivacyDataScope | null>(null);
  const requests = trpc.privacyRights.list.useQuery();
  const requestCode = trpc.auth.requestVerification.useMutation({
    onSuccess: () => setFeedback(t("privacy.center.requestCode")),
    onError: () => setFeedback(t("privacy.center.error")),
  });
  const submitRequest = trpc.privacyRights.submit.useMutation({
    onSuccess: async (result) => {
      setPassword("");
      setVerificationCode("");
      setReason("");
      setDataScope(result.dataScope as PrivacyDataScope | null);
      setFeedback(t("privacy.center.success"));
      await utils.privacyRights.list.invalidate();
    },
    onError: () => setFeedback(t("privacy.center.error")),
  });

  const validReason = reason.trim().length === 0 || reason.trim().length >= 3;
  const canSubmit = password.length > 0 && /^\d{6}$/.test(verificationCode) && validReason && !submitRequest.isPending;

  const submit = () => {
    if (!canSubmit) return;
    submitRequest.mutate({
      requestType,
      requestReason: reason.trim() || undefined,
      password,
      verificationCode,
    });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("privacy.center.back")} onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>{isRTL ? "›" : "‹"}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t("privacy.center.title")}</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>{t("privacy.center.subtitle")}</Text>

        <View style={styles.typeRow} accessibilityRole="radiogroup">
          {(["export", "rectification", "erasure"] as const).map((type) => {
            const selected = requestType === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t(`privacy.center.type.${type}` as const)}
                onPress={() => setRequestType(type)}
                style={({ pressed }) => [styles.typeButton, selected && styles.typeButtonSelected, pressed && styles.pressed]}
              >
                <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{t(`privacy.center.type.${type}` as const)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t("privacy.center.reason")}</Text>
          <TextInput
            accessibilityLabel={t("privacy.center.reason")}
            value={reason}
            onChangeText={setReason}
            placeholder={t("privacy.center.reasonPlaceholder")}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            style={styles.noteInput}
          />
          <Text style={styles.label}>{t("privacy.center.password")}</Text>
          <TextInput
            accessibilityLabel={t("privacy.center.password")}
            value={password}
            onChangeText={setPassword}
            placeholder={t("privacy.center.passwordPlaceholder")}
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete="current-password"
            style={styles.input}
          />
          <Text style={styles.label}>{t("privacy.center.code")}</Text>
          <TextInput
            accessibilityLabel={t("privacy.center.code")}
            value={verificationCode}
            onChangeText={(value) => setVerificationCode(value.replace(/\D/g, "").slice(0, 6))}
            placeholder={t("privacy.center.codePlaceholder")}
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            style={[styles.input, styles.codeInput]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: requestCode.isPending, disabled: requestCode.isPending }}
            accessibilityLabel={t("privacy.center.requestCode")}
            disabled={requestCode.isPending}
            onPress={() => requestCode.mutate({ purpose: "sensitive_transaction" })}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            {requestCode.isPending ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryText}>{t("privacy.center.requestCode")}</Text>}
          </Pressable>
          <Text style={styles.notice}>{t("privacy.center.reauthNotice")}</Text>
          {feedback ? <Text accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: submitRequest.isPending, disabled: !canSubmit }}
            accessibilityLabel={t("privacy.center.submit")}
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [styles.primaryButton, !canSubmit && styles.disabled, pressed && styles.pressed]}
          >
            {submitRequest.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t("privacy.center.submit")}</Text>}
          </Pressable>
        </View>

        {dataScope ? (
          <View style={styles.scopeCard} accessibilityLabel={t("privacy.center.scope.title")}>
            <Text style={styles.scopeTitle}>{t("privacy.center.scope.title")}</Text>
            <Text style={styles.scopeRow}>{t("privacy.center.scope.translationPreference", { language: dataScope.translationPreference.preferredTranslationLanguage })}</Text>
            <Text style={styles.scopeRow}>{t("privacy.center.scope.translationProvenance", { count: dataScope.translationProvenance.records.length })}</Text>
            <Text style={styles.scopeRow}>{t("privacy.center.scope.contactVerification", { count: dataScope.contactVerificationHistory.records.length })}</Text>
            <Text style={styles.scopeRow}>{t("privacy.center.scope.contactChanges", { count: dataScope.contactChangeHistory.records.length })}</Text>
            {(dataScope.translationProvenance.truncated || dataScope.contactVerificationHistory.truncated || dataScope.contactChangeHistory.truncated) ? <Text style={styles.scopeNotice}>{t("privacy.center.scope.truncated")}</Text> : null}
            {requestType === "erasure" && dataScope.erasureHandling.status === "retention_review_required" ? <Text style={styles.scopeNotice}>{t("privacy.center.scope.erasureReview")}</Text> : null}
          </View>
        ) : null}

        <Text style={styles.historyTitle}>{t("privacy.center.history")}</Text>
        {requests.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {requests.data?.length === 0 ? <Text style={styles.empty}>{t("privacy.center.empty")}</Text> : null}
        {requests.data?.map((request) => (
          <View key={request.id} style={styles.historyCard}>
            <Text style={styles.historyType}>{t(`privacy.center.type.${request.requestType}` as const)}</Text>
            <Text style={styles.historyStatus}>
              {t(`privacy.center.status.${request.status as PrivacyRequestStatus}`)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>, isRTL: boolean) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { minHeight: 56, paddingHorizontal: 16, alignItems: "center", flexDirection: isRTL ? "row-reverse" : "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    back: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
    backText: { color: colors.foreground, fontSize: 32, lineHeight: 34 },
    headerTitle: { flex: 1, color: colors.foreground, fontSize: 17, fontWeight: "800", textAlign: "center" },
    content: { padding: 20, paddingBottom: 40, gap: 14 },
    subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: isRTL ? "right" : "left" },
    typeRow: { flexDirection: isRTL ? "row-reverse" : "row", gap: 10 },
    typeButton: { flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10 },
    typeButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeText: { color: colors.foreground, fontWeight: "700", fontSize: 13, textAlign: "center" },
    typeTextSelected: { color: "#fff" },
    card: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 10 },
    label: { color: colors.foreground, fontWeight: "700", fontSize: 14, textAlign: isRTL ? "right" : "left" },
    input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.foreground, paddingHorizontal: 13, textAlign: isRTL ? "right" : "left" },
    noteInput: { minHeight: 88, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.foreground, paddingHorizontal: 13, paddingVertical: 10, textAlignVertical: "top", textAlign: isRTL ? "right" : "left" },
    codeInput: { letterSpacing: 6, textAlign: "center", writingDirection: "ltr" },
    secondaryButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, justifyContent: "center", alignItems: "center" },
    secondaryText: { color: colors.primary, fontWeight: "800", fontSize: 14 },
    notice: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: isRTL ? "right" : "left" },
    feedback: { color: colors.muted, fontSize: 13, lineHeight: 18, textAlign: isRTL ? "right" : "left" },
    primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
    disabled: { opacity: 0.52 },
    primaryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    historyTitle: { marginTop: 8, color: colors.foreground, fontSize: 17, fontWeight: "800", textAlign: isRTL ? "right" : "left" },
    empty: { color: colors.muted, fontSize: 14, textAlign: isRTL ? "right" : "left" },
    historyCard: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, gap: 4 },
    historyType: { color: colors.foreground, fontSize: 14, fontWeight: "700", textAlign: isRTL ? "right" : "left" },
    historyStatus: { color: colors.muted, fontSize: 13, textAlign: isRTL ? "right" : "left" },
    scopeCard: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, gap: 6 },
    scopeTitle: { color: colors.foreground, fontSize: 15, fontWeight: "800", textAlign: isRTL ? "right" : "left" },
    scopeRow: { color: colors.foreground, fontSize: 13, lineHeight: 19, textAlign: isRTL ? "right" : "left" },
    scopeNotice: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: isRTL ? "right" : "left" },
    pressed: { opacity: 0.7 },
  });
}
