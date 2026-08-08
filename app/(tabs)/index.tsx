import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  FlatList,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { CATEGORIES } from "@/lib/data/categories";
import { SAMPLE_PROVIDERS } from "@/lib/data/providers";
import { SAMPLE_JOBS } from "@/lib/data/jobs";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useCallback } from "react";

const QUICK_ACCESS = [
  { id: "emergency", label: "Acil Yardım", icon: "bolt.fill" as const, color: "#FF6A00" },
  { id: "auto", label: "Araç", icon: "car.fill" as const, color: "#3B82F6" },
  { id: "home", label: "Ev", icon: "house.fill" as const, color: "#22C55E" },
  { id: "transport", label: "Taşıma", icon: "shippingbox.fill" as const, color: "#8A5CFF" },
];

export default function HomeScreen() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("");

  const topProviders = SAMPLE_PROVIDERS.filter((p) => p.premium).slice(0, 6);
  const kmCategories = CATEGORIES.filter((c) => c.pricingType === "km_based");
  const activeJobs = SAMPLE_JOBS.filter((j) => j.status === "active");

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery)}` as any);
    }
  }, [searchQuery]);

  const handleQuickAccess = useCallback((id: string) => {
    if (id === "emergency") {
      router.push("/explore?filter=emergency" as any);
    } else if (id === "auto") {
      router.push("/category/tow_truck" as any);
    } else if (id === "home") {
      router.push("/category/cleaning" as any);
    } else if (id === "transport") {
      router.push("/category/courier" as any);
    }
  }, []);

  const renderProvider = useCallback(
    ({ item }: { item: typeof SAMPLE_PROVIDERS[0] }) => (
      <Pressable
        onPress={() => router.push(`/provider/${item.id}` as any)}
        style={({ pressed }) => [
          {
            width: 220,
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 14,
            marginRight: 12,
            opacity: pressed ? 0.85 : 1,
            borderWidth: 0.5,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primary }}>
              {item.avatarInitials}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }} numberOfLines={1}>
                {item.name}
              </Text>
              {item.verified && (
                <IconSymbol name="checkmark.seal.fill" size={12} color={colors.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
              {item.categoryName}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <IconSymbol name="star.fill" size={12} color="#FFB800" />
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, marginLeft: 4 }}>
            {item.rating}
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 3 }}>
            ({item.reviewCount})
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 11, color: colors.muted }}>{item.distance}</Text>
        </View>

        {item.available && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.success + "12",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              alignSelf: "flex-start",
            }}
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: colors.success,
                marginRight: 4,
              }}
            />
            <Text style={{ fontSize: 10, fontWeight: "600", color: colors.success }}>
              Müsait
            </Text>
          </View>
        )}
      </Pressable>
    ),
    [colors]
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: Platform.OS === "web" ? 20 : 12,
            paddingBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 2 }}>
                Merhaba 👋
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>
                Ne ihtiyacın var?
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/notifications" as any)}
              style={({ pressed }) => [
                {
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                },
              ]}
            >
              <IconSymbol name="bell.fill" size={20} color={colors.foreground} />
              <View
                style={{
                  position: "absolute",
                  top: 10,
                  right: 12,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.primary,
                  borderWidth: 2,
                  borderColor: colors.card,
                }}
              />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Pressable
            onPress={handleSearch}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.card,
                borderRadius: 14,
                paddingHorizontal: 16,
                height: 50,
                opacity: pressed ? 0.85 : 1,
                borderWidth: 0.5,
                borderColor: colors.border,
              },
            ]}
          >
            <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
            <TextInput
              placeholder="Hizmet veya usta ara..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              style={{
                flex: 1,
                marginLeft: 10,
                fontSize: 15,
                color: colors.foreground,
              }}
            />
          </Pressable>
        </View>

        {/* MoveAI Banner — Prominent Purple */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Pressable
            onPress={() => router.push("/ai-assistant" as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 18,
                padding: 18,
                opacity: pressed ? 0.9 : 1,
                backgroundColor: colors.accentPurple,
                shadowColor: colors.accentPurple,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 4,
              },
            ]}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name="sparkles" size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFF" }}>
                MoveAI ile anlat
              </Text>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>
                İhtiyacını yaz, gerisini o halletsin
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        {/* Quick Access */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {QUICK_ACCESS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleQuickAccess(item.id)}
                style={({ pressed }) => [
                  {
                    alignItems: "center",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: colors.card,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 0.5,
                    borderColor: colors.border,
                  }}
                >
                  <IconSymbol name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted, marginTop: 6 }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Active Job Card — Referans görseldeki aktif iş kartı */}
        {activeJobs.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground, marginBottom: 14 }}>
              Aktif İş
            </Text>
            <Pressable
              onPress={() => router.push(`/job/${activeJobs[0].id}` as any)}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.card,
                  borderRadius: 20,
                  padding: 16,
                  opacity: pressed ? 0.9 : 1,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: colors.primary + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconSymbol name="wrench.fill" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                    {activeJobs[0].title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {activeJobs[0].providerName} · {activeJobs[0].location}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: colors.primary + "15",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>
                    Yolda
                  </Text>
                </View>
              </View>

              {/* Mini Map Placeholder */}
              <View
                style={{
                  height: 80,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <IconSymbol name="map.fill" size={28} color={colors.muted} />
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                  Tahmini varış: 12 dk
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => router.push(`/chat/${activeJobs[0].id}` as any)}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      paddingVertical: 10,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <IconSymbol name="message.fill" size={16} color={colors.foreground} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, marginLeft: 6 }}>
                    Mesaj
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/tracking/live` as any)}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                      paddingVertical: 10,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <IconSymbol name="location.fill" size={16} color="#FFF" />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFF", marginLeft: 6 }}>
                    Takip Et
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        )}

        {/* Categories — Clean List */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground }}>
              Hizmetler
            </Text>
            <Pressable onPress={() => router.push("/explore" as any)}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                Tümünü Gör
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {CATEGORIES.slice(0, 8).map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => router.push(`/category/${cat.id}` as any)}
                style={({ pressed }) => [
                  {
                    width: "48%",
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    padding: 12,
                    opacity: pressed ? 0.85 : 1,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconSymbol name={"house.fill"} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>
                    {cat.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                    {cat.serviceCount} hizmet
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Nearby Providers */}
        <View style={{ marginBottom: 28 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              marginBottom: 14,
            }}
          >
            <View>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground }}>
                Yakındaki Ustalar
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                Konumuna en yakın profesyoneller
              </Text>
            </View>
            <Pressable onPress={() => router.push("/explore" as any)}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                Tümü
              </Text>
            </Pressable>
          </View>
          <FlatList
            data={topProviders}
            renderItem={renderProvider}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>

        {/* KM-based Services */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground, marginBottom: 14 }}>
            Araç & Yol Hizmetleri
          </Text>
          {kmCategories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => router.push(`/category/${cat.id}` as any)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  opacity: pressed ? 0.85 : 1,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: colors.primary + "15",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconSymbol name="car.fill" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
                  {cat.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {cat.basePrice ? `₺${cat.basePrice} başlangıç` : "Fiyat bilgisi"} + {cat.kmRate ? ` ₺${cat.kmRate}/km` : ""}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
