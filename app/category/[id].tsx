import { Text, View, FlatList, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CATEGORIES } from "@/lib/data/categories";
import { SAMPLE_PROVIDERS } from "@/lib/data/providers";

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const category = CATEGORIES.find((c) => c.id === id);
  const providers = SAMPLE_PROVIDERS.filter((p) => p.category === id);

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
          {category?.name || "Kategori"}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Subcategories */}
      {category && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {category.subcategories.map((sub) => (
              <View
                key={sub}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: category.color + "15",
                }}
              >
                <Text style={{ fontSize: 12, color: category.color, fontWeight: "500" }}>{sub}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Providers */}
      <FlatList
        data={providers.length > 0 ? providers : SAMPLE_PROVIDERS.slice(0, 3)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/provider/${item.id}` as any)}
            style={({ pressed }) => [
              {
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: colors.primary + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary }}>
                  {item.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{item.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                  <Text style={{ fontSize: 13, color: "#F59E0B" }}>★ {item.rating}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 6 }}>
                    ({item.reviewCount} değerlendirme)
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
                  {item.distance} • {item.responseTime} yanıt
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>{item.price}</Text>
                {item.verified && (
                  <Text style={{ fontSize: 11, color: colors.success, marginTop: 4 }}>✓ Doğrulanmış</Text>
                )}
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ color: colors.muted }}>Bu kategoride henüz usta bulunmuyor</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
