import { StyleSheet, Text, View } from "react-native";

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

function formatRelativeDate(value: Date | string) {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.max(0, Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000));

  if (dayDiff === 0) return "Bugün";
  if (dayDiff === 1) return "Dün";
  if (dayDiff < 7) return `${dayDiff} gün önce`;

  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function WalletTransactionCard({ transaction }: { transaction: WalletTransactionView }) {
  const colors = useColors();
  const isCredit = CREDIT_TYPES.has(transaction.type);
  const isFailed = transaction.status === "failed" || transaction.status === "cancelled";
  const color = isFailed ? colors.error : isCredit ? colors.success : colors.primary;
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
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
        <IconSymbol name={icon} size={17} color={color} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.amount, { color: colors.foreground }]}>{isCredit ? "+" : "−"}₺{amount}</Text>
        <Text style={[styles.description, { color: colors.muted }]} numberOfLines={1}>{transaction.description}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.date, { color: colors.muted }]}>{formatRelativeDate(transaction.createdAt)}</Text>
        <Text style={[styles.status, { color: transaction.status === "pending" ? colors.warning : colors.muted }]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    marginLeft: 10,
  },
  amount: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  description: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
  },
  meta: {
    marginLeft: 10,
    alignItems: "flex-end",
  },
  date: {
    fontSize: 10,
    lineHeight: 14,
  },
  status: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 12,
  },
});
