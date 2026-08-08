import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type PaymentStatus = "pending" | "held" | "released" | "refunded";

export default function PaymentHistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const paymentsQuery = trpc.payments.list.useQuery();

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "released": return colors.success;
      case "held": return "#F59E0B";
      case "refunded": return "#3B82F6";
      default: return colors.muted;
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case "released": return "Tamamlandı";
      case "held": return "Emanette";
      case "pending": return "Bekliyor";
      case "refunded": return "İade Edildi";
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>Ödeme Geçmişi</Text>
        <View style={{ width: 28 }} />
      </View>

      {paymentsQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.muted }}>Ödemeler yükleniyor...</Text>
        </View>
      ) : paymentsQuery.error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 }}>
          <IconSymbol name="wifi.exclamationmark" size={32} color={colors.error} />
          <Text style={{ color: colors.error, textAlign: "center" }}>{paymentsQuery.error.message}</Text>
          <Pressable onPress={() => paymentsQuery.refetch()} style={{ backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 }}>
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Yeniden Dene</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={paymentsQuery.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          renderItem={({ item }) => {
            const statusColor = getStatusColor(item.status);
            const isRefund = item.status === "refunded";
            return (
              <Pressable
                onPress={() => router.push(`/job/${item.requestId}` as never)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.85 : 1 })}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: statusColor + "15", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name={isRefund ? "arrow.down" : "creditcard.fill"} size={18} color={statusColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: colors.foreground }} numberOfLines={1}>Hizmet talebi #{item.requestId}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{new Date(item.createdAt).toLocaleDateString("tr-TR")}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: isRefund ? colors.success : colors.foreground }}>
                    {isRefund ? "+" : "−"}{new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(item.amount)}
                  </Text>
                  <View style={{ marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: statusColor + "15" }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: statusColor }}>{getStatusLabel(item.status)}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
              <IconSymbol name="creditcard.fill" size={34} color={colors.muted} />
              <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 12 }}>Henüz ödeme geçmişi yok</Text>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 6 }}>Tamamlanan ödeme ve iade hareketleri burada görünür.</Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}
