import { Text, View, ScrollView, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

export default function ProviderDashboardScreen() {
  const colors = useColors();
  const router = useRouter();

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
          Usta Paneli
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* MoveScore */}
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 14, opacity: 0.9 }}>MoveScore</Text>
          <Text style={{ color: "#FFF", fontSize: 36, fontWeight: "bold", marginTop: 4 }}>92</Text>
          <Text style={{ color: "#FFF", fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            Harika! Üst sıralarda yer alıyorsunuz.
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.muted }}>Bu Ay Kazanç</Text>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.success, marginTop: 4 }}>
              ₺12.450
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.muted }}>Tamamlanan İş</Text>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginTop: 4 }}>
              28
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.muted }}>Ortalama Puan</Text>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#F59E0B", marginTop: 4 }}>
              4.9 ★
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.muted }}>Yanıt Süresi</Text>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginTop: 4 }}>
              ~12 dk
            </Text>
          </View>
        </View>

        {/* Active Jobs */}
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground, marginBottom: 12 }}>
          Aktif İşler
        </Text>
        {[
          { title: "Klima Bakımı", customer: "Ali B.", price: "₺850", time: "Bugün 14:00" },
          { title: "Klima Montajı", customer: "Zeynep K.", price: "₺1.200", time: "Yarın 10:00" },
        ].map((job, i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{job.title}</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>{job.price}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
              {job.customer} • {job.time}
            </Text>
          </View>
        ))}

        {/* New Requests */}
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground, marginTop: 16, marginBottom: 12 }}>
          Yeni Talepler (3)
        </Text>
        {[
          { title: "Klima Temizliği", budget: "₺500-800", location: "Kadıköy", time: "2 saat önce" },
          { title: "Split Klima Montajı", budget: "₺1.000-1.500", location: "Ataşehir", time: "4 saat önce" },
          { title: "Klima Gaz Dolumu", budget: "₺300-500", location: "Üsküdar", time: "5 saat önce" },
        ].map((req, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              {
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.primary + "30",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{req.title}</Text>
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "500" }}>{req.budget}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
              {req.location} • {req.time}
            </Text>
            <Pressable
              style={({ pressed }) => [
                {
                  marginTop: 10,
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                  paddingVertical: 8,
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}>Teklif Ver</Text>
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
