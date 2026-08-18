import { ActivityIndicator, Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { RegistrationConsent } from "@/components/registration-consent";
import { setSessionToken } from "@/lib/_core/auth";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type UserRole = "customer" | "provider";

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"form" | "consent">("form");
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useAuth();
  const localRegister = trpc.auth.register.useMutation({
    onSuccess: async (result) => {
      if (Platform.OS !== "web" && result.user.sessionToken) await setSessionToken(result.user.sessionToken);
      await refresh();
      router.replace("/verify-email" as never);
    },
    onError: (registrationError) => setError(registrationError.message),
  });

  const handleRegister = () => {
    setError(null);
    if (name.trim().length < 2 || !email.includes("@") || password.length < 10) {
      setError("Ad soyad, geçerli e-posta ve en az 10 karakterlik parola gereklidir.");
      return;
    }
    setStep("consent");
  };

  const handleConsentAccepted = async (acceptedConsentKeys: string[]) => {
    localRegister.mutate({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, password, accountType: role, nativeSession: Platform.OS !== "web", acceptedConsentKeys: acceptedConsentKeys as ("terms" | "privacy" | "kvkk" | "cookies" | "mediation" | "electronic")[] });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 40 }}>
          <View style={{ alignItems: "center", marginBottom: 30 }}>
            <Text style={{ fontSize: 26, fontWeight: "bold", color: colors.foreground }}>Hesap Oluştur</Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 6 }}>
              Move&Fix’e hoş geldiniz
            </Text>
          </View>

          {/* Role Selection */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
            <Pressable
              onPress={() => setRole("customer")}
              style={({ pressed }) => [
                {
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: role === "customer" ? colors.primary : colors.border,
                  backgroundColor: role === "customer" ? colors.primary + "10" : colors.surface,
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 28, marginBottom: 6 }}>👤</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: role === "customer" ? colors.primary : colors.foreground }}>
                Müşteri
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Hizmet almak istiyorum</Text>
            </Pressable>
            <Pressable
              onPress={() => setRole("provider")}
              style={({ pressed }) => [
                {
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: role === "provider" ? colors.primary : colors.border,
                  backgroundColor: role === "provider" ? colors.primary + "10" : colors.surface,
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 28, marginBottom: 6 }}>🔧</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: role === "provider" ? colors.primary : colors.foreground }}>
                Hizmet Sağlayıcı
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Hizmet vermek istiyorum</Text>
            </Pressable>
          </View>

          {/* Form */}
          <View style={{ gap: 14 }}>
            {error ? <View style={{ backgroundColor: colors.error + "18", borderRadius: 12, borderWidth: 1, borderColor: colors.error + "55", padding: 12 }}><Text style={{ color: colors.error, fontSize: 13, lineHeight: 19 }}>{error}</Text></View> : null}
            {step === "form" ? (
              <>
                <TextInput
                  accessibilityLabel="Ad ve soyad"
                  accessibilityHint="Hesabınızda görünecek ad ve soyadınızı girin"
                  textContentType="name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Ad Soyad"
                  placeholderTextColor={colors.muted}
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
                  accessibilityLabel="E-posta adresi"
                  accessibilityHint="Hesabınıza kayıtlı e-posta adresini girin"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="E-posta"
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
                  accessibilityLabel="Telefon numarası"
                  accessibilityHint="Doğrulama için telefon numaranızı girin"
                  textContentType="telephoneNumber"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Telefon"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
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
                  accessibilityLabel="Parola"
                  accessibilityHint="En az on karakter, büyük harf, küçük harf ve rakam içeren bir parola girin"
                  textContentType="newPassword"
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
                <Pressable
                  accessibilityLabel="Kayıt bilgileriyle devam et"
                  accessibilityState={{ disabled: localRegister.isPending }}
                  onPress={handleRegister}
                  style={({ pressed }) => [
                    {
                      marginTop: 10,
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                      paddingVertical: 15,
                      alignItems: "center",
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>Devam Et</Text>
                </Pressable>
              </>
            ) : (
              <View style={{ gap: 14 }}>
                <RegistrationConsent onAllAccepted={handleConsentAccepted} />
                {localRegister.isPending ? <ActivityIndicator color={colors.primary} /> : null}
                <Pressable onPress={() => setStep("form")} disabled={localRegister.isPending} style={{ alignSelf: "center" }}><Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>Formu düzenle</Text></Pressable>
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>Zaten hesabınız var mı? </Text>
            <Pressable onPress={() => router.push("/login" as any)}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Giriş Yap</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
