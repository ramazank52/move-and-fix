import { View, Text, Pressable, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";

export default function ProfileScreen() {
  const colors = useColors();

  const menuGroups = [
    {
      title: "Hesap",
      items: [
        { icon: "checkmark.shield.fill" as const, label: "Hesap Doğrulama", route: "/verify/email", color: colors.success },
        { icon: "person.fill" as const, label: "Profil Bilgileri", route: "/settings/profile-edit", color: colors.primary },
        { icon: "location.fill" as const, label: "Adreslerim", route: "/settings/addresses", color: "#3B82F6" },
        { icon: "heart.fill" as const, label: "Favorilerim", route: "/settings/favorites", color: "#EF4444" },
        { icon: "creditcard.fill" as const, label: "Ödeme Yöntemlerim", route: "/settings/payments", color: "#10B981" },
      ],
    },
    {
      title: "Bildirimler",
      items: [
        { icon: "bell.fill" as const, label: "Bildirim Ayarları", route: "/settings/notifications", color: "#F59E0B" },
        { icon: "bell.fill" as const, label: "Bildirim Sesleri & Titreşim", route: "/settings/notification-sounds", color: "#F59E0B" },
      ],
    },
    {
      title: "Sosyal",
      items: [
        { icon: "heart.fill" as const, label: "Arkadaşını Davet Et", route: "/referral", color: "#EF4444" },
        { icon: "person.fill" as const, label: "Ustaları Karşılaştır", route: "/compare-providers", color: "#8B5CF6" },
        { icon: "message.fill" as const, label: "Sesli Mesajlar", route: "/chat/voice-message", color: "#06B6D4" },
      ],
    },
    {
      title: "Raporlar",
      items: [
        { icon: "chart.bar.fill" as const, label: "Hizmet Geçmişi Raporu", route: "/history-report", color: "#3B82F6" },
        { icon: "line.horizontal.3.decrease.circle.fill" as const, label: "Usta Filtreleme", route: "/explore/filter", color: "#8B5CF6" },
        { icon: "calendar" as const, label: "Hizmet Takvimi", route: "/calendar", color: "#10B981" },
      ],
    },
    {
      title: "Diğer",
      items: [
        { icon: "doc.text.fill" as const, label: "Yasal Sözleşmeler", route: "/legal", color: colors.muted },
        { icon: "gearshape.fill" as const, label: "Ayarlar", route: "/settings/general", color: colors.muted },
        { icon: "questionmark.circle.fill" as const, label: "Yardım & Destek", route: "/settings/help", color: colors.muted },
      ],
    },
  ];

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Header */}
        <View style={{ alignItems: "center", paddingTop: 30, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 26,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 34, fontWeight: "800" }}>M</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>Kullanıcı</Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>kullanici@email.com</Text>

          {/* Verification Badges */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.success + "15", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
              <IconSymbol name="checkmark.seal.fill" size={11} color={colors.success} />
              <Text style={{ fontSize: 11, color: colors.success, fontWeight: "600", marginLeft: 4 }}>E-posta</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.primary + "15", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
              <IconSymbol name="checkmark.seal.fill" size={11} color={colors.primary} />
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600", marginLeft: 4 }}>Telefon</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: "row", marginTop: 20, gap: 24 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>12</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>İş</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>4.8</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Puan</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>3</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Favori</Text>
            </View>
          </View>
        </View>

        {/* Premium Banner */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Pressable
            onPress={() => router.push("/premium" as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 20,
                padding: 18,
                backgroundColor: colors.accentPurple + "10",
                borderWidth: 1,
                borderColor: colors.accentPurple + "30",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: colors.accentPurple + "20",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name="sparkles" size={22} color={colors.accentPurple} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                Premium Üyelik
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                Öncelikli hizmet, sınırsız teklif ve daha fazlası
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.accentPurple} />
          </Pressable>
        </View>

        {/* Menu Groups */}
        {menuGroups.map((group, gi) => (
          <View key={gi} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 10, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {group.title}
            </Text>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 0.5,
                borderColor: colors.border,
                overflow: "hidden",
              }}
            >
              {group.items.map((item, index) => (
                <Pressable
                  key={item.label}
                  onPress={() => router.push(item.route as any)}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      backgroundColor: pressed ? colors.surface : "transparent",
                      borderBottomWidth: index < group.items.length - 1 ? 0.5 : 0,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: item.color + "15",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      fontSize: 15,
                      color: colors.foreground,
                      fontWeight: "500",
                    }}
                  >
                    {item.label}
                  </Text>
                  <IconSymbol name="chevron.right" size={14} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              {
                alignItems: "center",
                paddingVertical: 15,
                borderRadius: 16,
                backgroundColor: pressed ? colors.error + "08" : "transparent",
                borderWidth: 1,
                borderColor: colors.error + "30",
              },
            ]}
          >
            <Text style={{ color: colors.error, fontWeight: "700", fontSize: 15 }}>
              Çıkış Yap
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
