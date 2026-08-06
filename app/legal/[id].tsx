import { Text, View, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LEGAL_DOCUMENTS } from "@/lib/data/legal";

export default function LegalDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const document = LEGAL_DOCUMENTS.find((d) => d.id === id);

  if (!document) {
    return (
      <ScreenContainer className="p-6">
        <Text className="text-foreground">Belge bulunamadı</Text>
      </ScreenContainer>
    );
  }

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
        <Text
          style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}
          numberOfLines={1}
        >
          {document.title}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Document Meta */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.muted }}>Versiyon: {document.version}</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            Son Güncelleme: {document.lastUpdated}
          </Text>
        </View>

        {/* Document Content */}
        <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>
          {document.content}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
