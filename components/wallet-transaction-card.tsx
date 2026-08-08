import { Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export interface WalletTransactionView {
  id: number;
  type: string;
  status: string;
  amount: number;
  description: string;
  createdAt: Date | string;
}

const CREDIT_TYPES = new Set(["deposit", "provider_payout", "refund", "adjustment"]);

export function WalletTransactionCard({ transaction }: { transaction: WalletTransactionView }) {
  const colors = useColors();
  const isCredit = CREDIT_TYPES.has(transaction.type);
  const color = transaction.status === "failed" ? colors.error : isCredit ? colors.success : colors.foreground;
  const icon = isCredit ? "arrow.down.left" : transaction.type === "withdrawal" ? "arrow.up.right" : "creditcard.fill";
  const amount = Math.abs(transaction.amount).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const statusLabel =
    transaction.status === "completed"
      ? "Tamamlandı"
      : transaction.status === "failed"
        ? "Başarısız"
        : transaction.status === "cancelled"
          ? "İptal edildi"
          : "Beklemede";

  return (
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
          backgroundColor: `${color}15`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconSymbol name={icon as any} size={20} color={color} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }} numberOfLines={2}>
          {transaction.description}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
          {new Date(transaction.createdAt).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: "800", color }}>
          {isCredit ? "+" : "−"}₺{amount}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: transaction.status === "pending" ? colors.warning : colors.muted,
            marginTop: 3,
          }}
        >
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}
