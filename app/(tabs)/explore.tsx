import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { ServiceCategoryCard } from "@/components/service-category-card";
import { CATEGORIES } from "@/lib/data/categories";
import { SAMPLE_PROVIDERS, Provider } from "@/lib/data/providers";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useCallback, useMemo } from "react";

type FilterTab = "all" | "emergency" | "km_based" | "providers";

export default function ExploreScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ q?: string; filter?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [activeFilter, setActiveFilter] = useState<FilterTab>(
    params.filter === "emergency" ? "emergency" : "all"
  );

  const { width } = useWindowDimensions();
  const CARD_GAP = 12;
  const CARD_WIDTH = (width - 48 - CARD_GAP) / 2;

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

  const renderCategory = useCallback(
    ({ item }: { item: typeof CATEGORIES[0] }) => <ServiceCategoryCard category={item} />,
    []
  );

  const renderProvider = useCallback(
    ({ item }: { item: Provider }) => (
      <Pressable
        onPress={() => router.push(`/provider/${item.id}` as any)}
        style={({ pressed }) => [
          {
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 16,
            marginBottom: 12,
            opacity: pressed ? 0.9 : 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
            borderWidth: 0.5,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: colors.primary + "15",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.primary }}>
              {item.avatarInitials}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }} numberOfLines={1}>
                {item.name}
              </Text>
              {item.verified && (
                <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
              )}
              {item.premium && (
                <View
                  style={{
                    marginLeft: 6,
                    backgroundColor: colors.accentPurple + "15",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: "700", color: colors.accentPurple }}>
                    PREMIUM
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
              {item.categoryName} · {item.location}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
              <IconSymbol name="star.fill" size={12} color="#FFB800" />
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, marginLeft: 3 }}>
                {item.rating}
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 3 }}>
                ({item.reviewCount})
              </Text>
              <View style={{ width: 1, height: 10, backgroundColor: colors.border, marginHorizontal: 8 }} />
              <IconSymbol name="clock.fill" size={11} color={colors.muted} />
              <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 3 }}>
                {item.responseTime}
              </Text>
            </View>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
            {item.price}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconSymbol name="location.fill" size={12} color={colors.muted} />
            <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 3 }}>
              {item.distance}
            </Text>
          </View>
        </View>
      </Pressable>
    ),
    [colors]
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground, marginBottom: 14 }}>
          Keşfet
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.card,
            borderRadius: 16,
            paddingHorizontal: 16,
            height: 50,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
        >
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            placeholder="Hizmet veya usta ara..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            style={{
              flex: 1,
              marginLeft: 12,
              fontSize: 15,
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
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
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
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 14,
                  marginRight: 10,
                  opacity: pressed ? 0.9 : 1,
                  shadowColor: activeFilter === item.id ? colors.primary : "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: activeFilter === item.id ? 0.2 : 0.04,
                  shadowRadius: 8,
                  elevation: activeFilter === item.id ? 3 : 1,
                },
              ]}
            >
              <IconSymbol
                name={item.icon as any}
                size={16}
                color={activeFilter === item.id ? "#FFF" : colors.muted}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: activeFilter === item.id ? "#FFF" : colors.foreground,
                  marginLeft: 6,
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
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              {filteredCategories.length} kategori bulundu
            </Text>
            <FlatList
              data={filteredCategories}
              renderItem={renderCategory}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={{ gap: CARD_GAP, marginBottom: CARD_GAP }}
            />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
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
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
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
