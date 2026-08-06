import { Text, View, ScrollView, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";

export default function ProfileScreen() {
  const colors = useColors();

  const menuItems = [
    { icon: "checkmark.shield.fill" as const, label: "Hesap Doğrulama", route: "/verify/email" },
    { icon: "person.fill" as const, label: "Profil Bilgileri", route: "/settings/profile-edit" },
    { icon: "location.fill" as const, label: "Adreslerim", route: "/settings/addresses" },
    { icon: "heart.fill" as const, label: "Favorilerim", route: "/settings/favorites" },
    { icon: "creditcard.fill" as const, label: "Ödeme Yöntemlerim", route: "/settings/payments" },
    { icon: "bell.fill" as const, label: "Bildirim Ayarları", route: "/settings/notifications" },
    { icon: "bell.fill" as const, label: "Bildirim Sesleri & Titreşim", route: "/settings/notification-sounds" },
    { icon: "heart.fill" as const, label: "Arkadaşını Davet Et", route: "/referral" },
    { icon: "doc.text.fill" as const, label: "Yasal Sözleşmeler", route: "/legal" },
    { icon: "gearshape.fill" as const, label: "Ayarlar", route: "/settings/general" },
    { icon: "questionmark.circle.fill" as const, label: "Yardım & Destek", route: "/settings/help" },
    { icon: "sparkles" as const, label: "Premium Üyelik", route: "/premium" },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Header */}
        <View className="items-center pt-6 pb-4 px-4">
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 32, fontWeight: "bold" }}>M</Text>
          </View>
          <Text className="text-xl font-bold text-foreground">Kullanıcı</Text>
          <Text className="text-sm text-muted mt-1">kullanici@email.com</Text>
          {/* Verification Badges */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.success + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: colors.success, fontWeight: "600" }}>✓ E-posta Doğrulanmış</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.primary + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>✓ Telefon Doğrulanmış</Text>
            </View>
          </View>
          <View className="flex-row mt-3 gap-4">
            <View className="items-center">
              <Text className="text-lg font-bold text-foreground">12</Text>
              <Text className="text-xs text-muted">İş</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-bold text-foreground">4.8</Text>
              <Text className="text-xs text-muted">Puan</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-bold text-foreground">3</Text>
              <Text className="text-xs text-muted">Favori</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View className="px-4 mt-4">
          {menuItems.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: pressed ? colors.surface : "transparent",
                  borderBottomWidth: index < menuItems.length - 1 ? 0.5 : 0,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <IconSymbol name={item.icon} size={22} color={colors.primary} />
              <Text
                style={{
                  flex: 1,
                  marginLeft: 14,
                  fontSize: 15,
                  color: colors.foreground,
                }}
              >
                {item.label}
              </Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <View className="px-4 mt-6">
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              {
                alignItems: "center",
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: pressed ? colors.surface : "transparent",
                borderWidth: 1,
                borderColor: colors.error,
              },
            ]}
          >
            <Text style={{ color: colors.error, fontWeight: "600", fontSize: 15 }}>
              Çıkış Yap
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
