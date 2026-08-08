import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { ServiceCategoryCard } from "@/components/service-category-card";
import { CATEGORIES } from "@/lib/data/categories";
import { SAMPLE_PROVIDERS } from "@/lib/data/providers";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useCallback } from "react";

const { width: screenWidth } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_WIDTH = (screenWidth - 48 - CARD_GAP) / 2;

export default function HomeScreen() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("");

  const topProviders = SAMPLE_PROVIDERS.filter((p) => p.premium).slice(0, 4);
  const emergencyCategories = CATEGORIES.filter((c) =>
    ["plumbing", "electrical", "locksmith", "roadside", "tow_truck"].includes(c.id)
  );

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery)}` as any);
    }
  }, [searchQuery]);

  const renderCategory = useCallback(
    ({ item }: { item: typeof CATEGORIES[0] }) => <ServiceCategoryCard category={item} />,
    []
  );

  const renderProvider = useCallback(
    ({ item }: { item: typeof SAMPLE_PROVIDERS[0] }) => (
      <Pressable
        onPress={() => router.push(`/provider/${item.id}` as any)}
        style={({ pressed }) => [
          {
            width: CARD_WIDTH,
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 16,
            marginRight: CARD_GAP,
            opacity: pressed ? 0.9 : 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
            borderWidth: 0.5,
            borderColor: colors.border,
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
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary }}>
              {item.avatarInitials}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }} numberOfLines={1}>
                {item.name}
              </Text>
              {item.verified && (
                <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              {item.categoryName}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <IconSymbol name="star.fill" size={14} color="#FFB800" />
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, marginLeft: 4 }}>
            {item.rating}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>
            ({item.reviewCount})
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 12, color: colors.muted }}>{item.distance}</Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 10,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconSymbol name="clock.fill" size={12} color={colors.muted} />
            <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 4 }}>
              {item.responseTime}
            </Text>
          </View>
          {item.available ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.success + "15",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.success,
                  marginRight: 4,
                }}
              />
              <Text style={{ fontSize: 10, fontWeight: "600", color: colors.success }}>
                Müsait
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.muted + "15",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "600", color: colors.muted }}>
                Meşgul
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    ),
    [CARD_WIDTH, colors]
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
                Hoş geldin 👋
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
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                },
              ]}
            >
              <IconSymbol name="bell.fill" size={22} color={colors.foreground} />
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
                borderRadius: 16,
                paddingHorizontal: 16,
                height: 52,
                opacity: pressed ? 0.9 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
                borderWidth: 0.5,
                borderColor: colors.border,
              },
            ]}
          >
            <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
            <TextInput
              placeholder="Hizmet, usta veya kategori ara..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 15,
                color: colors.foreground,
              }}
            />
          </Pressable>
        </View>

        {/* Emergency Banner */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Pressable
            onPress={() => router.push("/explore?filter=emergency" as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 20,
                padding: 20,
                opacity: pressed ? 0.92 : 1,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 4,
              },
            ]}
          >
            {/* Gradient background via two-layer approach */}
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: colors.primary,
                borderRadius: 20,
              }}
            />
            <View style={{ flex: 1, zIndex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <IconSymbol name="bolt.fill" size={16} color="#FFF" />
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFF", marginLeft: 6 }}>
                  Acil Hizmetler
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                Su borusu patladı? Elektrik mi kesildi? Hemen usta çağır
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 12,
                  alignItems: "center",
                }}
              >
                {emergencyCategories.slice(0, 4).map((cat, idx) => (
                  <View
                    key={cat.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginRight: 8,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 14, marginRight: 4 }}>{cat.icon}</Text>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#FFF" }}>
                      {cat.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
        </View>

        {/* Categories Grid */}
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
              Hizmet Kategorileri
            </Text>
            <Pressable onPress={() => router.push("/explore" as any)}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                Tümünü Gör
              </Text>
            </Pressable>
          </View>
          <FlatList
            data={CATEGORIES.slice(0, 8)}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: CARD_GAP, marginBottom: CARD_GAP }}
          />
        </View>

        {/* Top Providers */}
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
                Öne Çıkan Ustalar
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                En yüksek puanlı profesyoneller
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

        {/* AI Assistant CTA */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Pressable
            onPress={() => router.push("/ai-assistant" as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.card,
                borderRadius: 20,
                padding: 18,
                opacity: pressed ? 0.92 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
                borderWidth: 0.5,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: colors.accentPurple + "15",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name="sparkles" size={26} color={colors.accentPurple} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                MoveAI Asistanı
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
                Yapay zeka ile ihtiyacını anlat, en uygun ustayı bul
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Home Ideas Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground, marginBottom: 4 }}>
            Evin için bir fikir
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 14 }}>
            Popüler hizmetler ve ilham veren içerikler
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => router.push("/category/cleaning" as any)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  borderRadius: 18,
                  padding: 16,
                  minHeight: 120,
                  justifyContent: "flex-end",
                  opacity: pressed ? 0.9 : 1,
                  backgroundColor: "#DCFCE7",
                },
              ]}
            >
              <Text style={{ fontSize: 24, marginBottom: 8 }}>✨</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#166534" }}>
                Detaylı Temizlik
              </Text>
              <Text style={{ fontSize: 11, color: "#15803D", marginTop: 4 }}>
                ₺500'den başlayan fiyatlar
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/category/painting" as any)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  borderRadius: 18,
                  padding: 16,
                  minHeight: 120,
                  justifyContent: "flex-end",
                  opacity: pressed ? 0.9 : 1,
                  backgroundColor: "#EDE9FE",
                },
              ]}
            >
              <Text style={{ fontSize: 24, marginBottom: 8 }}>🎨</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#5B21B6" }}>
                Evini Yenile
              </Text>
              <Text style={{ fontSize: 11, color: "#6D28D9", marginTop: 4 }}>
                Boya & badana hizmetleri
              </Text>
            </Pressable>
          </View>
        </View>

        {/* KM-based Services */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground, marginBottom: 14 }}>
            Araç & Yol Hizmetleri
          </Text>
          {CATEGORIES.filter((c) => c.pricingType === "km_based").map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => router.push(`/category/${cat.id}` as any)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                  opacity: pressed ? 0.9 : 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 1,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: cat.gradientColors[0],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                  {cat.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
                  ₺{cat.basePrice} başlangıç + ₺{cat.kmRate}/km
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
