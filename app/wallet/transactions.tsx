import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { WalletTransactionCard } from "@/components/wallet-transaction-card";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function WalletTransactionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const query = trpc.wallet.transactions.useQuery({ limit: 100, offset: 0 });

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={{ height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Geri dön" style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.55 : 1 })}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text className="ml-2 text-lg font-bold text-foreground">Cüzdan İşlemleri</Text>
      </View>
      {query.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : query.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <IconSymbol name="wifi.exclamationmark" size={40} color={colors.error} />
          <Text className="mt-4 text-lg font-bold text-foreground">İşlemler alınamadı</Text>
          <Pressable onPress={() => query.refetch()} style={({ pressed }) => ({ marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, opacity: pressed ? 0.8 : 1 })}>
            <Text className="font-bold text-white">Yeniden Dene</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <WalletTransactionCard transaction={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 36, flexGrow: query.data?.length ? undefined : 1 }}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <IconSymbol name="wallet.pass.fill" size={44} color={colors.muted} />
              <Text className="mt-4 text-lg font-bold text-foreground">Henüz işlem yok</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-muted">Cüzdan hareketleriniz burada listelenecek.</Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}
