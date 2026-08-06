import { Text, View, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SAMPLE_TRANSACTIONS, type PaymentTransaction } from "@/lib/payment";

export default function PaymentHistoryScreen() {
  const colors = useColors();
  const router = useRouter();

  const getStatusColor = (status: PaymentTransaction["status"]) => {
    switch (status) {
      case "released": return colors.success;
      case "held": return "#F59E0B";
      case "pending": return colors.muted;
      case "refunded": return "#3B82F6";
      default: return colors.muted;
    }
  };

  const getStatusLabel = (status: PaymentTransaction["status"]) => {
    switch (status) {
      case "released": return "Tamamlandı";
      case "held": return "Emanette";
      case "pending": return "Bekliyor";
      case "refunded": return "İade Edildi";
      default: return status;
    }
  };

  const getTypeIcon = (type: PaymentTransaction["type"]) => {
    switch (type) {
      case "payment": return "↑";
      case "refund": return "↓";
      case "commission": return "•";
      default: return "•";
    }
  };

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
          Ödeme Geçmişi
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={SAMPLE_TRANSACTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: getStatusColor(item.status) + "15",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 18, color: getStatusColor(item.status) }}>
                {getTypeIcon(item.type)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.foreground }} numberOfLines={1}>
                {item.description}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                {new Date(item.createdAt).toLocaleDateString("tr-TR")}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: item.type === "refund" ? colors.success : colors.foreground }}>
                {item.type === "refund" ? "+" : "-"}₺{item.amount}
              </Text>
              <View
                style={{
                  marginTop: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: getStatusColor(item.status) + "15",
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "600", color: getStatusColor(item.status) }}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ color: colors.muted }}>Henüz ödeme geçmişi yok</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

