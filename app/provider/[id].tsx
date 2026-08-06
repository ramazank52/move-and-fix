import { Text, View, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SAMPLE_PROVIDERS } from "@/lib/data/providers";

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const provider = SAMPLE_PROVIDERS.find((p) => p.id === id) || SAMPLE_PROVIDERS[0];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
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
          Usta Profili
        </Text>
        <Pressable style={{ padding: 4 }}>
          <IconSymbol name="heart.fill" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Header */}
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.primary + "20",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.primary }}>
              {provider.name.charAt(0)}
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground }}>
            {provider.name}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>{provider.location}</Text>

          {/* Badges */}
          <View style={{ flexDirection: "row", marginTop: 10, gap: 8 }}>
            {provider.verified && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.success + "15",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.success, fontWeight: "600" }}>✓ Doğrulanmış</Text>
              </View>
            )}
            {provider.premium && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#A855F7" + "15",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 12, color: "#A855F7", fontWeight: "600" }}>★ Premium</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View
          style={{
            flexDirection: "row",
            marginHorizontal: 20,
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground }}>
              {provider.rating}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Puan</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground }}>
              {provider.completedJobs}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>İş</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground }}>
              {provider.responseTime}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Yanıt</Text>
          </View>
        </View>

        {/* About */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>
            Hakkında
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 22 }}>
            {provider.description}
          </Text>
        </View>

        {/* Services */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 10 }}>
            Hizmetler
          </Text>
          <View style={{ gap: 8 }}>
            {provider.services.map((service) => (
              <View
                key={service}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                }}
              >
                <IconSymbol name="checkmark" size={16} color={colors.success} />
                <Text style={{ marginLeft: 10, fontSize: 14, color: colors.foreground }}>{service}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Price Range */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>
            Fiyat Aralığı
          </Text>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{provider.price}</Text>
        </View>

        {/* Reviews placeholder */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 10 }}>
            Değerlendirmeler ({provider.reviewCount})
          </Text>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 14, color: "#F59E0B" }}>★★★★★</Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 8 }}>Ayşe K.</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 20 }}>
              Çok profesyonel ve hızlı bir hizmet aldım. Kesinlikle tavsiye ederim.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          padding: 16,
          paddingBottom: 30,
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.push(`/chat/${provider.id}` as any)}
          style={({ pressed }) => [
            {
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: colors.primary,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>Mesaj Gönder</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/create-service" as any)}
          style={({ pressed }) => [
            {
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: colors.primary,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontWeight: "600", fontSize: 15 }}>Teklif İste</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
