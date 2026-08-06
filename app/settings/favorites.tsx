import { Text, View, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SAMPLE_PROVIDERS } from "@/lib/data/providers";

export default function FavoritesScreen() {
  const colors = useColors();
  const router = useRouter();
  const favorites = SAMPLE_PROVIDERS.slice(0, 3);

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
          Favorilerim
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/provider/${item.id}` as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primary + "18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>
                {item.name.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{item.name}</Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                ★ {item.rating} • {item.completedJobs} iş
              </Text>
            </View>
            <IconSymbol name="heart.fill" size={20} color={colors.error} />
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}
