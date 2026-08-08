import {
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CATEGORIES } from "@/lib/data/categories";
import { SAMPLE_PROVIDERS, Provider } from "@/lib/data/providers";

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();

  // Route km-based categories to their dedicated screens
  if (id === "courier") return <Redirect href={"/service/courier" as any} />;
  if (id === "tow_truck") return <Redirect href={"/service/tow-truck" as any} />;
  if (id === "roadside") return <Redirect href={"/service/roadside" as any} />;

  const category = CATEGORIES.find((c) => c.id === id);
  const providers = SAMPLE_PROVIDERS.filter((p) => p.category === id);

  const renderProvider = ({ item }: { item: Provider }) => (
    <Pressable
      onPress={() => router.push(`/provider/${item.id}` as any)}
      style={({ pressed }) => [
        {
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: 16,
          marginBottom: 12,
          opacity: pressed ? 0.9 : 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
          borderWidth: 0.5,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: colors.primary + "15",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.primary }}>
            {item.avatarInitials}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }} numberOfLines={1}>
              {item.name}
            </Text>
            {item.verified && (
              <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
            {item.location}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <IconSymbol name="star.fill" size={12} color="#FFB800" />
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, marginLeft: 3 }}>
              {item.rating}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 3 }}>
              ({item.reviewCount})
            </Text>
            <View style={{ width: 1, height: 10, backgroundColor: colors.border, marginHorizontal: 8 }} />
            <IconSymbol name="clock.fill" size={11} color={colors.muted} />
            <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 3 }}>
              {item.responseTime}
            </Text>
          </View>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
          {item.price}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <IconSymbol name="location.fill" size={12} color={colors.muted} />
          <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 3 }}>
            {item.distance}
          </Text>
        </View>
      </View>
    </Pressable>
  );

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
          {category?.name || "Kategori"}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Category Hero */}
        {category && (
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 20,
                padding: 20,
                backgroundColor: category.gradientColors[0],
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.3)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 32 }}>{category.icon}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#1A1A1A" }}>
                  {category.name}
                </Text>
                <Text style={{ fontSize: 13, color: "rgba(0,0,0,0.6)", marginTop: 4 }}>
                  {category.serviceCount} profesyonel · {category.subcategories.length} alt kategori
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Subcategories */}
        {category && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>
              Alt Kategoriler
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {category.subcategories.map((sub) => (
                <Pressable
                  key={sub}
                  onPress={() => router.push(`/service-request?category=${category.id}&sub=${encodeURIComponent(sub)}` as any)}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: colors.card,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: "500" }}>{sub}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Providers */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
            Bu Kategorideki Ustalar
          </Text>
          {providers.length > 0 ? (
            providers.map((p) => (
              <Pressable key={p.id} onPress={() => router.push(`/provider/${p.id}` as any)}>
                {renderProvider({ item: p })}
              </Pressable>
            ))
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 28, marginBottom: 12 }}>🔍</Text>
              <Text style={{ fontSize: 14, color: colors.muted }}>
                Bu kategoride henüz usta bulunmuyor
              </Text>
              <Pressable
                onPress={() => router.push(`/service-request?category=${id}` as any)}
                style={({ pressed }) => [
                  {
                    marginTop: 16,
                    backgroundColor: colors.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 14,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFF" }}>
                  Talep Oluştur
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
