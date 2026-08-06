import { Text, View, ScrollView, Pressable, TextInput } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { KmPriceCalculator } from "@/components/km-price-calculator";

export default function TowTruckServiceScreen() {
  const colors = useColors();
  const router = useRouter();
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [issue, setIssue] = useState("");

  const vehicleTypes = [
    { id: "sedan", label: "Binek Araç", icon: "🚗", desc: "Sedan, Hatchback" },
    { id: "suv", label: "SUV / Jeep", icon: "🚙", desc: "SUV, Pickup" },
    { id: "van", label: "Minibüs / Van", icon: "🚐", desc: "Ticari araçlar" },
    { id: "motorcycle", label: "Motosiklet", icon: "🏍️", desc: "Her tip motosiklet" },
    { id: "heavy", label: "Ağır Vasıta", icon: "🚛", desc: "Kamyon, TIR" },
    { id: "other", label: "Diğer", icon: "🚜", desc: "Diğer araçlar" },
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
          Çekici Hizmeti
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Emergency Banner */}
        <View
          style={{
            backgroundColor: "#DC2626" + "12",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#DC2626" + "30",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 24, marginRight: 10 }}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#DC2626" }}>Acil Çekici</Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              7/24 hizmet • Ortalama varış: 20-30 dk
            </Text>
          </View>
        </View>

        {/* Vehicle Type */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Araç Türü
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {vehicleTypes.map((type) => (
            <Pressable
              key={type.id}
              onPress={() => setVehicleType(type.id)}
              style={({ pressed }) => [
                {
                  width: "31%",
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: vehicleType === type.id ? "#DC2626" : colors.border,
                  backgroundColor: vehicleType === type.id ? "#DC2626" + "08" : colors.surface,
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>{type.icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: colors.foreground, textAlign: "center" }}>
                {type.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Location */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Konum Bilgileri
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
            <IconSymbol name="location.fill" size={16} color="#DC2626" />
            <TextInput
              value={currentLocation}
              onChangeText={setCurrentLocation}
              placeholder="Mevcut Konum (aracın bulunduğu yer)"
              style={{ flex: 1, paddingVertical: 14, paddingLeft: 8, fontSize: 14, color: colors.foreground }}
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
            <IconSymbol name="location.fill" size={16} color={colors.success} />
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder="Hedef (oto sanayi, servis vb.)"
              style={{ flex: 1, paddingVertical: 14, paddingLeft: 8, fontSize: 14, color: colors.foreground }}
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        {/* Issue Description */}
        <TextInput
          value={issue}
          onChangeText={setIssue}
          placeholder="Arıza açıklaması (opsiyonel)"
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
        <KmPriceCalculator basePrice={200} kmRate={25} serviceName="Çekici" />

        {/* Info */}
        <View
          style={{
            marginTop: 16,
            padding: 14,
            backgroundColor: "#F59E0B" + "10",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#F59E0B" + "25",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
            ℹ️ Bilgilendirme
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>
            • Fiyatlar tahminidir, kesin fiyat çekici geldiğinde belirlenir{"\n"}
            • Gece (22:00-06:00) %25 ek ücret uygulanır{"\n"}
            • Ağır vasıta için ek ücret alınabilir
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
          style={({ pressed }) => [
            {
              backgroundColor: "#DC2626",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>Çekici Çağır</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
