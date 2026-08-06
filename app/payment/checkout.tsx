import { Text, View, ScrollView, Pressable, Alert } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  SAMPLE_CARDS,
  ESCROW_FLOW_STEPS,
  calculatePayment,
  COMMISSION_RATES,
  type PaymentCard,
} from "@/lib/payment";

export default function CheckoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ amount?: string; title?: string }>();
  const amount = parseInt(params.amount || "0", 10);
  const title = params.title || "Hizmet Ödemesi";

  const [selectedCard, setSelectedCard] = useState<string>(SAMPLE_CARDS[0]?.id || "");
  const [processing, setProcessing] = useState(false);

  const breakdown = calculatePayment(amount, COMMISSION_RATES.standard);

  const getBrandIcon = (brand: PaymentCard["brand"]) => {
    switch (brand) {
      case "visa": return "💳";
      case "mastercard": return "💳";
      case "amex": return "💳";
      case "troy": return "🏦";
      default: return "💳";
    }
  };

  const handlePayment = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      Alert.alert(
        "Ödeme Başarılı",
        "Ödemeniz emanet hesabına aktarıldı. Hizmet tamamlandığında ustaya ödeme yapılacaktır.",
        [{ text: "Tamam", onPress: () => router.back() }]
      );
    }, 2000);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          Güvenli Ödeme
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Order Summary */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
            Sipariş Özeti
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>{title}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>₺{amount}</Text>
          </View>
          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: 10,
            }}
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: colors.foreground }}>Toplam</Text>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: colors.primary }}>₺{amount}</Text>
          </View>
        </View>

        {/* Escrow Info */}
        <View
          style={{
            backgroundColor: "#3B82F6" + "08",
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: "#3B82F6" + "20",
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <IconSymbol name="shield.fill" size={18} color="#3B82F6" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#3B82F6", marginLeft: 8 }}>
              Emanet Ödeme Sistemi
            </Text>
          </View>
          {ESCROW_FLOW_STEPS.map((flowStep) => (
            <View key={flowStep.step} style={{ flexDirection: "row", marginBottom: 8 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#3B82F6",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                  marginTop: 1,
                }}
              >
                <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "bold" }}>{flowStep.step}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>{flowStep.title}</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>{flowStep.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Methods */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Ödeme Yöntemi
        </Text>
        <View style={{ gap: 10, marginBottom: 16 }}>
          {SAMPLE_CARDS.map((card) => (
            <Pressable
              key={card.id}
              onPress={() => setSelectedCard(card.id)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedCard === card.id ? colors.primary : colors.border,
                  backgroundColor: selectedCard === card.id ? colors.primary + "05" : colors.surface,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>{getBrandIcon(card.brand)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                  {card.brand.toUpperCase()} •••• {card.last4}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {card.holderName} • {card.expiryMonth}/{card.expiryYear}
                </Text>
              </View>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: selectedCard === card.id ? colors.primary : colors.muted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selectedCard === card.id && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                )}
              </View>
            </Pressable>
          ))}

          {/* Add New Card */}
          <Pressable
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                padding: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: colors.primary + "50",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <IconSymbol name="plus.circle.fill" size={18} color={colors.primary} />
            <Text style={{ marginLeft: 8, color: colors.primary, fontWeight: "500", fontSize: 14 }}>
              Yeni Kart Ekle
            </Text>
          </Pressable>
        </View>

        {/* Security Notice */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderRadius: 10,
            backgroundColor: colors.success + "08",
            borderWidth: 1,
            borderColor: colors.success + "20",
          }}
        >
          <IconSymbol name="shield.fill" size={16} color={colors.success} />
          <Text style={{ flex: 1, marginLeft: 8, fontSize: 12, color: colors.muted }}>
            Ödeme bilgileriniz 256-bit SSL şifreleme ile korunmaktadır. Kartınızdan çekilen tutar, hizmet
            tamamlanana kadar emanet hesabında güvenle saklanır.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          paddingBottom: 30,
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          onPress={handlePayment}
          disabled={processing}
          style={({ pressed }) => [
            {
              backgroundColor: processing ? colors.muted : colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed && !processing ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>
            {processing ? "İşleniyor..." : `₺${amount} Öde (Emanet)`}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
