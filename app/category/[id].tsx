import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

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
  appliance: { icon: "refrigerator.fill", color: "#6366F1" },
};

type SortKey = "recommended" | "rating" | "available";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
}

function formatMoney(value: number | null) {
  if (!value) return "Teklif ile belirlenir";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CategoryDetailScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("recommended");
  const specialRoute = id === "courier" || id === "tow_truck" || id === "roadside";

  const categoryQuery = trpc.categories.bySlug.useQuery(
    { slug: id },
    { enabled: Boolean(id) && !specialRoute },
  );
  const category = categoryQuery.data;
  const providersQuery = trpc.providers.byCategory.useQuery(
    { categoryId: category?.id ?? 1 },
    { enabled: Boolean(category?.id) },
  );

  const providers = useMemo(() => {
    const rows = [...(providersQuery.data ?? [])];
    if (sortKey === "rating") {
      return rows.sort((left, right) => Number(right.rating ?? 0) - Number(left.rating ?? 0));
    }
    if (sortKey === "available") {
      return rows.sort((left, right) => Number(left.hasActiveJob) - Number(right.hasActiveJob));
    }
    return rows.sort((left, right) => Number(right.moveScore ?? 0) - Number(left.moveScore ?? 0));
  }, [providersQuery.data, sortKey]);

  if (id === "courier") return <Redirect href={"/create-service?categoryId=courier" as never} />;
  if (id === "tow_truck") return <Redirect href={"/create-service?categoryId=tow_truck" as never} />;
  if (id === "roadside") return <Redirect href={"/create-service?categoryId=roadside" as never} />;

  const meta = CATEGORY_META[id] ?? {
    icon: "questionmark.circle.fill",
    color: category?.color || colors.primary,
  };

  const header = (
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
      <Pressable onPress={() => router.back()} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.55 : 1 })}>
        <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
      </Pressable>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={{ fontSize: 17, lineHeight: 22, fontWeight: "800", color: colors.foreground }}>
          Profesyoneller
        </Text>
        <Text style={{ fontSize: 11, lineHeight: 15, color: colors.muted }} numberOfLines={1}>
          {category?.name || "Hizmet kategorisi"}
        </Text>
      </View>
      <View style={{ width: 30 }} />
    </View>
  );

  if (categoryQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.muted }}>Profesyoneller yükleniyor...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (categoryQuery.error || !category) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 }}>
          <IconSymbol name="magnifyingglass" size={34} color={colors.muted} />
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Kategori bulunamadı</Text>
          <Text style={{ color: colors.muted, textAlign: "center" }}>
            {categoryQuery.error?.message ?? "Bu hizmet artık kullanılamıyor olabilir."}
          </Text>
          <Pressable
            onPress={() => categoryQuery.refetch()}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 12,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Yeniden Dene</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {header}
      <FlatList
        data={providers}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 36, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: `${meta.color}20`,
                }}
              >
                <IconSymbol name={meta.icon as never} size={23} color={meta.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: colors.foreground, fontSize: 19, lineHeight: 24, fontWeight: "800" }}>
                  {category.name} Uzmanları
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }}>
                  {providers.length} doğrulanmış sonuç · {formatMoney(category.basePrice)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {([
                ["recommended", "Önerilen"],
                ["rating", "En Yüksek Puan"],
                ["available", "Şu An Uygun"],
              ] as const).map(([key, label]) => {
                const active = sortKey === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSortKey(key)}
                    style={({ pressed }) => ({
                      flexShrink: 1,
                      paddingHorizontal: 11,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ color: active ? "#FFF" : colors.foreground, fontSize: 11, lineHeight: 15, fontWeight: "700" }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {providersQuery.isLoading ? (
              <View style={{ paddingVertical: 30, alignItems: "center" }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : providersQuery.error ? (
              <Pressable
                onPress={() => providersQuery.refetch()}
                style={({ pressed }) => ({ padding: 16, borderRadius: 16, backgroundColor: colors.surface, marginBottom: 12, opacity: pressed ? 0.8 : 1 })}
              >
                <Text style={{ color: colors.error, textAlign: "center" }}>Profesyoneller yüklenemedi. Yeniden dene.</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const isAvailable = Number(item.hasActiveJob) === 0;
          const hasLocation = Boolean(item.latitude && item.longitude);
          return (
            <Pressable
              onPress={() => router.push(`/provider/${item.id}` as never)}
              style={({ pressed }) => ({
                backgroundColor: colors.card,
                borderRadius: 18,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.86 : 1,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: `${colors.primary}1A`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 18, lineHeight: 23, fontWeight: "800", color: colors.primary }}>
                    {initials(item.displayName)}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ flexShrink: 1, color: colors.foreground, fontSize: 15, lineHeight: 20, fontWeight: "800" }} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    {item.isVerified === 1 ? (
                      <IconSymbol name="checkmark.seal.fill" size={15} color={colors.primary} style={{ marginLeft: 5 }} />
                    ) : null}
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 }} numberOfLines={1}>
                    {item.bio?.trim() || `${category.name} profesyoneli`}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
                    <IconSymbol name="star.fill" size={13} color="#FFB800" />
                    <Text style={{ color: colors.foreground, fontSize: 11, lineHeight: 15, fontWeight: "700", marginLeft: 3 }}>
                      {Number(item.rating ?? 0).toFixed(1)}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15, marginLeft: 3 }}>
                      ({Number(item.reviewCount ?? 0)})
                    </Text>
                    <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted, marginHorizontal: 7 }} />
                    <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15 }}>
                      {item.completedJobs ?? 0} iş
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 8 }}>
                  <IconSymbol name="location.fill" size={14} color={colors.muted} />
                  <Text style={{ flex: 1, color: colors.muted, fontSize: 10, lineHeight: 14, marginLeft: 4 }} numberOfLines={1}>
                    {hasLocation ? "Konum paylaşılmış" : "Konum bekleniyor"}
                  </Text>
                </View>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: isAvailable ? "#16A34A1A" : "#F59E0B1A", borderRadius: 11, paddingHorizontal: 9, paddingVertical: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isAvailable ? colors.success : colors.warning }} />
                  <Text style={{ flex: 1, color: isAvailable ? colors.success : colors.warning, fontSize: 10, lineHeight: 14, fontWeight: "700", marginLeft: 5 }} numberOfLines={1}>
                    {isAvailable ? "Şu an uygun" : "Aktif işte"}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 11, borderTopWidth: 0.5, borderTopColor: colors.border }}>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 14 }}>Başlangıç fiyatı</Text>
                  <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 20, fontWeight: "800", marginTop: 1 }}>
                    {formatMoney(category.basePrice)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <IconSymbol name="clock.fill" size={13} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 11, lineHeight: 15, fontWeight: "700", marginLeft: 4 }}>
                      ETA teklif sonrası
                    </Text>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 }}>
                    MoveScore {item.moveScore ?? 0}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !providersQuery.isLoading && !providersQuery.error ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <IconSymbol name="person.fill" size={34} color={colors.muted} />
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>Bu kategoride henüz profesyonel bulunmuyor</Text>
              <Pressable
                onPress={() => router.push(`/create-service?categoryId=${category.id}` as never)}
                style={({ pressed }) => ({ marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, opacity: pressed ? 0.85 : 1 })}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFF" }}>Talep Oluştur</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}
