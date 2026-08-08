import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Crypto from "expo-crypto";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function createIdempotencyKey() {
  return `wallet-withdraw-${Crypto.randomUUID()}`;
}

export default function WalletWithdrawScreen() {
  const colors = useColors();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const summaryQuery = trpc.wallet.summary.useQuery();
  const utils = trpc.useUtils();
  const normalizedIban = useMemo(() => iban.toUpperCase().replace(/\s+/g, ""), [iban]);

  const withdraw = trpc.wallet.withdraw.useMutation({
    onSuccess: async ({ duplicated }) => {
      await Promise.all([utils.wallet.summary.invalidate(), utils.wallet.transactions.invalidate()]);
      Alert.alert(
        duplicated ? "Talep Daha Önce Alındı" : "Talep Alındı",
        "Para çekme talebiniz güvenli şekilde kaydedildi ve inceleme sırasına alındı.",
        [{ text: "Tamam", onPress: () => router.replace("/(tabs)/wallet" as any) }],
      );
      setIdempotencyKey(createIdempotencyKey());
    },
    onError: (error) => Alert.alert("Para Çekme Başarısız", error.message || "Lütfen tekrar deneyin."),
  });

  const submit = () => {
    const value = Number(amount.replace(",", "."));
    if (!Number.isInteger(value) || value < 100) {
      Alert.alert("Geçersiz Tutar", "Minimum para çekme tutarı ₺100 ve tutar tam sayı olmalıdır.");
      return;
    }
    if (value > (summaryQuery.data?.availableBalance ?? 0)) {
      Alert.alert("Yetersiz Bakiye", "Talep tutarı kullanılabilir bakiyenizi aşamaz.");
      return;
    }
    if (!/^TR\d{24}$/.test(normalizedIban)) {
      Alert.alert("Geçersiz IBAN", "TR ile başlayan 26 karakterli geçerli bir IBAN girin.");
      return;
    }
    withdraw.mutate({ amount: value, bankAccountId: normalizedIban, idempotencyKey });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={{ height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Geri dön" style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.55 : 1 })}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text className="ml-2 text-lg font-bold text-foreground">Para Çek</Text>
      </View>

      {summaryQuery.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : summaryQuery.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base font-bold text-foreground">Bakiye bilgisi alınamadı</Text>
          <Pressable onPress={() => summaryQuery.refetch()} style={({ pressed }) => ({ marginTop: 16, backgroundColor: colors.primary, padding: 12, borderRadius: 12, opacity: pressed ? 0.8 : 1 })}>
            <Text className="font-bold text-white">Yeniden Dene</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ padding: 20 }}>
          <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border, padding: 18 }}>
            <Text className="text-xs text-muted">Kullanılabilir bakiye</Text>
            <Text className="mt-1 text-2xl font-extrabold text-foreground">
              ₺{(summaryQuery.data?.availableBalance ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <Text className="mb-7 mt-5 text-sm leading-5 text-muted">
            Talebiniz doğrulama sonrasında kayıtlı banka hesabınıza aktarılır. Minimum tutar ₺100’dür.
          </Text>
          <Text className="mb-2 text-sm font-semibold text-foreground">Tutar</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="₺0"
            placeholderTextColor={colors.muted}
            style={{ height: 52, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, paddingHorizontal: 15, fontSize: 17, fontWeight: "700" }}
          />
          <Text className="mb-2 mt-5 text-sm font-semibold text-foreground">IBAN</Text>
          <TextInput
            value={iban}
            onChangeText={setIban}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={32}
            placeholder="TR00 0000 0000 0000 0000 0000 00"
            placeholderTextColor={colors.muted}
            style={{ height: 52, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, paddingHorizontal: 15 }}
          />
          <Pressable
            disabled={withdraw.isPending}
            onPress={submit}
            style={({ pressed }) => ({ height: 52, marginTop: 26, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, opacity: withdraw.isPending ? 0.55 : pressed ? 0.84 : 1 })}
          >
            {withdraw.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-bold text-white">Talep Oluştur</Text>}
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}
