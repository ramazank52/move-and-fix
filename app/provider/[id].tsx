import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
}

function formatReviewDate(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const providerId = Number(id);
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const validProviderId = Number.isInteger(providerId) && providerId > 0;

  const providerQuery = trpc.provider.byId.useQuery(
    { providerId },
    { enabled: validProviderId }
  );
  const categoriesQuery = trpc.categories.list.useQuery();
  const reviewsQuery = trpc.reviews.forProvider.useQuery(
    { providerId, limit: 10, offset: 0 },
    { enabled: validProviderId }
  );
  const passportQuery = trpc.moveTrust.passport.useQuery(
    { providerUserId: providerQuery.data?.providerUserId ?? 0 },
    { enabled: validProviderId && Boolean(providerQuery.data?.providerUserId) },
  );
  const favoriteQuery = trpc.provider.favoriteStatus.useQuery(
    { providerId },
    { enabled: validProviderId && Boolean(providerQuery.data) }
  );
  const invalidateFavorites = async () => {
    await Promise.all([
      utils.provider.favoriteList.invalidate(),
      utils.provider.favoriteStatus.invalidate({ providerId }),
    ]);
  };
  const addFavorite = trpc.provider.favoriteAdd.useMutation({
    onSuccess: invalidateFavorites,
    onError: (error) => Alert.alert("Favori güncellenemedi", error.message),
  });
  const removeFavorite = trpc.provider.favoriteRemove.useMutation({
    onSuccess: invalidateFavorites,
    onError: (error) => Alert.alert("Favori güncellenemedi", error.message),
  });

  const provider = providerQuery.data;
  const category = categoriesQuery.data?.find((item) => item.id === provider?.categoryId);
  const reviews = reviewsQuery.data ?? [];

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
      <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
        <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
      </Pressable>
      <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: colors.foreground }}>
        Usta Profili
      </Text>
      {providerQuery.data ? (
        <Pressable
          accessibilityLabel={favoriteQuery.data ? "Favorilerden çıkar" : "Favorilere ekle"}
          disabled={favoriteQuery.isLoading || addFavorite.isPending || removeFavorite.isPending}
          onPress={() => {
            if (favoriteQuery.data) removeFavorite.mutate({ providerId });
            else addFavorite.mutate({ providerId });
          }}
          style={({ pressed }) => ({
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
            width: 30,
          })}
        >
          <IconSymbol
            name="heart.fill"
            size={22}
            color={favoriteQuery.data ? colors.error : colors.muted}
          />
        </Pressable>
      ) : (
        <View style={{ width: 30 }} />
      )}
    </View>
  );

  if (!validProviderId || providerQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          {validProviderId ? <ActivityIndicator color={colors.primary} /> : null}
          <Text style={{ color: colors.muted }}>
            {validProviderId ? "Profesyonel bilgileri yükleniyor..." : "Geçersiz profesyonel bağlantısı"}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (providerQuery.error || !provider) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 }}>
          <IconSymbol name="person.fill" size={40} color={colors.muted} />
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", textAlign: "center" }}>
            Profesyonel bulunamadı
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>
            {providerQuery.error?.message ?? "Bu profil artık kullanılamıyor olabilir."}
          </Text>
          <Pressable
            onPress={() => providerQuery.refetch()}
            style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Yeniden Dene</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const startingPrice = category?.basePrice
    ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(category.basePrice)
    : "Teklif ile belirlenir";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 118 }}>
        <View style={{ alignItems: "center", paddingVertical: 24, paddingHorizontal: 20 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 26,
              backgroundColor: colors.primary + "15",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: "800", color: colors.primary }}>
              {initials(provider.displayName)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>
              {provider.displayName}
            </Text>
            {provider.isVerified === 1 ? (
              <IconSymbol name="checkmark.seal.fill" size={18} color={colors.primary} />
            ) : null}
          </View>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
            {category?.name ?? "Profesyonel Hizmet"}
          </Text>

          <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
            {provider.isVerified === 1 ? (
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.success + "15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                <IconSymbol name="checkmark.seal.fill" size={12} color={colors.success} />
                <Text style={{ fontSize: 12, color: colors.success, fontWeight: "600", marginLeft: 4 }}>Doğrulanmış</Text>
              </View>
            ) : null}
            {provider.isPremium === 1 ? (
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.accentPurple + "15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                <IconSymbol name="star.fill" size={12} color={colors.accentPurple} />
                <Text style={{ fontSize: 12, color: colors.accentPurple, fontWeight: "600", marginLeft: 4 }}>Premium</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 0.5, borderColor: colors.border }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconSymbol name="star.fill" size={16} color="#FFB800" />
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground, marginLeft: 4 }}>{provider.rating ?? 0}</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Puan</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground }}>{provider.completedJobs ?? 0}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Tamamlanan</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground }}>{provider.moveScore ?? 0}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>MoveScore</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>MoveTrust Passport</Text>
          <View style={{ borderRadius: 18, padding: 16, borderWidth: 0.5, borderColor: passportQuery.data?.verification.isVerified ? `${colors.success}55` : colors.border, backgroundColor: passportQuery.data?.verification.isVerified ? `${colors.success}0C` : colors.card }}>
            {passportQuery.isLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={{ marginLeft: 9, color: colors.muted, fontSize: 13 }}>Güven özeti yükleniyor…</Text>
              </View>
            ) : passportQuery.isError || !passportQuery.data ? (
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>Güven özeti şu anda görüntülenemiyor. İşlem bilgileri için profil ve değerlendirmeleri inceleyebilirsiniz.</Text>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <IconSymbol name={passportQuery.data.verification.isVerified ? "checkmark.seal.fill" : "exclamationmark.shield.fill"} size={20} color={passportQuery.data.verification.isVerified ? colors.success : colors.warning} />
                  <Text style={{ marginLeft: 8, flex: 1, color: colors.foreground, fontSize: 14, fontWeight: "800" }}>
                    {passportQuery.data.verification.isVerified ? "Kimlik ve belge doğrulaması tamamlandı" : "Doğrulama süreci tamamlanmadı"}
                  </Text>
                  <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "900" }}>{passportQuery.data.trust.score == null ? "—" : `${passportQuery.data.trust.score}/100`}</Text>
                </View>
                <Text style={{ marginTop: 9, color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  {passportQuery.data.provider.completedJobs} tamamlanan iş · {passportQuery.data.provider.reviewCount ?? 0} değerlendirme
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>Hakkında</Text>
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 22 }}>
            {provider.bio?.trim() || "Profesyonel henüz bir tanıtım metni eklemedi."}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>Hizmet</Text>
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 0.5, borderColor: colors.border }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.success + "15", alignItems: "center", justifyContent: "center" }}>
              <IconSymbol name="checkmark" size={16} color={colors.success} />
            </View>
            <Text style={{ marginLeft: 12, fontSize: 14, color: colors.foreground, fontWeight: "500" }}>
              {category?.name ?? "Profesyonel hizmet"}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.primary + "08", borderRadius: 16, padding: 18 }}>
            <View>
              <Text style={{ fontSize: 13, color: colors.muted }}>Başlangıç Fiyatı</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.primary, marginTop: 4 }}>{startingPrice}</Text>
            </View>
            <IconSymbol name="tag.fill" size={24} color={colors.primary} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
            Değerlendirmeler ({reviews.length})
          </Text>
          {reviewsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : reviewsQuery.error ? (
            <Pressable onPress={() => reviewsQuery.refetch()} style={{ padding: 16, borderRadius: 16, backgroundColor: colors.card }}>
              <Text style={{ color: colors.error, textAlign: "center" }}>Değerlendirmeler yüklenemedi. Yeniden dene.</Text>
            </Pressable>
          ) : reviews.length === 0 ? (
            <View style={{ padding: 20, borderRadius: 16, backgroundColor: colors.card, alignItems: "center" }}>
              <IconSymbol name="star.fill" size={24} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 8 }}>Henüz doğrulanmış değerlendirme yok.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {reviews.map((review) => (
                <View key={review.id} style={{ backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 0.5, borderColor: colors.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <View style={{ flexDirection: "row" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <IconSymbol key={star} name="star.fill" size={14} color={star <= review.rating ? "#FFB800" : colors.border} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 8, fontWeight: "600" }}>{review.reviewerName || "Move&Fix kullanıcısı"}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={{ fontSize: 11, color: colors.muted }}>{formatReviewDate(review.createdAt)}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>{review.comment || "Puanlama bırakıldı."}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", padding: 16, paddingBottom: 30, backgroundColor: colors.background, borderTopWidth: 0.5, borderTopColor: colors.border, gap: 12 }}>
        <Pressable
          onPress={() =>
            Alert.alert(
              "Mesajlaşma hizmete özeldir",
              "Güvenli mesajlaşma, profesyonel bir hizmet talebinize atandıktan sonra açılır.",
              [
                { text: "Vazgeç", style: "cancel" },
                {
                  text: "Talep Oluştur",
                  onPress: () =>
                    router.push(
                      `/create-service?providerId=${provider.id}&categoryId=${provider.categoryId ?? ""}` as never,
                    ),
                },
              ],
            )
          }
          style={({ pressed }) => ({ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 15 }}>Mesaj Gönder</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/create-service?providerId=${provider.id}&categoryId=${provider.categoryId ?? ""}` as never)}
          style={({ pressed }) => ({ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 15 }}>Teklif İste</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
