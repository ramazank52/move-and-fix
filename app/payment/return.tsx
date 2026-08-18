import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function PaymentReturnScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    status?: string | string[];
    paymentId?: string | string[];
  }>();
  const rawStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const rawPaymentId = Array.isArray(params.paymentId)
    ? params.paymentId[0]
    : params.paymentId;
  const paymentId = Number(rawPaymentId ?? 0);
  const hasValidPaymentId = Number.isInteger(paymentId) && paymentId > 0;
  const paymentsQuery = trpc.payments.list.useQuery(undefined, {
    enabled: rawStatus === "success" && hasValidPaymentId,
    retry: 1,
    refetchOnMount: "always",
  });
  const payment = paymentsQuery.data?.find((item) => item.id === paymentId);
  const verified = payment?.status === "held" || payment?.status === "released";
  const pending = rawStatus === "success" && hasValidPaymentId && !verified;

  let title = "Ödeme Doğrulanamadı";
  let body =
    "Güvenli sunucu doğrulaması tamamlanmadı. Tekrar ödeme yapmadan önce ödeme geçmişinizi kontrol edin.";
  let icon: Parameters<typeof IconSymbol>[0]["name"] =
    "exclamationmark.triangle.fill";
  let iconColor = colors.error;

  if (verified) {
    title = payment.status === "released" ? "Ödeme Tamamlandı" : "Ödeme Emanette";
    body =
      payment.status === "released"
        ? "Ödeme sunucuda doğrulandı ve iş akışına göre profesyonele aktarıldı."
        : "Ödeme sunucuda doğrulandı. Tutar, hizmet tamamlanana kadar Move&Fix emanet hesabında korunur.";
    icon = "checkmark.circle.fill";
    iconColor = colors.success;
  } else if (pending && !paymentsQuery.isError) {
    title = "Doğrulama Bekleniyor";
    body =
      "Ödeme sağlayıcısı dönüş yaptı ancak emanet kaydı henüz doğrulanmış durumda görünmüyor. Bu ekranı yenileyin veya ödeme geçmişini kontrol edin.";
    icon = "clock.fill";
    iconColor = colors.warning;
  }

  if (paymentsQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.body, { color: colors.muted }]}>Ödeme durumu güvenli sunucudan doğrulanıyor…</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: `${iconColor}18` }]}>
          <IconSymbol name={icon} size={42} color={iconColor} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{body}</Text>

        {pending ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ödeme durumunu yenile"
            accessibilityState={{ busy: paymentsQuery.isRefetching }}
            onPress={() => paymentsQuery.refetch()}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>Durumu Yenile</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="İşlerim ekranına dön"
          onPress={() => router.replace("/(tabs)/my-jobs")}
          style={[
            styles.secondaryButton,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>İşlerime Dön</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ödeme geçmişini aç" onPress={() => router.push("/payment/history")} style={styles.linkButton}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Ödeme Geçmişini Aç</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  title: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    maxWidth: 420,
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    maxWidth: 360,
    minHeight: 50,
    marginTop: 26,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    maxWidth: 360,
    minHeight: 50,
    marginTop: 12,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  linkButton: {
    minHeight: 44,
    marginTop: 8,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
});
