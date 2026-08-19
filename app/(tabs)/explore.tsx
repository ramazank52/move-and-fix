import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/lib/i18n";

type FilterTab = "all" | "emergency" | "km_based";

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  cleaning: { icon: "sparkles", color: "#10B981" },
  plumbing: { icon: "wrench.fill", color: "#3B82F6" },
  electrical: { icon: "bolt.fill", color: "#F59E0B" },
  painting: { icon: "paintpalette.fill", color: "#8B5CF6" },
  ac: { icon: "sun.max.fill", color: "#06B6D4" },
  hvac: { icon: "thermometer.medium", color: "#F97316" },
  heating: { icon: "flame.fill", color: "#FF6B00" },
  moving: { icon: "shippingbox.fill", color: "#84CC16" },
  locksmith: { icon: "lock.fill", color: "#EF4444" },
  furniture: { icon: "sofa.fill", color: "#8B5CF6" },
  car: { icon: "car.fill", color: "#3B82F6" },
  garden: { icon: "leaf.fill", color: "#22C55E" },
  gardening: { icon: "leaf.fill", color: "#22C55E" },
  petcare: { icon: "heart.fill", color: "#EC4899" },
  courier: { icon: "shippingbox.fill", color: "#22C55E" },
  tow_truck: { icon: "car.fill", color: "#EF4444" },
  towing: { icon: "car.fill", color: "#EF4444" },
  roadside: { icon: "wrench.adjustable.fill", color: "#8A5CFF" },
  appliance: { icon: "refrigerator.fill", color: "#6366F1" },
};

const EMERGENCY_SLUGS = new Set(["plumbing", "electrical", "locksmith", "roadside", "tow_truck", "towing"]);

export default function ExploreScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ q?: string; filter?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [activeFilter, setActiveFilter] = useState<FilterTab>(
    params.filter === "emergency" ? "emergency" : params.filter === "km_based" ? "km_based" : "all"
  );

  const categoriesQuery = trpc.categories.list.useQuery();
  const providersQuery = trpc.provider.nearby.useQuery({});

  const filteredCategories = useMemo(() => {
    let result = categoriesQuery.data ?? [];
    if (activeFilter === "emergency") result = result.filter((item) => EMERGENCY_SLUGS.has(item.slug));
    if (activeFilter === "km_based") result = result.filter((item) => item.pricingType === "km_based");
    const query = searchQuery.trim().toLocaleLowerCase("tr-TR");
    if (query) result = result.filter((item) => item.name.toLocaleLowerCase("tr-TR").includes(query));
    return result;
  }, [activeFilter, categoriesQuery.data, searchQuery]);

  const filteredProviders = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("tr-TR");
    const result = providersQuery.data ?? [];
    return query
      ? result.filter((item) => item.displayName.toLocaleLowerCase("tr-TR").includes(query))
      : result;
  }, [providersQuery.data, searchQuery]);

  const filterTabs: { id: FilterTab; label: string; icon: string }[] = [
    { id: "all", label: t("explore.all"), icon: "house.fill" },
    { id: "emergency", label: t("explore.emergency"), icon: "exclamationmark.triangle.fill" },
    { id: "km_based", label: t("explore.vehicle"), icon: "car.fill" },
  ];

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground, marginBottom: 12 }}>{t("explore.title")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 0.5, borderColor: colors.border }}>
            <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
            <TextInput
              placeholder={t("search")}
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              style={{ flex: 1, marginLeft: 10, fontSize: 14, color: colors.foreground }}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                <IconSymbol name="xmark" size={14} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <FlatList
            data={filterTabs}
            horizontal
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setActiveFilter(item.id)}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: activeFilter === item.id ? colors.primary : colors.surface,
                  borderWidth: activeFilter === item.id ? 0 : 0.5,
                  borderColor: colors.border,
                  marginRight: 8,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <IconSymbol name={item.icon as never} size={14} color={activeFilter === item.id ? "#FFF" : colors.muted} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: activeFilter === item.id ? "#FFF" : colors.foreground }}>{item.label}</Text>
                </View>
              </Pressable>
            )}
          />
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{t("categories")}</Text>
        </View>

        {categoriesQuery.isLoading ? (
          <View style={{ paddingVertical: 36, alignItems: "center", gap: 10 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.muted }}>{t("explore.loadingServices")}</Text>
          </View>
        ) : categoriesQuery.error ? (
          <Pressable onPress={() => categoriesQuery.refetch()} style={{ marginHorizontal: 16, padding: 18, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center" }}>
            <Text style={{ color: colors.error, fontWeight: "600" }}>{t("explore.categoriesFailed")}</Text>
            <Text style={{ color: colors.primary, marginTop: 6 }}>{t("explore.retry")}</Text>
          </Pressable>
        ) : filteredCategories.length === 0 ? (
          <View style={{ marginHorizontal: 16, padding: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center" }}>
            <IconSymbol name="magnifyingglass" size={28} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 8 }}>{t("explore.noServices")}</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, marginBottom: 20, gap: 8 }}>
            {filteredCategories.map((category) => {
              const meta = CATEGORY_META[category.slug] ?? { icon: "questionmark.circle.fill", color: category.color || colors.muted };
              return (
                <Pressable
                  key={category.id}
                  onPress={() => router.push(`/category/${category.slug}` as never)}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, opacity: pressed ? 0.9 : 1 })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: meta.color + "15", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <IconSymbol name={meta.icon as never} size={18} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{category.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                        {t("explore.providerCount", { count: Number(category.professionalCount) })}
                      </Text>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{t("explore.recommendedProviders")}</Text>
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "700" }}>{t("common.seeAll")}</Text>
              </Pressable>
            ) : null}
          </View>
          {providersQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : providersQuery.error ? (
            <Pressable onPress={() => providersQuery.refetch()} style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface }}>
              <Text style={{ color: colors.error, textAlign: "center" }}>{t("explore.loadingProvidersFailed")}</Text>
            </Pressable>
          ) : filteredProviders.length === 0 ? (
            <View style={{ padding: 20, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center" }}>
              <IconSymbol name="person.fill" size={26} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 8 }}>{t("explore.noProviders")}</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredProviders.slice(0, 3).map((provider) => (
                <Pressable
                  key={provider.id}
                  onPress={() => router.push(`/provider/${provider.id}` as never)}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, opacity: pressed ? 0.9 : 1 })}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                    <IconSymbol size={18} name="person.fill" color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{provider.displayName}</Text>
                      {provider.isVerified === 1 ? <IconSymbol name="checkmark.seal.fill" size={12} color={colors.accentBlue} /> : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <IconSymbol name="star.fill" size={10} color={colors.warning} />
                      <Text style={{ fontSize: 11, color: colors.muted }}>{provider.rating ?? 0}</Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>· {t("explore.moveScore", { score: provider.moveScore ?? 0 })}</Text>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
