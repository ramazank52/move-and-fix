import { Text, View, Pressable, Platform } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

// Provider locations in Istanbul
const PROVIDERS = [
  { id: "1", name: "Ahmet Yılmaz", service: "Elektrik", rating: 4.9, lat: 41.0082, lng: 28.9784, distance: "1.2 km", price: "₺200-500" },
  { id: "2", name: "Mehmet Demir", service: "Su Tesisatı", rating: 4.8, lat: 41.0122, lng: 28.9744, distance: "0.8 km", price: "₺150-400" },
  { id: "3", name: "Hasan Elektrik", service: "Elektrik", rating: 4.9, lat: 41.0052, lng: 28.9824, distance: "1.8 km", price: "₺180-600" },
  { id: "4", name: "Ali Çekici", service: "Çekici", rating: 4.7, lat: 41.0102, lng: 28.9704, distance: "2.1 km", price: "₺25/km" },
  { id: "5", name: "Veli Kurye", service: "Kurye", rating: 4.6, lat: 41.0062, lng: 28.9864, distance: "0.5 km", price: "₺12/km" },
  { id: "6", name: "Yol Yardım 7/24", service: "Yol Yardım", rating: 4.5, lat: 40.9980, lng: 28.9900, distance: "3.2 km", price: "₺18/km" },
];


export default function MapScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const selected = PROVIDERS.find((p) => p.id === selectedProvider);

  // On web, we show a styled placeholder since react-native-maps doesn't support web
  const isWeb = Platform.OS === "web";

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
          Yakınımdaki Ustalar
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Map Area */}
      <View style={{ flex: 1, position: "relative" }}>
        {isWeb ? (
          // Web placeholder - styled map representation
          <View
            style={{
              flex: 1,
              backgroundColor: "#E8F4E8",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Grid lines to simulate map */}
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3 }}>
              {[...Array(8)].map((_, i) => (
                <View
                  key={`h-${i}`}
                  style={{
                    position: "absolute",
                    top: `${(i + 1) * 12}%`,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: "#94A3B8",
                  }}
                />
              ))}
              {[...Array(6)].map((_, i) => (
                <View
                  key={`v-${i}`}
                  style={{
                    position: "absolute",
                    left: `${(i + 1) * 16}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: "#94A3B8",
                  }}
                />
              ))}
            </View>

            {/* Provider markers */}
            {PROVIDERS.map((provider, i) => (
              <Pressable
                key={provider.id}
                onPress={() => setSelectedProvider(provider.id)}
                style={({ pressed }) => [
                  {
                    position: "absolute",
                    top: `${20 + i * 14}%`,
                    left: `${15 + i * 15}%`,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: selectedProvider === provider.id ? colors.primary : "#FFF",
                    borderWidth: 2,
                    borderColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: selectedProvider === provider.id ? "#FFF" : colors.primary }}>
                    {provider.name.charAt(0)}
                  </Text>
                </View>
                {/* Pin tail */}
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderTopWidth: 8,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: selectedProvider === provider.id ? colors.primary : "#FFF",
                    alignSelf: "center",
                  }}
                />
              </Pressable>
            ))}

            {/* User location */}
            <View
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                marginLeft: -12,
                marginTop: -12,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "#3B82F6",
                  borderWidth: 3,
                  borderColor: "#FFF",
                  shadowColor: "#3B82F6",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: -8,
                  left: -8,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#3B82F6" + "20",
                }}
              />
            </View>

            <Text style={{ position: "absolute", bottom: 60, fontSize: 13, color: "#64748B" }}>
              📍 Harita görünümü (cihazda tam harita gösterilir)
            </Text>
          </View>
        ) : (
          // Native - same interactive map view (Google Maps will be used on device via Expo Maps)
          <View
            style={{
              flex: 1,
              backgroundColor: "#E8F4E8",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Grid lines to simulate map */}
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3 }}>
              {[...Array(8)].map((_, i) => (
                <View
                  key={`hn-${i}`}
                  style={{
                    position: "absolute",
                    top: `${(i + 1) * 12}%`,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: "#94A3B8",
                  }}
                />
              ))}
            </View>
            {/* Provider markers */}
            {PROVIDERS.map((provider, i) => (
              <Pressable
                key={provider.id}
                onPress={() => setSelectedProvider(provider.id)}
                style={({ pressed }) => [
                  {
                    position: "absolute",
                    top: `${20 + i * 12}%`,
                    left: `${15 + i * 13}%`,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: selectedProvider === provider.id ? colors.primary : "#FFF",
                    borderWidth: 2,
                    borderColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: selectedProvider === provider.id ? "#FFF" : colors.primary }}>
                    {provider.name.charAt(0)}
                  </Text>
                </View>
              </Pressable>
            ))}
            {/* User location */}
            <View style={{ position: "absolute", top: "50%", left: "50%", marginLeft: -12, marginTop: -12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#3B82F6", borderWidth: 3, borderColor: "#FFF" }} />
            </View>
            <Text style={{ position: "absolute", bottom: 20, fontSize: 12, color: "#64748B" }}>
              Cihazda Google Maps/Apple Maps kullanılır
            </Text>
          </View>
        )}

        {/* Selected Provider Card */}
        {selected && (
          <View
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              right: 16,
              backgroundColor: colors.background,
              borderRadius: 14,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.primary + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>
                  {selected.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{selected.name}</Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  {selected.service} • ★ {selected.rating} • {selected.distance}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push(`/provider/${selected.id}` as any)}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}>Profil</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Provider List */}
      <View
        style={{
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
          maxHeight: 160,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>
          Yakınımdaki Ustalar ({PROVIDERS.length})
        </Text>
        {PROVIDERS.slice(0, 3).map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setSelectedProvider(p.id)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.primary + "18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primary }}>{p.name.charAt(0)}</Text>
            </View>
            <Text style={{ flex: 1, marginLeft: 10, fontSize: 13, color: colors.foreground }}>{p.name}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{p.distance}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}
