import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { WalletTransactionCard } from "@/components/wallet-transaction-card";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const QUICK_ACTIONS = [
  { label: "Para Ekle", icon: "plus", route: "/wallet/add-money" },
  { label: "Para Çek", icon: "arrow.up.right", route: "/wallet/withdraw" },
  { label: "İşlem Geçmişi", icon: "creditcard.fill", route: "/wallet/transactions" },
] as const;

function formatMoney(value: number) {
  return `₺${value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WalletScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const summaryQuery = trpc.wallet.summary.useQuery();
  const transactionsQuery = trpc.wallet.transactions.useQuery({ limit: 5, offset: 0 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([summaryQuery.refetch(), transactionsQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [summaryQuery, transactionsQuery]);

  const screenStyle = { flex: 1, backgroundColor: colors.background } as const;

  if (summaryQuery.isLoading || transactionsQuery.isLoading) {
    return (
      <ScreenContainer
        edges={["top", "left", "right"]}
        className="flex-1 items-center justify-center"
        safeAreaClassName="flex-1"
        style={screenStyle}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.stateBody, { color: colors.muted }]}>MoveWallet yükleniyor…</Text>
      </ScreenContainer>
    );
  }

  if (summaryQuery.isError || transactionsQuery.isError || !summaryQuery.data) {
    return (
      <ScreenContainer
        edges={["top", "left", "right"]}
        className="flex-1 items-center justify-center px-8"
        safeAreaClassName="flex-1"
        style={screenStyle}
      >
        <IconSymbol name="wifi.exclamationmark" size={40} color={colors.error} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Cüzdan bilgileri alınamadı</Text>
        <Text style={[styles.stateDescription, { color: colors.muted }]}>Güvenli bağlantınızı kontrol edip yeniden deneyin.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cüzdan bilgilerini yeniden yükle"
          onPress={onRefresh}
          style={({ pressed }) => [styles.retryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>Yeniden Dene</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const balance = summaryQuery.data.availableBalance;
  const pendingBalance = summaryQuery.data.pendingBalance;

  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      className="flex-1"
      safeAreaClassName="flex-1"
      style={screenStyle}
    >
      <FlatList
        style={screenStyle}
        contentContainerStyle={styles.listContent}
        data={transactionsQuery.data ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.transactionWrapper}>
            <WalletTransactionCard transaction={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.transactionSeparator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, Platform.OS === "web" && styles.webHeader]}>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>MoveWallet</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="MoveWallet işlem geçmişini aç"
              onPress={() => router.push("/wallet/transactions" as never)}
              style={({ pressed }) => [
                styles.balanceCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.balanceCopy}>
                <Text style={[styles.balanceLabel, { color: colors.muted }]}>Bakiye</Text>
                <Text style={[styles.balanceAmount, { color: colors.foreground }]}>{formatMoney(balance)}</Text>
                <View style={styles.pendingRow}>
                  <View style={[styles.pendingDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.pendingText, { color: colors.muted }]}>Emanette bekleyen {formatMoney(pendingBalance)}</Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </Pressable>

            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => router.push(action.route as never)}
                  style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <IconSymbol name={action.icon} size={21} color={colors.primary} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{action.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Son İşlemler</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tüm cüzdan işlemlerini görüntüle"
                onPress={() => router.push("/wallet/transactions" as never)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={[styles.allLink, { color: colors.primary }]}>Tümü</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="wallet.pass.fill" size={28} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz cüzdan işlemi yok</Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>Ödeme, iade ve para çekme kayıtları burada görüntülenecek.</Text>
          </View>
        }
        ListFooterComponent={<View style={styles.footerSpace} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: 104,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  webHeader: {
    paddingTop: 18,
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  balanceCard: {
    marginHorizontal: 16,
    minHeight: 116,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceCopy: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  balanceAmount: {
    marginTop: 7,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  pendingRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  pendingText: {
    fontSize: 11,
    lineHeight: 15,
  },
  quickActions: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickAction: {
    width: "31%",
    alignItems: "center",
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    marginTop: 7,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
    textAlign: "center",
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  allLink: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  transactionWrapper: {
    paddingHorizontal: 16,
  },
  transactionSeparator: {
    height: 3,
  },
  emptyState: {
    marginHorizontal: 16,
    minHeight: 150,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  emptyBody: {
    marginTop: 4,
    maxWidth: 240,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  footerSpace: {
    height: 12,
  },
  stateTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  stateBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  stateDescription: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 18,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.75,
  },
});
