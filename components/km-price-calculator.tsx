import { useState } from "react";
import { Text, View, TextInput, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface KmPriceCalculatorProps {
  basePrice: number;
  kmRate: number;
  serviceName: string;
  onCalculate?: (distance: number, totalPrice: number) => void;
}

export function KmPriceCalculator({ basePrice, kmRate, serviceName, onCalculate }: KmPriceCalculatorProps) {
  const colors = useColors();
  const [distance, setDistance] = useState("");
  const [totalPrice, setTotalPrice] = useState<number | null>(null);

  const calculatePrice = () => {
    const km = parseFloat(distance);
    if (isNaN(km) || km <= 0) return;
    const price = basePrice + km * kmRate;
    setTotalPrice(price);
    onCalculate?.(km, price);
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <IconSymbol name="dollarsign.circle.fill" size={22} color={colors.primary} />
        <Text style={{ marginLeft: 10, fontSize: 16, fontWeight: "600", color: colors.foreground }}>
          Fiyat Hesaplama
        </Text>
      </View>

      {/* Rate Info */}
      <View
        style={{
          backgroundColor: colors.primary + "10",
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ fontSize: 13, color: colors.muted }}>Başlangıç Ücreti</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>₺{basePrice}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 13, color: colors.muted }}>KM Başı Ücret</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>₺{kmRate}/km</Text>
        </View>
      </View>

      {/* Distance Input */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.background,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
          }}
        >
          <IconSymbol name="location.fill" size={16} color={colors.muted} />
          <TextInput
            value={distance}
            onChangeText={setDistance}
            placeholder="Mesafe (km)"
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={calculatePrice}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 8,
              fontSize: 15,
              color: colors.foreground,
            }}
            placeholderTextColor={colors.muted}
          />
          <Text style={{ fontSize: 13, color: colors.muted }}>km</Text>
        </View>
        <Pressable
          onPress={calculatePrice}
          style={({ pressed }) => [
            {
              backgroundColor: colors.primary,
              borderRadius: 10,
              paddingVertical: 12,
              paddingHorizontal: 16,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>Hesapla</Text>
        </Pressable>
      </View>

      {/* Result */}
      {totalPrice !== null && (
        <View
          style={{
            backgroundColor: colors.success + "12",
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.success + "30",
          }}
        >
          <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Tahmini Toplam Ücret</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.success }}>
              ₺{totalPrice.toFixed(0)}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 8 }}>
              ({distance} km × ₺{kmRate} + ₺{basePrice} başlangıç)
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
