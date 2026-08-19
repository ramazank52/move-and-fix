import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";

export default function VerifyPhoneScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { t, isRTL } = useTranslation();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const verificationStatus = trpc.auth.getContactVerificationStatus.useQuery(undefined, { enabled: Boolean(user) });
  const requestCode = trpc.auth.requestVerification.useMutation({ onSuccess: () => setFeedback(t("verification.phoneResent")), onError: (error) => setFeedback(error.message) });
  const verifyCode = trpc.auth.verifyCode.useMutation({ onSuccess: async () => { await refresh(); router.replace("/" as never); }, onError: (error) => setFeedback(error.message) });

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-6">
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={{ width: 68, height: 68, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary + "18", marginBottom: 22 }}><IconSymbol name="phone.fill" size={31} color={colors.primary} /></View>
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground, textAlign: isRTL ? "right" : "left" }}>{t("verification.phone.title")}</Text>
        <Text style={{ marginTop: 9, color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: isRTL ? "right" : "left" }}>{user ? t("verification.phone.instruction") : t("verification.signInRequired")}</Text>
        <Text accessibilityLiveRegion="polite" style={{ marginTop: 8, color: colors.muted, fontSize: 13, textAlign: isRTL ? "right" : "left" }}>{verificationStatus.isLoading ? t("verification.status.loading") : t("verification.status.phone", { status: t(`verification.status.${verificationStatus.data?.phone.status ?? "unverified"}` as const) })}</Text>
        <TextInput accessibilityLabel={t("verification.codePhoneAccessibility")} accessibilityHint={t("verification.codeHint")} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete={Platform.OS === "web" ? "off" : "one-time-code"} maxLength={6} placeholder={t("verification.codePlaceholder")} placeholderTextColor={colors.muted} style={{ marginTop: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.card, paddingVertical: 16, color: colors.foreground, fontSize: 24, fontWeight: "800", letterSpacing: 8, textAlign: "center", writingDirection: isRTL ? "rtl" : "ltr" }} />
        {feedback ? <Text accessibilityRole="alert" style={{ marginTop: 12, color: verifyCode.isError || requestCode.isError ? colors.error : colors.success, fontSize: 13, lineHeight: 19 }}>{feedback}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t("verification.verify")} accessibilityState={{ busy: verifyCode.isPending, disabled: !user || !/^\d{6}$/.test(code) || verifyCode.isPending }} disabled={!user || !/^\d{6}$/.test(code) || verifyCode.isPending} onPress={() => verifyCode.mutate({ purpose: "verify_phone", code })} style={({ pressed }) => ({ marginTop: 20, minHeight: 54, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: user && /^\d{6}$/.test(code) ? colors.primary : colors.muted, opacity: pressed ? 0.85 : 1 })}>{verifyCode.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{t("verification.verify")}</Text>}</Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t("verification.resend")} accessibilityState={{ busy: requestCode.isPending, disabled: !user || requestCode.isPending }} disabled={!user || requestCode.isPending} onPress={() => requestCode.mutate({ purpose: "verify_phone" })} style={({ pressed }) => ({ marginTop: 18, alignSelf: "center", opacity: pressed ? 0.65 : 1 })}><Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>{requestCode.isPending ? t("verification.requesting") : t("verification.resend")}</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}
