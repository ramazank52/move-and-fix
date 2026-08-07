import { Text, View, Pressable, ScrollView, FlatList } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface Provider {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  distance: string;
  responseTime: string;
  completionRate: number;
  price: string;
  verified: boolean;
  premium: boolean;
}

const PROVIDERS: Provider[] = [
  {
    id: "1",
    name: "Ahmet Yılmaz",
    rating: 4.9,
    reviews: 127,
    distance: "1.2 km",
    responseTime: "5 dakika",
    completionRate: 98,
    price: "₺50-200",
    verified: true,
    premium: true,
  },
  {
    id: "2",
    name: "Mehmet Demir",
    rating: 4.8,
    reviews: 203,
    distance: "0.8 km",
    responseTime: "10 dakika",
    completionRate: 96,
    price: "₺40-180",
    verified: true,
    premium: false,
  },
  {
    id: "3",
    name: "Ali Kaya",
    rating: 4.7,
    reviews: 89,
    distance: "2.5 km",
    responseTime: "15 dakika",
    completionRate: 94,
    price: "₺35-150",
    verified: false,
    premium: false,
  },
];

export default function CompareProvidersScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedProviders, setSelectedProviders] = useState<string[]>([PROVIDERS[0].id, PROVIDERS[1].id]);

  const toggleProvider = (id: string) => {
    if (selectedProviders.includes(id)) {
      setSelectedProviders(selectedProviders.filter((p) => p !== id));
    } else if (selectedProviders.length < 3) {
      setSelectedProviders([...selectedProviders, id]);
    }
  };

  const comparisonProviders = PROVIDERS.filter((p) => selectedProviders.includes(p.id));

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
          Ustaları Karşılaştır
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Selection */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Karşılaştırmak İçin Seç (Max 3)
        </Text>
        <View style={{ gap: 8, marginBottom: 24 }}>
          {PROVIDERS.map((provider) => (
            <Pressable
              key={provider.id}
              onPress={() => toggleProvider(provider.id)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: selectedProviders.includes(provider.id) ? colors.primary + "15" : colors.surface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1.5,
                  borderColor: selectedProviders.includes(provider.id) ? colors.primary : colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary + "15",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primary }}>
                  {provider.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{provider.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <Text style={{ fontSize: 12, color: colors.muted }}>⭐ {provider.rating}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>({provider.reviews})</Text>
                </View>
              </View>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: selectedProviders.includes(provider.id) ? colors.primary : colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selectedProviders.includes(provider.id) && (
                  <Text style={{ fontSize: 12, color: "#FFF", fontWeight: "bold" }}>✓</Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Comparison Table */}
        {comparisonProviders.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
              Karşılaştırma
            </Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden", marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
              {/* Headers */}
              <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1, padding: 12, backgroundColor: colors.background }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Kriter</Text>
                </View>
                {comparisonProviders.map((provider) => (
                  <View key={provider.id} style={{ flex: 1, padding: 12, borderLeftWidth: 1, borderLeftColor: colors.border }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: colors.foreground, textAlign: "center" }}>
                      {provider.name.split(" ")[0]}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Rows */}
              {[
                { label: "Puan", key: "rating" },
                { label: "Yorum", key: "reviews" },
                { label: "Mesafe", key: "distance" },
                { label: "Yanıt Süresi", key: "responseTime" },
                { label: "Tamamlama Oranı", key: "completionRate" },
                { label: "Fiyat Aralığı", key: "price" },
              ].map((row, index) => (
                <View
                  key={row.key}
                  style={{
                    flexDirection: "row",
                    borderBottomWidth: index < 5 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1, padding: 12, backgroundColor: colors.background }}>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: colors.foreground }}>{row.label}</Text>
                  </View>
                  {comparisonProviders.map((provider) => (
                    <View
                      key={provider.id}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderLeftWidth: 1,
                        borderLeftColor: colors.border,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: "500" }}>
                        {row.key === "rating"
                          ? `${provider.rating} ⭐`
                          : row.key === "reviews"
                          ? provider.reviews
                          : row.key === "completionRate"
                          ? `%${provider.completionRate}`
                          : (provider as any)[row.key]}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={{ gap: 10 }}>
              {comparisonProviders.map((provider) => (
                <Pressable
                  key={provider.id}
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: "center",
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>
                    {provider.name} ile İletişime Geç
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
