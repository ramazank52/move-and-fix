import { Text, View, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface FilterState {
  minRating: number;
  maxPrice: number;
  maxDistance: number;
  categories: string[];
  verified: boolean;
  premium: boolean;
  sortBy: "rating" | "price" | "distance" | "reviews";
}

const CATEGORIES = [
  "Temizlik", "Su Tesisatı", "Elektrik", "Boya", "Klima",
  "Nakliyat", "Çilingir", "Kurye", "Çekici", "Yol Yardım"
];

export default function FilterScreen() {
  const colors = useColors();
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    minRating: 4.0,
    maxPrice: 500,
    maxDistance: 10,
    categories: [],
    verified: false,
    premium: false,
    sortBy: "rating",
  });

  const toggleCategory = (category: string) => {
    setFilters({
      ...filters,
      categories: filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category],
    });
  };

  const handleReset = () => {
    setFilters({
      minRating: 4.0,
      maxPrice: 500,
      maxDistance: 10,
      categories: [],
      verified: false,
      premium: false,
      sortBy: "rating",
    });
  };

  const handleApply = () => {
    router.back();
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
          Filtreleme
        </Text>
        <Pressable onPress={handleReset} style={{ padding: 4 }}>
          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>Sıfırla</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Sorting */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Sırala
        </Text>
        <View style={{ gap: 8, marginBottom: 24 }}>
          {(["rating", "price", "distance", "reviews"] as const).map((sort) => (
            <Pressable
              key={sort}
              onPress={() => setFilters({ ...filters, sortBy: sort })}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: filters.sortBy === sort ? colors.primary + "15" : colors.surface,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: filters.sortBy === sort ? colors.primary : colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: filters.sortBy === sort ? colors.primary : colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                {filters.sortBy === sort && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.primary,
                    }}
                  />
                )}
              </View>
              <Text style={{ flex: 1, fontSize: 14, color: colors.foreground, fontWeight: "500" }}>
                {sort === "rating" && "En Yüksek Puan"}
                {sort === "price" && "En Düşük Fiyat"}
                {sort === "distance" && "En Yakın"}
                {sort === "reviews" && "En Çok Yorum"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Rating Filter */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Minimum Puan: {filters.minRating.toFixed(1)} ⭐
        </Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Pressable
                key={rating}
                onPress={() => setFilters({ ...filters, minRating: rating })}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    backgroundColor: filters.minRating >= rating ? colors.primary : colors.border + "20",
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: "center",
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: filters.minRating >= rating ? "#FFF" : colors.foreground }}>
                  {rating}⭐
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Price Filter */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Maksimum Fiyat: ₺{filters.maxPrice}
        </Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {[100, 250, 500, 750, 1000].map((price) => (
              <Pressable
                key={price}
                onPress={() => setFilters({ ...filters, maxPrice: price })}
                style={({ pressed }) => [
                  {
                    backgroundColor: filters.maxPrice >= price ? colors.primary : colors.border + "20",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: filters.maxPrice >= price ? "#FFF" : colors.foreground }}>
                  ₺{price}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Distance Filter */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Maksimum Mesafe: {filters.maxDistance} km
        </Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {[1, 5, 10, 20, 50].map((distance) => (
              <Pressable
                key={distance}
                onPress={() => setFilters({ ...filters, maxDistance: distance })}
                style={({ pressed }) => [
                  {
                    backgroundColor: filters.maxDistance >= distance ? colors.primary : colors.border + "20",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: filters.maxDistance >= distance ? "#FFF" : colors.foreground }}>
                  {distance}km
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Verification Filters */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Diğer Filtreler
        </Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: "hidden", marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          <Pressable
            onPress={() => setFilters({ ...filters, verified: !filters.verified })}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: filters.verified ? colors.primary : colors.border,
                backgroundColor: filters.verified ? colors.primary : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              {filters.verified && <Text style={{ fontSize: 12, color: "#FFF", fontWeight: "bold" }}>✓</Text>}
            </View>
            <Text style={{ flex: 1, fontSize: 14, color: colors.foreground, fontWeight: "500" }}>
              Doğrulanmış Ustalar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilters({ ...filters, premium: !filters.premium })}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 12,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: filters.premium ? colors.primary : colors.border,
                backgroundColor: filters.premium ? colors.primary : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              {filters.premium && <Text style={{ fontSize: 12, color: "#FFF", fontWeight: "bold" }}>✓</Text>}
            </View>
            <Text style={{ flex: 1, fontSize: 14, color: colors.foreground, fontWeight: "500" }}>
              Premium Üyeler
            </Text>
          </Pressable>
        </View>

        {/* Categories */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Kategoriler
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {CATEGORIES.map((category) => (
            <Pressable
              key={category}
              onPress={() => toggleCategory(category)}
              style={({ pressed }) => [
                {
                  backgroundColor: filters.categories.includes(category) ? colors.primary : colors.surface,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: filters.categories.includes(category) ? colors.primary : colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: filters.categories.includes(category) ? "#FFF" : colors.foreground,
                }}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Apply Button */}
        <Pressable
          onPress={handleApply}
          style={({ pressed }) => [
            {
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600" }}>Filtreleri Uygula</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
