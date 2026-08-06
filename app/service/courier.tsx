import { Text, View, ScrollView, Pressable, TextInput } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { KmPriceCalculator } from "@/components/km-price-calculator";

export default function CourierServiceScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  const courierTypes = [
    { id: "document", label: "Evrak Teslim", icon: "📄", desc: "Belge ve döküman" },
    { id: "package", label: "Paket Gönderimi", icon: "📦", desc: "Küçük/orta paketler" },
    { id: "moto", label: "Moto Kurye", icon: "🏍️", desc: "Hızlı teslimat" },
    { id: "car", label: "Araçlı Kurye", icon: "🚐", desc: "Büyük paketler" },
  ];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
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
          Kurye & Evrak
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Service Type Selection */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Hizmet Türü
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {courierTypes.map((type) => (
            <Pressable
              key={type.id}
              onPress={() => setSelectedType(type.id)}
              style={({ pressed }) => [
                {
                  width: "48%",
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedType === type.id ? colors.primary : colors.border,
                  backgroundColor: selectedType === type.id ? colors.primary + "08" : colors.surface,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 24, marginBottom: 6 }}>{type.icon}</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{type.label}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{type.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Addresses */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Adres Bilgileri
        </Text>
        <View style={{ marginBottom: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              marginBottom: 10,
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, marginRight: 10 }} />
            <TextInput
              value={pickupAddress}
              onChangeText={setPickupAddress}
              placeholder="Alınacak Adres"
              style={{ flex: 1, paddingVertical: 14, fontSize: 14, color: colors.foreground }}
              placeholderTextColor={colors.muted}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error, marginRight: 10 }} />
            <TextInput
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Teslim Adresi"
              style={{ flex: 1, paddingVertical: 14, fontSize: 14, color: colors.foreground }}
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        {/* Notes */}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Not ekleyin (opsiyonel)"
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 12,
            fontSize: 14,
            color: colors.foreground,
            textAlignVertical: "top",
            marginBottom: 20,
            minHeight: 80,
          }}
          placeholderTextColor={colors.muted}
        />

        {/* KM Price Calculator */}
        <KmPriceCalculator basePrice={50} kmRate={12} serviceName="Kurye" />
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
          style={({ pressed }) => [
            {
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>Kurye Çağır</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
