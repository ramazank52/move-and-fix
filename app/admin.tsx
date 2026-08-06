import { Text, View, ScrollView, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

export default function AdminDashboardScreen() {
  const colors = useColors();
  const router = useRouter();

  const stats = [
    { label: "Toplam Kullanıcı", value: "12.450", change: "+8%", color: "#3B82F6" },
    { label: "Aktif Usta", value: "2.340", change: "+12%", color: "#10B981" },
    { label: "Aylık Gelir", value: "₺245K", change: "+15%", color: "#F59E0B" },
    { label: "Tamamlanan İş", value: "8.920", change: "+22%", color: "#A855F7" },
  ];

  const recentActivities = [
    { type: "user", text: "Yeni kullanıcı kaydı: Ayşe K.", time: "5 dk önce" },
    { type: "payment", text: "Ödeme onaylandı: ₺1.200", time: "12 dk önce" },
    { type: "report", text: "Yeni şikayet raporu #1234", time: "30 dk önce" },
    { type: "provider", text: "Yeni usta başvurusu: Mehmet D.", time: "1 saat önce" },
    { type: "system", text: "Sistem güncellemesi tamamlandı", time: "2 saat önce" },
  ];

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
          Admin Paneli
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Stats Grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={{
                width: "48%",
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.muted }}>{stat.label}</Text>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: stat.color, marginTop: 4 }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 11, color: colors.success, marginTop: 4 }}>{stat.change} bu ay</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Hızlı İşlemler
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          {[
            { icon: "person.fill" as const, label: "Kullanıcılar", color: "#3B82F6" },
            { icon: "wrench.fill" as const, label: "Kategoriler", color: "#10B981" },
            { icon: "chart.bar.fill" as const, label: "Raporlar", color: "#F59E0B" },
            { icon: "gearshape.fill" as const, label: "Ayarlar", color: "#6366F1" },
          ].map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [
                {
                  flex: 1,
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: action.color + "12",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <IconSymbol name={action.icon} size={22} color={action.color} />
              <Text style={{ fontSize: 11, color: action.color, fontWeight: "500", marginTop: 6 }}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Commission Settings */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 10 }}>
            Komisyon Ayarları
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>Standart Komisyon</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>%15</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>Premium Usta Komisyonu</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#A855F7" }}>%10</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>Yeni Usta Komisyonu</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.success }}>%5 (ilk ay)</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Son Aktiviteler
        </Text>
        {recentActivities.map((activity, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              borderBottomWidth: i < recentActivities.length - 1 ? 0.5 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.primary,
                marginRight: 12,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.foreground }}>{activity.text}</Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.muted }}>{activity.time}</Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
