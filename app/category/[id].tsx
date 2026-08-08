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
  painting: { icon: "palette.fill", color: "#8B5CF6" },
  ac: { icon: "sun.max.fill", color: "#06B6D4" },
  hvac: { icon: "sun.max.fill", color: "#06B6D4" },
  heating: { icon: "flame.fill", color: "#FF6B00" },
  moving: { icon: "shippingbox.fill", color: "#84CC16" },
  locksmith: { icon: "lock.fill", color: "#EF4444" },
  furniture: { icon: "sofa.fill", color: "#8B5CF6" },
  car: { icon: "car.fill", color: "#3B82F6" },
  garden: { icon: "leaf.fill", color: "#22C55E" },
  gardening: { icon: "leaf.fill", color: "#22C55E" },
  petcare: { icon: "heart.fill", color: "#EC4899" },
};

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
  const specialRoute = id === "courier" || id === "tow_truck" || id === "roadside";

  const categoryQuery = trpc.categories.bySlug.useQuery(
    { slug: id },
    { enabled: Boolean(id) && !specialRoute }
  );
  const category = categoryQuery.data;
  const providersQuery = trpc.providers.byCategory.useQuery(
    { categoryId: category?.id ?? 1 },
    { enabled: Boolean(category?.id) }
  );

  if (id === "courier") return <Redirect href="/service/courier" />;
  if (id === "tow_truck") return <Redirect href="/service/tow-truck" />;
  if (id === "roadside") return <Redirect href="/service/roadside" />;

  const meta = CATEGORY_META[id] ?? { icon: "questionmark.circle.fill", color: category?.color || colors.primary };
  const providers = providersQuery.data ?? [];

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
      <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
        <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
      </Pressable>
      <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: colors.foreground }}>
        {category?.name || "Kategori"}
      </Text>
      <View style={{ width: 30 }} />
    </View>
  );

  if (categoryQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.muted }}>Kategori yükleniyor...</Text>
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
          <Text style={{ color: colors.muted, textAlign: "center" }}>{categoryQuery.error?.message ?? "Bu hizmet artık kullanılamıyor olabilir."}</Text>
          <Pressable onPress={() => categoryQuery.refetch()} style={{ backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 }}>
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={{ paddingTop: 20, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 20, padding: 20, backgroundColor: meta.color + "20", borderWidth: 0.5, borderColor: meta.color + "45" }}>
                <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: meta.color + "22", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name={meta.icon as never} size={30} color={meta.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground }}>{category.name}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                    {providers.length} profesyonel · {formatMoney(category.basePrice)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 0.5, borderColor: colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Ücretlendirme</Text>
                  <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700", marginTop: 3 }}>
                    {category.pricingType === "hourly" ? "Saatlik" : category.pricingType === "km_based" ? "Kilometre bazlı" : "Sabit / teklif bazlı"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push(`/create-service?categoryId=${category.id}` as never)}
                  style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, opacity: pressed ? 0.85 : 1 })}
                >
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>Talep Oluştur</Text>
                </Pressable>
              </View>
            </View>

            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>Bu Kategorideki Ustalar</Text>
            {providersQuery.isLoading ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : providersQuery.error ? (
              <Pressable onPress={() => providersQuery.refetch()} style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface, marginBottom: 12 }}>
                <Text style={{ color: colors.error, textAlign: "center" }}>Profesyoneller yüklenemedi. Yeniden dene.</Text>
              </Pressable>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/provider/${item.id}` as never)}
            style={({ pressed }) => ({ backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 12, opacity: pressed ? 0.9 : 1, borderWidth: 0.5, borderColor: colors.border })}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: colors.primary }}>{initials(item.displayName)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }} numberOfLines={1}>{item.displayName}</Text>
                  {item.isVerified === 1 ? <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} style={{ marginLeft: 4 }} /> : null}
                </View>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }} numberOfLines={1}>{item.bio?.trim() || "Profesyonel hizmet sağlayıcı"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  <IconSymbol name="star.fill" size={12} color="#FFB800" />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, marginLeft: 3 }}>{item.rating ?? 0}</Text>
                  <View style={{ width: 1, height: 10, backgroundColor: colors.border, marginHorizontal: 8 }} />
                  <Text style={{ fontSize: 11, color: colors.muted }}>{item.completedJobs ?? 0} tamamlanan iş</Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.border }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>{formatMoney(category.basePrice)}</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>MoveScore {item.moveScore ?? 0}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !providersQuery.isLoading && !providersQuery.error ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <IconSymbol name="person.fill" size={34} color={colors.muted} />
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>Bu kategoride henüz usta bulunmuyor</Text>
              <Pressable onPress={() => router.push(`/create-service?categoryId=${category.id}` as never)} style={({ pressed }) => ({ marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, opacity: pressed ? 0.9 : 1 })}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFF" }}>Talep Oluştur</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}
