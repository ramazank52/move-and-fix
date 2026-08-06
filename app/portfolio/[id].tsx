import { Text, View, Pressable, ScrollView, Dimensions, Modal } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description: string;
  date: string;
  color: string;
  beforeColor: string;
}

const PORTFOLIO_ITEMS: PortfolioItem[] = [
  { id: "1", title: "Banyo Renovasyonu", category: "Su Tesisatı", description: "Komple banyo yenileme, tesisat değişimi ve fayans döşeme", date: "2026-07-15", color: "#3B82F6", beforeColor: "#94A3B8" },
  { id: "2", title: "Elektrik Panosu", category: "Elektrik", description: "Eski tip sigorta panosunun modern otomatik panoya dönüştürülmesi", date: "2026-07-10", color: "#F59E0B", beforeColor: "#D1D5DB" },
  { id: "3", title: "Mutfak Tesisatı", category: "Su Tesisatı", description: "Mutfak lavabo ve bulaşık makinesi bağlantısı yenileme", date: "2026-06-28", color: "#10B981", beforeColor: "#9CA3AF" },
  { id: "4", title: "Salon Boyama", category: "Boya", description: "150m² salon ve koridor boyama, alçı tamir", date: "2026-06-20", color: "#8B5CF6", beforeColor: "#CBD5E1" },
  { id: "5", title: "Klima Montajı", category: "Klima", description: "3 adet split klima montajı ve boru döşemesi", date: "2026-06-15", color: "#06B6D4", beforeColor: "#E2E8F0" },
  { id: "6", title: "Çatı Tamiri", category: "Tadilat", description: "Çatı izolasyonu ve kiremit değişimi", date: "2026-06-01", color: "#EF4444", beforeColor: "#D1D5DB" },
  { id: "7", title: "Bahçe Düzenleme", category: "Dış Mekan", description: "Peyzaj düzenleme, çim serme ve sulama sistemi", date: "2026-05-20", color: "#22C55E", beforeColor: "#94A3B8" },
  { id: "8", title: "Parke Döşeme", category: "Zemin", description: "Laminat parke sökümü ve masif parke döşeme", date: "2026-05-10", color: "#A16207", beforeColor: "#E5E7EB" },
  { id: "9", title: "Kapı Montajı", category: "Marangoz", description: "5 adet iç kapı değişimi ve kasa montajı", date: "2026-05-01", color: "#7C3AED", beforeColor: "#CBD5E1" },
];

export default function PortfolioScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [showBefore, setShowBefore] = useState(false);

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
          Portfolyo
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Provider Info */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.primary + "15",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>A</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Ahmet Yılmaz</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>Su Tesisatı & Elektrik Uzmanı</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: "#F59E0B" }}>4.9 ★</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>{PORTFOLIO_ITEMS.length} iş</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", padding: 16, gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary }}>{PORTFOLIO_ITEMS.length}</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>Tamamlanan İş</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.success }}>%98</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>Memnuniyet</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#F59E0B" }}>5 Yıl</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>Deneyim</Text>
        </View>
      </View>

      {/* Portfolio Grid */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Tamamlanan İşler
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {PORTFOLIO_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedItem(item)}
              style={({ pressed }) => [
                {
                  width: IMAGE_SIZE,
                  height: IMAGE_SIZE,
                  borderRadius: 10,
                  backgroundColor: item.color + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: item.color + "30",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>
                {item.category === "Su Tesisatı" ? "🔧" :
                 item.category === "Elektrik" ? "⚡" :
                 item.category === "Boya" ? "🎨" :
                 item.category === "Klima" ? "❄️" :
                 item.category === "Tadilat" ? "🏠" :
                 item.category === "Dış Mekan" ? "🌿" :
                 item.category === "Zemin" ? "🪵" : "🚪"}
              </Text>
              <Text style={{ fontSize: 10, color: item.color, fontWeight: "600", textAlign: "center", paddingHorizontal: 4 }}>
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedItem} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: 36,
              maxHeight: "75%",
            }}
          >
            {/* Handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 }} />

            {selectedItem && (
              <>
                {/* Before/After Toggle */}
                <View
                  style={{
                    height: 200,
                    borderRadius: 16,
                    backgroundColor: showBefore ? selectedItem.beforeColor + "30" : selectedItem.color + "20",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <Text style={{ fontSize: 48 }}>
                    {showBefore ? "🔨" : "✨"}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: showBefore ? "#64748B" : selectedItem.color, marginTop: 8 }}>
                    {showBefore ? "Öncesi" : "Sonrası"}
                  </Text>

                  {/* Toggle Button */}
                  <View style={{ position: "absolute", bottom: 10, flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => setShowBefore(true)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: showBefore ? colors.foreground : colors.surface,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: showBefore ? colors.background : colors.muted, fontWeight: "600" }}>Öncesi</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowBefore(false)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: !showBefore ? colors.foreground : colors.surface,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: !showBefore ? colors.background : colors.muted, fontWeight: "600" }}>Sonrası</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Info */}
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground, marginBottom: 4 }}>
                  {selectedItem.title}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <View style={{ backgroundColor: selectedItem.color + "15", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, color: selectedItem.color, fontWeight: "600" }}>{selectedItem.category}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{selectedItem.date}</Text>
                </View>
                <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 20 }}>
                  {selectedItem.description}
                </Text>

                <Pressable
                  onPress={() => { setSelectedItem(null); setShowBefore(false); }}
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "500" }}>Kapat</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
