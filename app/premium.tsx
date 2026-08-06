import { Text, View, ScrollView, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

export default function PremiumScreen() {
  const colors = useColors();
  const router = useRouter();

  const features = [
    "Öncelikli müşteri desteği",
    "Favori ustalara hızlı erişim",
    "Kampanyalara erken erişim",
    "Yapay zekâdan gelişmiş öneriler",
    "Detaylı hizmet geçmişi raporları",
    "Reklamsız deneyim",
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
          Premium Üyelik
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Hero */}
        <View style={{ alignItems: "center", marginBottom: 30 }}>
          <View
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: "#A855F7",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <IconSymbol name="star.fill" size={32} color="#FFF" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground }}>Move&Fix Premium</Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 8 }}>
            Daha iyi hizmet deneyimi için Premium'a geçin
          </Text>
        </View>

        {/* Features */}
        <View style={{ gap: 12, marginBottom: 30 }}>
          {features.map((feature) => (
            <View
              key={feature}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <IconSymbol name="checkmark" size={18} color="#A855F7" />
              <Text style={{ fontSize: 15, color: colors.foreground }}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={{ gap: 12 }}>
          <Pressable
            style={({ pressed }) => [
              {
                padding: 18,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: "#A855F7",
                backgroundColor: "#A855F7" + "10",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Yıllık Plan</Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>En avantajlı</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: "#A855F7" }}>₺49.99/ay</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>₺599.88/yıl</Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              {
                padding: 18,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Aylık Plan</Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>İstediğin zaman iptal et</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground }}>₺79.99/ay</Text>
            </View>
          </Pressable>
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [
            {
              marginTop: 24,
              backgroundColor: "#A855F7",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>Premium'a Geç</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

