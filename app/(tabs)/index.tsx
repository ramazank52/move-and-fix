import { ScrollView, Text, View, TextInput, Pressable, FlatList } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CATEGORIES } from "@/lib/data/categories";
import { SAMPLE_PROVIDERS } from "@/lib/data/providers";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const topProviders = SAMPLE_PROVIDERS.filter((p) => p.rating >= 4.8);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-muted">Merhaba 👋</Text>
              <Text className="text-xl font-bold text-foreground">Move&Fix</Text>
            </View>
            <Pressable
              onPress={() => router.push("/notifications" as any)}
              style={({ pressed }) => [
                {
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <IconSymbol name="bell.fill" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View className="px-5 mt-3">
          <Pressable
            onPress={() => router.push("/(tabs)/explore" as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 13,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
            <Text style={{ marginLeft: 10, color: colors.muted, fontSize: 15 }}>
              Hizmet veya usta ara...
            </Text>
          </Pressable>
        </View>

        {/* Campaign Banner */}
        <View className="px-5 mt-5">
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 16,
              padding: 20,
              overflow: "hidden",
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "bold" }}>
              İlk Hizmetine %20 İndirim!
            </Text>
            <Text style={{ color: "#FFF", fontSize: 13, marginTop: 6, opacity: 0.9 }}>
              Yeni üyelere özel kampanya. Hemen hizmet al!
            </Text>
            <Pressable
              style={({ pressed }) => [
                {
                  marginTop: 12,
                  backgroundColor: "#FFF",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignSelf: "flex-start",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>
                Keşfet
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Categories */}
        <View className="mt-6">
          <View className="px-5 flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-foreground">Hizmet Kategorileri</Text>
            <Pressable onPress={() => router.push("/(tabs)/explore" as any)}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
                Tümü
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {CATEGORIES.slice(0, 8).map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => router.push(`/category/${cat.id}` as any)}
                style={({ pressed }) => [
                  {
                    alignItems: "center",
                    width: 72,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: cat.color + "18",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
                </View>
                <Text
                  style={{ fontSize: 11, color: colors.foreground, textAlign: "center" }}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Top Rated Providers */}
        <View className="mt-6">
          <View className="px-5 flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-foreground">En Yüksek Puanlı</Text>
            <Pressable>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
                Tümü
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {topProviders.map((provider) => (
              <Pressable
                key={provider.id}
                onPress={() => router.push(`/provider/${provider.id}` as any)}
                style={({ pressed }) => [
                  {
                    width: 200,
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.primary + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primary }}>
                      {provider.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}
                      numberOfLines={1}
                    >
                      {provider.name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                      <Text style={{ fontSize: 12, color: "#F59E0B" }}>★</Text>
                      <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 3 }}>
                        {provider.rating} ({provider.reviewCount})
                      </Text>
                    </View>
                  </View>
                </View>
                {provider.verified && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: colors.success }}>✓ Doğrulanmış</Text>
                    {provider.premium && (
                      <Text style={{ fontSize: 11, color: "#A855F7", marginLeft: 8 }}>
                        ★ Premium
                      </Text>
                    )}
                  </View>
                )}
                <Text style={{ fontSize: 12, color: colors.muted }}>{provider.distance}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* AI Assistant CTA */}
        <View className="px-5 mt-6">
          <Pressable
            onPress={() => router.push("/ai-assistant" as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#6366F1" + "15",
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: "#6366F1" + "30",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#6366F1",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name="sparkles" size={22} color="#FFF" />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                MoveAI Asistan
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                Yapay zekâ ile hizmet bul, fiyat tahmini al
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View className="px-5 mt-6">
          <Text className="text-lg font-bold text-foreground mb-3">Hızlı İşlemler</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => router.push("/create-service" as any)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: colors.success + "15",
                  borderRadius: 14,
                  padding: 16,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <IconSymbol name="plus.circle.fill" size={28} color={colors.success} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.success,
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                Hizmet Talebi
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/explore" as any)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: colors.primary + "15",
                  borderRadius: 14,
                  padding: 16,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <IconSymbol name="magnifyingglass" size={28} color={colors.primary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.primary,
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                Usta Bul
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/my-jobs" as any)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: "#6366F1" + "15",
                  borderRadius: 14,
                  padding: 16,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <IconSymbol name="briefcase.fill" size={28} color="#6366F1" />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#6366F1",
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                İşlerim
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Emergency & Transport Services */}
        <View className="px-5 mt-6">
          <Text className="text-lg font-bold text-foreground mb-3">Acil & Ulaşım Hizmetleri</Text>
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => router.push("/service/tow-truck" as any)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#DC2626" + "10",
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#DC2626" + "25",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#DC2626" + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 22 }}>🚛</Text>
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>Çekici</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>7/24 • ₺25/km • Başlangıç ₺200</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>

            <Pressable
              onPress={() => router.push("/service/roadside" as any)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#B91C1C" + "10",
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#B91C1C" + "25",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#B91C1C" + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 22 }}>🚨</Text>
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>Yol Yardım</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>7/24 • ₺18/km • Başlangıç ₺100</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>

            <Pressable
              onPress={() => router.push("/service/courier" as any)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#0EA5E9" + "10",
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#0EA5E9" + "25",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#0EA5E9" + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 22 }}>📦</Text>
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>Kurye & Evrak</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>Hızlı teslimat • ₺12/km • Başlangıç ₺50</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>

            {/* Map Link */}
            <Pressable
              onPress={() => router.push("/map" as any)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#3B82F6" + "10",
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#3B82F6" + "25",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#3B82F6" + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 22 }}>📍</Text>
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>Yakınımdaki Ustalar</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>Haritada ustaları gör</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
