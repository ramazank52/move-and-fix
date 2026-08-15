import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const requestReset = trpc.auth.requestPasswordReset.useMutation({ onSuccess: () => { setRequested(true); setFeedback("Hesap varsa sıfırlama kodu e-posta adresine gönderildi."); }, onError: (error) => setFeedback(error.message) });
  const resetPassword = trpc.auth.resetPassword.useMutation({ onSuccess: () => { setFeedback("Parolanız güncellendi. Giriş yapabilirsiniz."); setTimeout(() => router.replace("/login" as never), 700); }, onError: (error) => setFeedback(error.message) });
  const validPassword = password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-6"><View style={{ flex: 1, justifyContent: "center" }}><View style={{ width: 68, height: 68, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary + "18", marginBottom: 22 }}><IconSymbol name="key.fill" size={31} color={colors.primary} /></View><Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>Parolanızı yenileyin</Text><Text style={{ marginTop: 9, color: colors.muted, fontSize: 15, lineHeight: 22 }}>E-posta adresinizi yazın; size tek kullanımlık bir güvenlik kodu gönderelim.</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="E-posta adresiniz" placeholderTextColor={colors.muted} style={{ marginTop: 24, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, padding: 15, color: colors.foreground, fontSize: 15 }} />{requested ? <><TextInput value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" placeholder="6 haneli kod" placeholderTextColor={colors.muted} style={{ marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, padding: 15, color: colors.foreground, fontSize: 15 }} /><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Yeni parola" placeholderTextColor={colors.muted} style={{ marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, padding: 15, color: colors.foreground, fontSize: 15 }} /><Text style={{ marginTop: 8, color: colors.muted, fontSize: 12 }}>En az 10 karakter; büyük/küçük harf ve rakam içermeli.</Text></> : null}{feedback ? <Text style={{ marginTop: 12, color: requestReset.isError || resetPassword.isError ? colors.error : colors.success, fontSize: 13, lineHeight: 19 }}>{feedback}</Text> : null}<Pressable disabled={!email.includes("@") || requestReset.isPending || (requested && (!/^\d{6}$/.test(code) || !validPassword || resetPassword.isPending))} onPress={() => requested ? resetPassword.mutate({ email, code, password }) : requestReset.mutate({ email })} style={({ pressed }) => ({ marginTop: 22, minHeight: 54, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 })}>{requestReset.isPending || resetPassword.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{requested ? "Parolayı güncelle" : "Kod gönder"}</Text>}</Pressable><Pressable onPress={() => router.back()} style={{ alignSelf: "center", marginTop: 18 }}><Text style={{ color: colors.primary, fontWeight: "700" }}>Girişe dön</Text></Pressable></View></ScreenContainer>;
}
