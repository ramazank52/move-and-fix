import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function WalletAddMoneyScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={{ height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Geri dön" style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.55 : 1 })}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text className="ml-2 text-lg font-bold text-foreground">Bakiye Ekle</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <View style={{ width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.warning}18` }}>
          <IconSymbol name="lock.shield.fill" size={34} color={colors.warning} />
        </View>
        <Text className="mt-5 text-center text-xl font-extrabold text-foreground">Güvenli ödeme yapılandırması gerekli</Text>
        <Text className="mt-3 text-center text-sm leading-6 text-muted">
          Bakiye yükleme, canlı iyzico veya Stripe ödeme sağlayıcısı doğrulanmadan başlatılmaz. Bu ortamda sahte ödeme başarısı üretilmemektedir.
        </Text>
        <Pressable
          onPress={() => router.replace("/settings/payments" as any)}
          style={({ pressed }) => ({ marginTop: 24, minWidth: 190, alignItems: "center", borderRadius: 14, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 13, opacity: pressed ? 0.82 : 1 })}
        >
          <Text className="font-bold text-white">Ödeme Yöntemlerini Gör</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
