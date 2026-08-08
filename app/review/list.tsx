import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ReviewListScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ providerId?: string; providerName?: string }>();
  const providerId = Number(params.providerId);
  const isValidProviderId = Number.isInteger(providerId) && providerId > 0;

  const reviewsQuery = trpc.reviews.forProvider.useQuery(
    { providerId, limit: 100, offset: 0 },
    { enabled: isValidProviderId }
  );
  const reviews = reviewsQuery.data ?? [];
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const renderStars = (rating: number) => (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <IconSymbol
          key={star}
          name="star.fill"
          size={14}
          color={star <= rating ? "#F59E0B" : colors.border}
        />
      ))}
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "600", color: colors.foreground }}>Değerlendirmeler</Text>
          {params.providerName ? <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>{params.providerName}</Text> : null}
        </View>
        <View style={{ width: 28 }} />
      </View>

      {isValidProviderId && !reviewsQuery.isLoading && !reviewsQuery.error ? (
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
          <View style={{ alignItems: "center", marginRight: 20 }}>
            <Text style={{ fontSize: 36, fontWeight: "bold", color: "#F59E0B" }}>{averageRating.toFixed(1)}</Text>
            {renderStars(Math.round(averageRating))}
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{reviews.length} değerlendirme</Text>
          </View>
          <View style={{ flex: 1 }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((review) => review.rating === star).length;
              const percentage = reviews.length ? (count / reviews.length) * 100 : 0;
              return (
                <View key={star} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                  <Text style={{ fontSize: 12, color: colors.muted, width: 14 }}>{star}</Text>
                  <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, marginHorizontal: 6 }}>
                    <View style={{ width: `${percentage}%`, height: 6, backgroundColor: "#F59E0B", borderRadius: 3 }} />
                  </View>
                  <Text style={{ fontSize: 11, color: colors.muted, width: 20 }}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {!isValidProviderId ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 }}>
          <IconSymbol name="exclamationmark.triangle.fill" size={32} color={colors.warning} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>Geçersiz profesyonel bağlantısı</Text>
          <Text style={{ color: colors.muted, textAlign: "center" }}>Değerlendirmeleri görüntülemek için geçerli bir profesyonel seçin.</Text>
        </View>
      ) : reviewsQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.muted }}>Değerlendirmeler yükleniyor...</Text>
        </View>
      ) : reviewsQuery.error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 }}>
          <IconSymbol name="wifi.exclamationmark" size={32} color={colors.error} />
          <Text style={{ color: colors.error, textAlign: "center" }}>{reviewsQuery.error.message}</Text>
          <Pressable onPress={() => reviewsQuery.refetch()} style={{ backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 }}>
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Yeniden Dene</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
              <IconSymbol name="star.fill" size={34} color={colors.muted} />
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", marginTop: 12 }}>Henüz değerlendirme yok</Text>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 6 }}>Tamamlanan ve doğrulanan işler için yorumlar burada görünür.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: "bold", color: colors.primary }}>{(item.reviewerName || "M").charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }} numberOfLines={1}>{item.reviewerName || "Move&Fix kullanıcısı"}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{new Date(item.createdAt).toLocaleDateString("tr-TR")}</Text>
                  </View>
                </View>
                {renderStars(item.rating)}
              </View>
              <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>{item.comment || "Puanlama bırakıldı."}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                <IconSymbol name="checkmark.seal.fill" size={13} color={colors.success} />
                <Text style={{ fontSize: 11, color: colors.success, marginLeft: 4 }}>Tamamlanmış iş doğrulandı</Text>
              </View>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}
