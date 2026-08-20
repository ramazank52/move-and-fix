import { ActivityIndicator, Alert, Text, View, TextInput, ScrollView, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/lib/i18n";

export default function ProfileEditScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, loading: authLoading, refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const stagedContactStatus = trpc.auth.getStagedContactChangeStatus.useQuery(undefined, { enabled: Boolean(user) });
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async (result) => {
      await refresh();
      await stagedContactStatus.refetch();
      if (result.emailVerificationRequired) {
        Alert.alert(t("profile.edit.verificationRequiredTitle"), t("profile.edit.verificationRequiredBody"), [
          { text: t("profile.edit.verifyNow"), onPress: () => router.push("/verify/email" as never) },
        ]);
        return;
      }
      if (result.phoneVerificationRequired) {
        Alert.alert(t("profile.edit.phoneVerificationRequiredTitle"), t("profile.edit.phoneVerificationRequiredBody"), [
          { text: t("profile.edit.verifyNow"), onPress: () => router.push("/verify-phone" as never) },
        ]);
        return;
      }
      Alert.alert(t("profile.edit.updatedTitle"), t("profile.edit.updatedBody"), [{ text: t("profile.edit.done"), onPress: () => router.back() }]);
    },
    onError: (error) => Alert.alert(t("profile.edit.updateFailedTitle"), error.message || t("profile.edit.updateFailedBody")),
  });

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
  }, [user]);

  const handleSave = () => {
    if (!user || updateProfile.isPending) return;
    updateProfile.mutate({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
    });
  };

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
        <Pressable accessibilityRole="button" accessibilityLabel={t("profile.edit.backAccessibility")} onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          {t("profile.edit.title")}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>{t("profile.edit.name")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!authLoading && !updateProfile.isPending}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 10,
              padding: 12,
              fontSize: 15,
              color: colors.foreground,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </View>
        <View>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>{t("profile.edit.email")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!authLoading && !updateProfile.isPending}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 10,
              padding: 12,
              fontSize: 15,
              color: colors.foreground,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </View>
        <View>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>{t("profile.edit.phone")}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!authLoading && !updateProfile.isPending}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 10,
              padding: 12,
              fontSize: 15,
              color: colors.foreground,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </View>

        {stagedContactStatus.data?.email.pending ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 }}>
            <Text style={{ fontSize: 13, color: colors.foreground }}>{t("profile.edit.pendingEmail")}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t("profile.edit.pendingVerifyNow")} onPress={() => router.push("/verify/email" as never)}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>{t("profile.edit.pendingVerifyNow")}</Text>
            </Pressable>
          </View>
        ) : null}
        {stagedContactStatus.data?.phone.pending ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 }}>
            <Text style={{ fontSize: 13, color: colors.foreground }}>{t("profile.edit.pendingPhone")}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t("profile.edit.pendingVerifyNow")} onPress={() => router.push("/verify-phone" as never)}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>{t("profile.edit.pendingVerifyNow")}</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("profile.edit.saveAccessibility")}
          accessibilityState={{ disabled: authLoading || !user || updateProfile.isPending }}
          onPress={handleSave}
          disabled={authLoading || !user || updateProfile.isPending}
          style={({ pressed }) => [
            {
              marginTop: 10,
              backgroundColor: authLoading || !user || updateProfile.isPending ? colors.muted : colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          {updateProfile.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600" }}>{t("profile.edit.save")}</Text>}
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
