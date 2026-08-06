import { Text, View, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LEGAL_DOCUMENTS } from "@/lib/data/legal";

export default function LegalIndexScreen() {
  const colors = useColors();
  const router = useRouter();

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
          Yasal Belgeler
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={LEGAL_DOCUMENTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/legal/${item.id}` as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <IconSymbol name="doc.text.fill" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                v{item.version} • {item.lastUpdated}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}
