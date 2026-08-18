import { ActivityIndicator, Alert, Text, View, TextInput, ScrollView, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function ProfileEditScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async (result) => {
      await refresh();
      if (result.emailVerificationRequired) {
        Alert.alert("E-posta doğrulaması gerekli", "Yeni e-posta adresinizi doğrulamak için size gönderilen kodu girin.", [
          { text: "Şimdi doğrula", onPress: () => router.push("/verify/email" as never) },
        ]);
        return;
      }
      Alert.alert("Profil güncellendi", "Bilgileriniz güvenli biçimde kaydedildi.", [{ text: "Tamam", onPress: () => router.back() }]);
    },
    onError: (error) => Alert.alert("Profil güncellenemedi", error.message || "Lütfen bilgilerinizi kontrol edip yeniden deneyin."),
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
        <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          Profil Bilgileri
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>Ad Soyad</Text>
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
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>E-posta</Text>
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
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>Telefon</Text>
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profil bilgilerini kaydet"
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
          {updateProfile.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600" }}>Kaydet</Text>}
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
