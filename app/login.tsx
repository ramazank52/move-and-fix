import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { startOAuthLogin } from "@/constants/oauth";
import { useColors } from "@/hooks/use-colors";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <Text className="text-3xl font-bold text-foreground">Move&Fix</Text>
          <Text className="mt-2 text-center text-base leading-6 text-muted">
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Güvenli giriş yap"
          disabled={loading}
          onPress={handleLogin}
          style={({ pressed }) => ({
            minHeight: 54,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            opacity: loading ? 0.65 : pressed ? 0.9 : 1,
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
          onPress={() => router.push("/register")}
          style={({ pressed }) => ({
            marginTop: 20,
            alignItems: "center",
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Text className="text-sm text-muted">
            Hesabınız yok mu? <Text className="font-semibold text-primary">Kayıt Ol</Text>
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
