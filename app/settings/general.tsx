import { Text, View, ScrollView, Pressable, Switch } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function GeneralSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("Türkçe");

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
          Ayarlar
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Language */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.foreground }}>Dil</Text>
          <Text style={{ fontSize: 14, color: colors.primary }}>{language}</Text>
        </View>

        {/* Dark Mode */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.foreground }}>Karanlık Mod</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: colors.primary }} />
        </View>

        {/* Notifications */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.foreground }}>Bildirimler</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: colors.primary }} />
        </View>

        {/* Currency */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.foreground }}>Para Birimi</Text>
          <Text style={{ fontSize: 14, color: colors.primary }}>₺ TRY</Text>
        </View>

        {/* About */}
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.foreground }}>Hakkında</Text>
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </Pressable>

        {/* Privacy */}
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.foreground }}>Gizlilik Politikası</Text>
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </Pressable>

        {/* Terms */}
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.foreground }}>Kullanım Koşulları</Text>
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </Pressable>

        <Text style={{ textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 30 }}>
          Move&Fix v1.0.0
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

