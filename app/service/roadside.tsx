import { Text, View, ScrollView, Pressable, TextInput } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { KmPriceCalculator } from "@/components/km-price-calculator";

export default function RoadsideAssistanceScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const services = [
    { id: "battery", label: "Akü Takviye", icon: "🔋", desc: "Akü şarj/değişim", price: "₺150+" },
    { id: "tire", label: "Lastik Değişimi", icon: "🛞", desc: "Stepne takma", price: "₺100+" },
    { id: "fuel", label: "Yakıt İkmali", icon: "⛽", desc: "Acil yakıt", price: "₺80+" },
    { id: "lock", label: "Kilit Açma", icon: "🔐", desc: "Araç kilidi açma", price: "₺200+" },
    { id: "tow", label: "Arıza Çekici", icon: "🚛", desc: "Kısa mesafe çekme", price: "₺200+" },
    { id: "other", label: "Diğer Arıza", icon: "🔧", desc: "Genel arıza", price: "₺120+" },
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
          Yol Yardım
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Emergency Header */}
        <View
          style={{
            backgroundColor: "#B91C1C",
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "bold" }}>7/24 Yol Yardım</Text>
          <Text style={{ color: "#FFF", fontSize: 13, opacity: 0.9, marginTop: 4 }}>
            Nerede olursanız olun, en yakın yol yardım ekibi size ulaşsın
          </Text>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: "#FFF", fontSize: 12 }}>⏱ Ort. Varış: 15-25 dk</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: "#FFF", fontSize: 12 }}>📍 Tüm Türkiye</Text>
            </View>
          </View>
        </View>

        {/* Service Selection */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Ne tür yardıma ihtiyacınız var?
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {services.map((service) => (
            <Pressable
              key={service.id}
              onPress={() => setSelectedService(service.id)}
              style={({ pressed }) => [
                {
                  width: "48%",
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedService === service.id ? "#B91C1C" : colors.border,
                  backgroundColor: selectedService === service.id ? "#B91C1C" + "08" : colors.surface,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 24 }}>{service.icon}</Text>
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>{service.price}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, marginTop: 6 }}>
                {service.label}
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{service.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Location */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Konumunuz
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
            marginBottom: 12,
          }}
        >
          <IconSymbol name="location.fill" size={16} color="#B91C1C" />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Bulunduğunuz konum veya adres"
            style={{ flex: 1, paddingVertical: 14, paddingLeft: 8, fontSize: 14, color: colors.foreground }}
            placeholderTextColor={colors.muted}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
              borderRadius: 10,
              backgroundColor: "#B91C1C" + "10",
              marginBottom: 16,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <IconSymbol name="location.fill" size={16} color="#B91C1C" />
          <Text style={{ marginLeft: 8, color: "#B91C1C", fontSize: 14, fontWeight: "600" }}>
            Mevcut Konumumu Kullan
          </Text>
        </Pressable>

        {/* Description */}
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Sorunu kısaca açıklayın (opsiyonel)"
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
        <KmPriceCalculator basePrice={100} kmRate={18} serviceName="Yol Yardım" />
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
              backgroundColor: "#B91C1C",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>Yol Yardım Çağır</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

