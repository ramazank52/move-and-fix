import {
  ScrollView,
  Text,
  View,
  Pressable,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useCallback } from "react";

interface Transaction {
  id: string;
  type: "income" | "expense" | "refund" | "payment";
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
}

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    type: "payment",
    title: "Klima Servisi Ödemesi",
    subtitle: "Ahmet Yılmaz",
    amount: -6500,
    date: "12 Oca 2026",
    status: "completed",
  },
  {
    id: "2",
    type: "refund",
    title: "İade",
    subtitle: "Elektrik Talebi - İptal",
    amount: 450,
    date: "10 Oca 2026",
    status: "completed",
  },
  {
    id: "3",
    type: "income",
    title: "Para Ekleme",
    subtitle: "Visa ****4242",
    amount: 1000,
    date: "8 Oca 2026",
    status: "completed",
  },
  {
    id: "4",
    type: "payment",
    title: "Su Tesisatı Ödemesi",
    subtitle: "Mehmet Demir",
    amount: -320,
    date: "5 Oca 2026",
    status: "completed",
  },
  {
    id: "5",
    type: "expense",
    title: "Para Gönderme",
    subtitle: "Banka Hesabına",
    amount: -500,
    date: "3 Oca 2026",
    status: "pending",
  },
];

export default function WalletScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);

  const balance = 2450.0;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const formatAmount = (amount: number) => {
    const abs = Math.abs(amount).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${amount >= 0 ? "+" : "-"}₺${abs}`;
  };

  const getTransactionColor = (type: Transaction["type"]) => {
    switch (type) {
      case "income":
      case "refund":
        return colors.success;
      case "payment":
      case "expense":
        return colors.error;
      default:
        return colors.foreground;
    }
  };

  const getTransactionIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "income":
        return "arrow.down.left";
      case "refund":
        return "arrow.left";
      case "payment":
        return "creditcard.fill";
      case "expense":
        return "arrow.up.right";
      default:
        return "dollarsign.circle.fill";
    }
  };

  const renderTransaction = useCallback(
    ({ item }: { item: Transaction }) => (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
          borderWidth: 0.5,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: getTransactionColor(item.type) + "15",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconSymbol
            name={getTransactionIcon(item.type) as any}
            size={20}
            color={getTransactionColor(item.type)}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
            {item.subtitle} · {item.date}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: getTransactionColor(item.type),
            }}
          >
            {formatAmount(item.amount)}
          </Text>
          {item.status === "pending" && (
            <Text style={{ fontSize: 10, color: colors.warning, marginTop: 2 }}>
              Beklemede
            </Text>
          )}
          {item.status === "completed" && (
            <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
              Tamamlandı
            </Text>
          )}
        </View>
      </View>
    ),
    [colors],
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === "web" ? 20 : 12, paddingBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>
            MoveWallet
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
            Bakiyeniz ve işlemleriniz
          </Text>
        </View>

        {/* Balance Card — Purple Gradient */}
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
                <IconSymbol name="wallet.pass.fill" size={20} color="#FFF" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginLeft: 10 }}>
                Güncel Bakiye
              </Text>
            </View>
            <Text style={{ fontSize: 36, fontWeight: "800", color: "#FFF", marginBottom: 20 }}>
              ₺{balance.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => router.push("/wallet/add-money" as any)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderRadius: 14,
                    paddingVertical: 12,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <IconSymbol name="plus" size={18} color="#FFF" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFF", marginLeft: 6 }}>
                  Para Ekle
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/wallet/send" as any)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderRadius: 14,
                    paddingVertical: 12,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <IconSymbol name="arrow.up.right" size={18} color="#FFF" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFF", marginLeft: 6 }}>
                  Gönder
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => router.push("/payment/history" as any)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  paddingVertical: 14,
                  opacity: pressed ? 0.85 : 1,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                },
              ]}
            >
              <IconSymbol name="creditcard.fill" size={22} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, marginTop: 6 }}>
                Ödemeler
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/wallet/transactions" as any)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  paddingVertical: 14,
                  opacity: pressed ? 0.85 : 1,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                },
              ]}
            >
              <IconSymbol name="text.bubble.fill" size={22} color={colors.accentBlue} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, marginTop: 6 }}>
                İşlemler
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/settings/payments" as any)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  paddingVertical: 14,
                  opacity: pressed ? 0.85 : 1,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                },
              ]}
            >
              <IconSymbol name="creditcard" size={22} color={colors.accentGreen} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, marginTop: 6 }}>
                Kartlar
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={{ paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground }}>
              Son İşlemler
            </Text>
            <Pressable onPress={() => router.push("/wallet/transactions" as any)}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                Tümü
              </Text>
            </Pressable>
          </View>
          <FlatList
            data={SAMPLE_TRANSACTIONS}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
