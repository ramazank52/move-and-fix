import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { startOAuthLogin } from "@/constants/oauth";
import { setSessionToken } from "@/lib/_core/auth";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const localLogin = trpc.auth.login.useMutation({
    onSuccess: async (result) => {
      if (Platform.OS !== "web" && result.user.sessionToken) await setSessionToken(result.user.sessionToken);
      await refresh();
      router.replace((result.user.emailVerified ? "/" : "/verify-email") as never);
    },
    onError: (loginError) => setError(loginError.message),
  });

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await startOAuthLogin();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Giriş başlatılamadı");
    } finally {
      setLoading(false);
    }
  };

  const handleLocalLogin = () => {
    if (!identifier.trim() || !password || localLogin.isPending) return;
    setError(null);
    localLogin.mutate({ identifier: identifier.trim(), password, nativeSession: Platform.OS !== "web" });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-6">
      <View className="flex-1 justify-center">
        <View className="mb-10 items-center">
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.primary,
              marginBottom: 18,
            }}
          >
            <IconSymbol name="wrench.and.screwdriver.fill" size={36} color="#FFFFFF" />
          </View>
          <Text style={{ color: colors.foreground, fontSize: 30, fontWeight: "700" }}>Move&Fix</Text>
          <Text style={{ color: colors.muted, marginTop: 8, textAlign: "center", fontSize: 16, lineHeight: 24 }}>
            Güvenli hesabınızla devam edin
          </Text>
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: `${colors.error}18`,
              borderColor: `${colors.error}55`,
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: colors.error, textAlign: "center", lineHeight: 20 }}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 12, marginBottom: 14 }}>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            accessibilityLabel="E-posta adresi"
            accessibilityHint="Hesabınızda kayıtlı e-posta adresini girin"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="E-posta adresi"
            placeholderTextColor={colors.muted}
            style={{ backgroundColor: colors.card, color: colors.foreground, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15 }}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Parola"
            accessibilityHint="Hesap parolanızı girin"
            autoComplete="current-password"
            secureTextEntry
            placeholder="Parola"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            onSubmitEditing={handleLocalLogin}
            style={{ backgroundColor: colors.card, color: colors.foreground, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15 }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="E-posta ve parola ile giriş yap"
            accessibilityState={{ disabled: !identifier.trim() || !password || localLogin.isPending, busy: localLogin.isPending }}
            onPress={handleLocalLogin}
            disabled={!identifier.trim() || !password || localLogin.isPending}
            style={({ pressed }) => ({ minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: identifier.trim() && password ? colors.primary : colors.muted, opacity: pressed ? 0.86 : 1 })}
          >
            {localLogin.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}>E-posta ile giriş yap</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Parolamı unuttum" onPress={() => router.push("/forgot-password" as never)} style={({ pressed }) => ({ alignSelf: "flex-end", opacity: pressed ? 0.65 : 1 })}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>Parolamı unuttum</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 10 }}><View style={{ flex: 1, height: 1, backgroundColor: colors.border }} /><Text style={{ color: colors.muted, fontSize: 12 }}>veya</Text><View style={{ flex: 1, height: 1, backgroundColor: colors.border }} /></View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Güvenli giriş yap"
          accessibilityState={{ disabled: loading || localLogin.isPending, busy: loading }}
          disabled={loading || localLogin.isPending}
          onPress={handleLogin}
          style={({ pressed }) => ({
            minHeight: 54,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            opacity: loading || localLogin.isPending ? 0.65 : pressed ? 0.9 : 1,
          })}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">Güvenli Giriş Yap</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kayıt ekranına git"
          accessibilityHint="Kayıt olma ekranını açar"
          onPress={() => router.push("/register")}
          style={({ pressed }) => ({
            marginTop: 20,
            alignItems: "center",
            opacity: 1,
            borderRadius: 6,
            ...(pressed ? { backgroundColor: `${colors.primary}18` } : null),
          })}
        >
          <Text style={{ color: colors.authSignupText, fontSize: 14, opacity: 1 }}>
            Hesabınız yok mu? <Text style={{ color: colors.authSignupText, fontWeight: "600", opacity: 1 }}>Kayıt Ol</Text>
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
