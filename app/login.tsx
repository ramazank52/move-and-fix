import { Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    router.replace("/(tabs)" as any);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.primary }}>Move&Fix</Text>
            <Text style={{ fontSize: 15, color: colors.muted, marginTop: 8 }}>Hesabınıza giriş yapın</Text>
          </View>

          <View style={{ gap: 14 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-posta veya Telefon"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Şifre"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
          </View>

          <Pressable style={{ alignSelf: "flex-end", marginTop: 12 }}>
            <Text style={{ color: colors.primary, fontSize: 13 }}>Şifremi Unuttum</Text>
          </Pressable>

          <Pressable
            onPress={handleLogin}
            style={({ pressed }) => [
              {
                marginTop: 24,
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 15,
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>Giriş Yap</Text>
          </Pressable>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24 }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>Hesabınız yok mu? </Text>
            <Pressable onPress={() => router.push("/register" as any)}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Kayıt Ol</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
