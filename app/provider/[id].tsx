import {
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
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
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: colors.foreground }}>
          Usta Profili
        </Text>
        <Pressable style={{ padding: 4 }}>
          <IconSymbol name="heart" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Header */}
        <View style={{ alignItems: "center", paddingVertical: 24, paddingHorizontal: 20 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 26,
              backgroundColor: colors.primary + "15",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: "800", color: colors.primary }}>
              {provider.avatarInitials}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>
            {provider.name}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
            {provider.categoryName} · {provider.location}
          </Text>

          {/* Badges */}
          <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
            {provider.verified && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.success + "15",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                }}
              >
                <IconSymbol name="checkmark.seal.fill" size={12} color={colors.success} />
                <Text style={{ fontSize: 12, color: colors.success, fontWeight: "600", marginLeft: 4 }}>
                  Doğrulanmış
                </Text>
              </View>
            )}
            {provider.premium && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.accentPurple + "15",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                }}
              >
                <IconSymbol name="star.fill" size={12} color={colors.accentPurple} />
                <Text style={{ fontSize: 12, color: colors.accentPurple, fontWeight: "600", marginLeft: 4 }}>
                  Premium
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
          >
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconSymbol name="star.fill" size={16} color="#FFB800" />
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground, marginLeft: 4 }}>
                  {provider.rating}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Puan</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground }}>
                {provider.completedJobs}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Tamamlanan İş</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground }}>
                {provider.responseTime}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Yanıt Süresi</Text>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>
            Hakkında
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 22 }}>
            {provider.description}
          </Text>
        </View>

        {/* Services */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
            Hizmetler
          </Text>
          <View style={{ gap: 8 }}>
            {provider.services.map((service) => (
              <View
                key={service}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: colors.success + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconSymbol name="checkmark" size={16} color={colors.success} />
                </View>
                <Text style={{ marginLeft: 12, fontSize: 14, color: colors.foreground, fontWeight: "500" }}>
                  {service}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Price */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.primary + "08",
              borderRadius: 16,
              padding: 18,
            }}
          >
            <View>
              <Text style={{ fontSize: 13, color: colors.muted }}>Başlangıç Fiyatı</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.primary, marginTop: 4 }}>
                {provider.price}
              </Text>
            </View>
            <IconSymbol name="tag.fill" size={24} color={colors.primary} />
          </View>
        </View>

        {/* Reviews */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
            Değerlendirmeler ({provider.reviewCount})
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 1,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View style={{ flexDirection: "row" }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <IconSymbol key={i} name="star.fill" size={14} color="#FFB800" />
                ))}
              </View>
              <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 8, fontWeight: "600" }}>
                Ayşe K.
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 11, color: colors.muted }}>3 gün önce</Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>
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
          onPress={() => router.push(`/chat/${provider.id}?otherUserId=${provider.id}` as any)}
          style={({ pressed }) => [
            {
              flex: 1,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: colors.primary,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 15 }}>Mesaj Gönder</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/create-service?providerId=${provider.id}` as any)}
          style={({ pressed }) => [
            {
              flex: 1,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: colors.primary,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 3,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 15 }}>Teklif İste</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
