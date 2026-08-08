import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { WalletTransactionCard } from "@/components/wallet-transaction-card";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function WalletScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const summaryQuery = trpc.wallet.summary.useQuery();
  const transactionsQuery = trpc.wallet.transactions.useQuery({ limit: 5, offset: 0 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([summaryQuery.refetch(), transactionsQuery.refetch()]);
    setRefreshing(false);
  }, [summaryQuery, transactionsQuery]);

  if (summaryQuery.isLoading || transactionsQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "left", "right"]} className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-3 text-sm text-muted">MoveWallet yükleniyor…</Text>
      </ScreenContainer>
    );
  }

  if (summaryQuery.isError || transactionsQuery.isError || !summaryQuery.data) {
    return (
      <ScreenContainer edges={["top", "left", "right"]} className="items-center justify-center px-8">
        <IconSymbol name="wifi.exclamationmark" size={42} color={colors.error} />
        <Text className="mt-4 text-lg font-bold text-foreground">Cüzdan bilgileri alınamadı</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted">
          Güvenli bağlantınızı kontrol edip yeniden deneyin.
        </Text>
        <Pressable
          onPress={onRefresh}
          style={({ pressed }) => ({
            marginTop: 18,
            borderRadius: 12,
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 12,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text className="font-bold text-white">Yeniden Dene</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const balance = summaryQuery.data.availableBalance;
  const pendingBalance = summaryQuery.data.pendingBalance;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <FlatList
        data={transactionsQuery.data ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <WalletTransactionCard transaction={item} />}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === "web" ? 20 : 12, paddingBottom: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>MoveWallet</Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Bakiyeniz ve güvenli işlemleriniz</Text>
            </View>

            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <View
                style={{
                  borderRadius: 24,
                  padding: 24,
                  backgroundColor: colors.accentPurple,
                  shadowColor: colors.accentPurple,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "rgba(255,255,255,0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol name="wallet.pass.fill" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>Kullanılabilir Bakiye</Text>
                    {pendingBalance > 0 ? (
                      <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.70)", marginTop: 2 }}>
                        Bekleyen: ₺{pendingBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={{ fontSize: 36, fontWeight: "800", color: "#FFFFFF", marginBottom: 20 }}>
                  ₺{balance.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    onPress={() => router.push("/wallet/add-money" as any)}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderRadius: 14,
                      paddingVertical: 12,
                      opacity: pressed ? 0.82 : 1,
                    })}
                  >
                    <IconSymbol name="plus" size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF", marginLeft: 6 }}>Para Ekle</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push("/wallet/withdraw" as any)}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderRadius: 14,
                      paddingVertical: 12,
                      opacity: pressed ? 0.82 : 1,
                    })}
                  >
                    <IconSymbol name="arrow.up.right" size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF", marginLeft: 6 }}>Para Çek</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={{ paddingHorizontal: 20, marginBottom: 24, flexDirection: "row", gap: 10 }}>
              {[
                { label: "Ödemeler", icon: "creditcard.fill", color: colors.primary, route: "/payment/history" },
                { label: "İşlemler", icon: "text.bubble.fill", color: colors.accentBlue, route: "/wallet/transactions" },
                { label: "Kartlar", icon: "creditcard", color: colors.accentGreen, route: "/settings/payments" },
              ].map((action) => (
                <Pressable
                  key={action.label}
                  onPress={() => router.push(action.route as any)}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: "center",
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    paddingVertical: 14,
                    opacity: pressed ? 0.82 : 1,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                  })}
                >
                  <IconSymbol name={action.icon as any} size={22} color={action.color} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, marginTop: 6 }}>{action.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground }}>Son İşlemler</Text>
              <Pressable onPress={() => router.push("/wallet/transactions" as any)}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>Tümü</Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={{ marginHorizontal: 20, alignItems: "center", borderRadius: 16, borderWidth: 0.5, borderColor: colors.border, padding: 26 }}>
            <IconSymbol name="wallet.pass.fill" size={30} color={colors.muted} />
            <Text className="mt-3 font-bold text-foreground">Henüz cüzdan işlemi yok</Text>
            <Text className="mt-1 text-center text-xs text-muted">Ödeme, iade ve para çekme kayıtları burada görüntülenecek.</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 8 }} />}
        style={{ paddingHorizontal: 0 }}
        columnWrapperStyle={undefined}
        ItemSeparatorComponent={undefined}
        renderScrollComponent={undefined}
        ListFooterComponentStyle={{ paddingHorizontal: 20 }}
        ListHeaderComponentStyle={undefined}
        CellRendererComponent={({ children, style, ...props }) => (
          <View {...props} style={[style, { paddingHorizontal: 20 }]}>{children}</View>
        )}
      />
    </ScreenContainer>
  );
}
