import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { CATEGORIES } from "@/lib/data/categories";
import { SAMPLE_PROVIDERS } from "@/lib/data/providers";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

type FilterTab = "all" | "emergency" | "km_based";

// Kategori ikon mapping — referans görsele göre
const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  cleaning: { icon: "sparkles", color: "#10B981" },
  plumbing: { icon: "wrench.fill", color: "#3B82F6" },
  electrical: { icon: "bolt.fill", color: "#F59E0B" },
  painting: { icon: "palette.fill", color: "#8B5CF6" },
  ac: { icon: "sun.max.fill", color: "#06B6D4" },
  heating: { icon: "flame.fill", color: "#FF6B00" },
  moving: { icon: "shippingbox.fill", color: "#84CC16" },
  locksmith: { icon: "lock.fill", color: "#EF4444" },
  furniture: { icon: "sofa.fill", color: "#8B5CF6" },
  car: { icon: "car.fill", color: "#3B82F6" },
  garden: { icon: "leaf.fill", color: "#22C55E" },
  petcare: { icon: "heart.fill", color: "#EC4899" },
  courier: { icon: "shippingbox.fill", color: "#22C55E" },
  tow_truck: { icon: "car.fill", color: "#EF4444" },
  roadside: { icon: "wrench.adjustable.fill", color: "#8A5CFF" },
};

export default function ExploreScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ q?: string; filter?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [activeFilter, setActiveFilter] = useState<FilterTab>(
    params.filter === "emergency" ? "emergency" : "all"
  );

  // Fetch providers
  const { data: providers, isLoading: providersLoading } = trpc.providers.nearby.useQuery(
    { lat: "41.0082", lng: "28.9784" },
    { enabled: !!user }
  );

  const filterTabs: { id: FilterTab; label: string; icon: string }[] = [
    { id: "all", label: "Tümü", icon: "house.fill" },
    { id: "emergency", label: "Acil", icon: "exclamationmark.triangle.fill" },
    { id: "km_based", label: "Araç", icon: "car.fill" },
  ];

  // Filter categories
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

  // Filter providers
  const filteredProviders = useMemo(() => {
    let result = providers || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [providers, searchQuery]);

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground, marginBottom: 12 }}>
            Ne arıyorsun?
          </Text>

          {/* Search */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 11,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
          >
            <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
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
                <IconSymbol name="xmark" size={14} color={colors.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <FlatList
            data={filterTabs}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setActiveFilter(item.id)}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor:
                      activeFilter === item.id ? colors.primary : colors.surface,
                    borderWidth: activeFilter === item.id ? 0 : 0.5,
                    borderColor: colors.border,
                    marginRight: 8,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <IconSymbol
                    name={item.icon as "house.fill"}
                    size={14}
                    color={activeFilter === item.id ? "#FFFFFF" : colors.muted}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: activeFilter === item.id ? "#FFFFFF" : colors.foreground,
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            )}
            horizontal
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
          />
        </View>

        {/* Kategoriler Başlığı */}
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>
            Kategoriler
          </Text>
        </View>

        {/* Kategori Listesi — referans görsele göre */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20, gap: 8 }}>
          {filteredCategories.map((category) => {
            const iconData = CATEGORY_ICONS[category.id] || {
              icon: "questionmark.circle.fill",
              color: colors.muted,
            };
            return (
              <Pressable
                key={category.id}
                onPress={() => router.push(`/category/${category.id}` as any)}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: colors.surface,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  {/* Kategori İkonu */}
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
                    <IconSymbol
                      name={iconData.icon as "house.fill"}
                      size={18}
                      color={iconData.color}
                    />
                  </View>

                  {/* Kategori Adı ve Sayı */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: colors.foreground,
                      }}
                    >
                      {category.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.muted,
                        marginTop: 2,
                      }}
                    >
                      {Math.floor(Math.random() * 200) + 50} hizmet
                    </Text>
                  </View>
                </View>

                {/* Chevron */}
                <IconSymbol
                  name="chevron.right"
                  size={16}
                  color={colors.muted}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Ustalar Bölümü */}
        {filteredProviders.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>
                Yakındaki Ustalar
              </Text>
              <Pressable>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "700" }}>
                  Tümü
                </Text>
              </Pressable>
            </View>

            {providersLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <ActivityIndicator color={colors.primary} size="small" />
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {filteredProviders.slice(0, 3).map((provider) => (
                  <Pressable
                    key={provider.id}
                    onPress={() => router.push(`/provider/${provider.id}` as any)}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: colors.surface,
                        borderWidth: 0.5,
                        borderColor: colors.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
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
                        <IconSymbol
                          size={18}
                          name="person.fill"
                          color={colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: colors.foreground,
                            }}
                          >
                            {provider.displayName}
                          </Text>
                          {provider.isVerified ? (
                            <IconSymbol
                              name="checkmark.seal.fill"
                              size={12}
                              color={colors.accentBlue}
                            />
                          ) : null}
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 4,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <IconSymbol
                              name="star.fill"
                              size={10}
                              color={colors.warning}
                            />
                            <Text
                              style={{
                                fontSize: 11,
                                color: colors.muted,
                              }}
                            >
                              {provider.rating || 0}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: colors.muted }}>
                            • Yakında
                          </Text>
                        </View>
                      </View>
                    </View>
                    <IconSymbol
                      name="chevron.right"
                      size={16}
                      color={colors.muted}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
