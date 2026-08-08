import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { CATEGORIES } from "@/lib/data/categories";
import { SAMPLE_PROVIDERS, Provider } from "@/lib/data/providers";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useCallback, useMemo } from "react";

type FilterTab = "all" | "emergency" | "km_based" | "providers";

// Kategori ikon mapping — emoji DEĞİL, profesyonel ikonlar
const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  plumbing: { icon: "wrench.fill", color: "#3B82F6" },
  electrical: { icon: "bolt.fill", color: "#F59E0B" },
  cleaning: { icon: "sparkles", color: "#8A5CFF" },
  hvac: { icon: "sun.max.fill", color: "#FF6A00" },
  towing: { icon: "car.fill", color: "#EF4444" },
  courier: { icon: "shippingbox.fill", color: "#22C55E" },
  roadside: { icon: "wrench.adjustable.fill", color: "#8A5CFF" },
  locksmith: { icon: "lock.fill", color: "#EF4444" },
  painting: { icon: "paintbrush.fill", color: "#3B82F6" },
  renovation: { icon: "house.fill", color: "#F59E0B" },
  gardening: { icon: "leaf.fill", color: "#22C55E" },
  moving: { icon: "shippingbox.fill", color: "#FF6A00" },
};

export default function ExploreScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ q?: string; filter?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [activeFilter, setActiveFilter] = useState<FilterTab>(
    params.filter === "emergency" ? "emergency" : "all"
  );

  const filterTabs: { id: FilterTab; label: string; icon: string }[] = [
    { id: "all", label: "Tümü", icon: "house" },
    { id: "emergency", label: "Acil", icon: "bolt.fill" },
    { id: "km_based", label: "Araç", icon: "car.fill" },
    { id: "providers", label: "Ustalar", icon: "person.fill" },
  ];

  const filteredCategories = useMemo(() => {
    let result = CATEGORIES;
    if (activeFilter === "emergency") {
      result = result.filter((c) =>
        ["plumbing", "electrical", "locksmith", "roadside", "tow_truck"].includes(c.id)
      );
    } else if (activeFilter === "km_based") {
      result = result.filter((c) => c.pricingType === "km_based");
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.subcategories.some((s) => s.toLowerCase().includes(q))
      );
    }
    return result;
  }, [activeFilter, searchQuery]);

  const filteredProviders = useMemo(() => {
    let result = SAMPLE_PROVIDERS;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.services.some((s) => s.toLowerCase().includes(q))
      );
    }
    return result;
  }, [searchQuery]);

  const renderProvider = useCallback(
    ({ item }: { item: Provider }) => (
      <Pressable
        onPress={() => router.push(`/provider/${item.id}` as any)}
        style={({ pressed }) => [
          {
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
            opacity: pressed ? 0.9 : 1,
            borderWidth: 0.5,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Avatar — profesyonel ikon */}
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
            <IconSymbol size={22} name="person.fill" color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }} numberOfLines={1}>
                {item.name}
              </Text>
              {item.verified && (
                <IconSymbol name="checkmark.seal.fill" size={12} color={colors.accentBlue} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              {item.categoryName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <IconSymbol name="star.fill" size={10} color={colors.warning} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: colors.foreground, marginLeft: 3 }}>
                {item.rating}
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 3 }}>
                ({item.reviewCount})
              </Text>
              <View style={{ width: 1, height: 8, backgroundColor: colors.border, marginHorizontal: 6 }} />
              <IconSymbol name="location.fill" size={10} color={colors.muted} />
              <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 3 }}>
                {item.distance}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    ),
    [colors]
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground, marginBottom: 12 }}>
          Keşfet
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.card,
            borderRadius: 14,
            paddingHorizontal: 14,
            height: 46,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
        >
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            placeholder="Hizmet veya usta ara..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 14,
              color: colors.foreground,
            }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <IconSymbol name="xmark" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <FlatList
          data={filterTabs}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setActiveFilter(item.id)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: activeFilter === item.id ? colors.primary : colors.card,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 12,
                  marginRight: 8,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <IconSymbol
                name={item.icon as any}
                size={14}
                color={activeFilter === item.id ? "#FFF" : colors.muted}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: activeFilter === item.id ? "#FFF" : colors.foreground,
                  marginLeft: 5,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      >
        {activeFilter !== "providers" ? (
          <>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
              Kategoriler
            </Text>
            <View style={{ gap: 8 }}>
              {filteredCategories.map((category) => {
                const iconData = CATEGORY_ICONS[category.id] || { icon: "house", color: colors.primary };
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => router.push(`/category/${category.id}` as any)}
                    style={({ pressed }) => [{
                      backgroundColor: colors.card,
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderWidth: 0.5,
                      borderColor: colors.border,
                      opacity: pressed ? 0.9 : 1,
                    }]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      {/* Profesyonel ikon container */}
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: iconData.color + "15",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <IconSymbol size={20} name={iconData.icon as any} color={iconData.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                          {category.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                          {category.subcategories.length} alt kategori
                        </Text>
                      </View>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
              {filteredProviders.length} usta bulundu
            </Text>
            {filteredProviders.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/provider/${p.id}` as any)}
              >
                {renderProvider({ item: p })}
              </Pressable>
            ))}
          </>
        )}

        {/* Always show providers at bottom for non-provider tabs */}
        {activeFilter !== "providers" && filteredProviders.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
              Önerilen Ustalar
            </Text>
            {filteredProviders.slice(0, 3).map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/provider/${p.id}` as any)}
              >
                {renderProvider({ item: p })}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
