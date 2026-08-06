import { Text, View, TextInput, ScrollView, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ProfileEditScreen() {
  const colors = useColors();
  const router = useRouter();
  const [name, setName] = useState("Kullanıcı");
  const [email, setEmail] = useState("kullanici@email.com");
  const [phone, setPhone] = useState("+90 555 123 4567");

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
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
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
          style={({ pressed }) => [
            {
              marginTop: 10,
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600" }}>Kaydet</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
