import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const STATUS_LABELS: Record<string, string> = {
  pending: "Teklif Bekliyor",
  active: "Aktif İş",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

function displayRating(value: number | null) {
  if (value == null || value <= 0) return "Yeni";
  return (value > 5 ? value / 10 : value).toFixed(1);
}

export default function JobDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const requestId = Number(params.id);
  const isValidId = Number.isInteger(requestId) && requestId > 0;

  const requestQuery = trpc.requests.get.useQuery(
    { id: requestId },
    { enabled: isValidId },
  );
  const offersQuery = trpc.offers.forRequest.useQuery(
    { requestId },
    { enabled: isValidId },
  );
  const acceptOffer = trpc.offers.accept.useMutation({
    onSuccess: async (_, variables) => {
      const accepted = offersQuery.data?.find((offer) => offer.id === variables.offerId);
      await Promise.all([
        utils.requests.get.invalidate({ id: requestId }),
        utils.requests.list.invalidate(),
        utils.offers.forRequest.invalidate({ requestId }),
      ]);
      if (accepted) {
        router.push(
          `/payment/checkout?requestId=${requestId}&providerId=${accepted.providerId}&amount=${accepted.price}&title=${encodeURIComponent(requestQuery.data?.title ?? "Hizmet Ödemesi")}` as any,
        );
      }
    },
    onError: (error) => Alert.alert("Teklif Kabul Edilemedi", error.message || "Lütfen yeniden deneyin."),
  });

  const confirmOffer = (offerId: number, providerName: string, price: number) => {
    Alert.alert(
      "Teklifi Kabul Et",
      `${providerName} adlı profesyonelin ₺${price.toLocaleString("tr-TR")} tutarındaki teklifini kabul etmek istiyor musunuz?`,
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Kabul Et", onPress: () => acceptOffer.mutate({ offerId }) },
      ],
    );
  };

  if (!isValidId) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center px-8">
        <IconSymbol name="exclamationmark.triangle.fill" size={42} color={colors.error} />
        <Text className="mt-4 text-center text-lg font-bold text-foreground">Geçersiz iş bağlantısı</Text>
        <Pressable onPress={() => router.replace("/(tabs)/my-jobs" as any)} style={({ pressed }) => ({ marginTop: 18, borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 12, opacity: pressed ? 0.8 : 1 })}>
          <Text className="font-bold text-white">İşlerime Dön</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  if (requestQuery.isLoading || offersQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-3 text-sm text-muted">İş ve teklifler yükleniyor…</Text>
      </ScreenContainer>
    );
  }

  if (requestQuery.isError || offersQuery.isError || !requestQuery.data) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center px-8">
        <IconSymbol name="wifi.exclamationmark" size={42} color={colors.error} />
        <Text className="mt-4 text-center text-lg font-bold text-foreground">İş bilgileri alınamadı</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted">
          Kayıt bulunmamış veya bu işe erişim yetkiniz olmayabilir.
        </Text>
        <Pressable
          onPress={() => Promise.all([requestQuery.refetch(), offersQuery.refetch()])}
          style={({ pressed }) => ({ marginTop: 18, borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 12, opacity: pressed ? 0.8 : 1 })}
        >
          <Text className="font-bold text-white">Yeniden Dene</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const request = requestQuery.data;
  const offers = offersQuery.data ?? [];
  const acceptedOffer = offers.find((offer) => offer.status === "accepted") ?? null;
  const statusColor = request.status === "active" ? colors.success : request.status === "pending" ? colors.warning : request.status === "completed" ? colors.primary : colors.error;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={{ height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Geri dön" style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.55 : 1 })}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text className="ml-2 flex-1 text-lg font-bold text-foreground">İş ve Teklifler</Text>
        <View style={{ borderRadius: 9, backgroundColor: `${statusColor}18`, paddingHorizontal: 9, paddingVertical: 5 }}>
          <Text style={{ color: statusColor, fontSize: 11, fontWeight: "700" }}>{STATUS_LABELS[request.status]}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View style={{ borderRadius: 20, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border, padding: 18 }}>
          <Text className="text-xl font-extrabold text-foreground">{request.title}</Text>
          {request.description ? <Text className="mt-2 text-sm leading-5 text-muted">{request.description}</Text> : null}
          <View className="mt-4 flex-row items-center">
            <IconSymbol name="location.fill" size={16} color={colors.muted} />
            <Text className="ml-2 flex-1 text-sm text-muted">{request.address || "Konum bilgisi paylaşılmadı"}</Text>
          </View>
          <View className="mt-3 flex-row items-center">
            <IconSymbol name="clock.fill" size={16} color={colors.muted} />
            <Text className="ml-2 text-sm text-muted">
              {new Date(request.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>
          {request.budgetMin != null || request.budgetMax != null ? (
            <View className="mt-3 flex-row items-center">
              <IconSymbol name="dollarsign.circle.fill" size={16} color={colors.muted} />
              <Text className="ml-2 text-sm font-semibold text-foreground">
                {request.budgetMin != null ? `₺${request.budgetMin.toLocaleString("tr-TR")}` : "—"} – {request.budgetMax != null ? `₺${request.budgetMax.toLocaleString("tr-TR")}` : "—"}
              </Text>
            </View>
          ) : null}
        </View>

        {request.status === "active" && acceptedOffer ? (
          <View style={{ marginTop: 18, borderRadius: 20, backgroundColor: `${colors.success}0D`, borderWidth: 1, borderColor: `${colors.success}30`, padding: 18 }}>
            <View className="flex-row items-center">
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: `${colors.success}18`, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: colors.success, fontSize: 18, fontWeight: "800" }}>{acceptedOffer.providerName.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="text-base font-bold text-foreground">{acceptedOffer.providerName}</Text>
                  {acceptedOffer.providerVerified ? <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} style={{ marginLeft: 5 }} /> : null}
                </View>
                <Text className="mt-1 text-xs text-muted">Kabul edilen teklif · ₺{acceptedOffer.price.toLocaleString("tr-TR")}</Text>
              </View>
            </View>
            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <Pressable
                onPress={() => router.push(`/chat/${request.id}?otherUserId=${acceptedOffer.providerUserId}` as any)}
                style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.primary, opacity: pressed ? 0.75 : 1 })}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Mesaj</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/tracking/live?requestId=${request.id}&providerId=${acceptedOffer.providerUserId}&providerName=${encodeURIComponent(acceptedOffer.providerName)}&service=${encodeURIComponent(request.title)}` as any)}
                style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 })}
              >
                <Text className="font-bold text-white">Canlı Takip</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View className="mb-3 mt-7 flex-row items-center justify-between">
          <Text className="text-lg font-extrabold text-foreground">Teklifler</Text>
          <Text className="text-xs font-semibold text-muted">{offers.length} teklif</Text>
        </View>

        {offers.length === 0 ? (
          <View style={{ alignItems: "center", borderRadius: 18, borderWidth: 0.5, borderColor: colors.border, padding: 26 }}>
            <IconSymbol name="text.bubble.fill" size={34} color={colors.muted} />
            <Text className="mt-3 text-center font-bold text-foreground">Henüz teklif gelmedi</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">Uygun profesyoneller talebinizi incelediğinde teklifler burada görünecek.</Text>
          </View>
        ) : (
          offers.map((offer) => {
            const offerColor = offer.status === "accepted" ? colors.success : offer.status === "rejected" ? colors.error : colors.primary;
            return (
              <View key={offer.id} style={{ marginBottom: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 0.5, borderColor: offer.status === "accepted" ? `${colors.success}60` : colors.border, padding: 16 }}>
                <View className="flex-row items-center">
                  <View style={{ width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: `${offerColor}15` }}>
                    <Text style={{ color: offerColor, fontSize: 17, fontWeight: "800" }}>{offer.providerName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-base font-bold text-foreground">{offer.providerName}</Text>
                      {offer.providerVerified ? <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} style={{ marginLeft: 5 }} /> : null}
                    </View>
                    <Text className="mt-1 text-xs text-muted">★ {displayRating(offer.providerRating)} · {offer.providerCompletedJobs ?? 0} tamamlanan iş</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-extrabold text-foreground">₺{offer.price.toLocaleString("tr-TR")}</Text>
                    <Text style={{ marginTop: 3, fontSize: 10, fontWeight: "700", color: offerColor }}>{offer.status === "accepted" ? "KABUL EDİLDİ" : offer.status === "rejected" ? "REDDEDİLDİ" : "BEKLİYOR"}</Text>
                  </View>
                </View>
                {offer.estimatedTime ? <Text className="mt-3 text-sm font-semibold text-foreground">Tahmini süre: {offer.estimatedTime}</Text> : null}
                {offer.message ? <Text className="mt-2 text-sm leading-5 text-muted">{offer.message}</Text> : null}
                {request.status === "pending" && offer.status === "pending" ? (
                  <Pressable
                    disabled={acceptOffer.isPending}
                    onPress={() => confirmOffer(offer.id, offer.providerName, offer.price)}
                    style={({ pressed }) => ({ marginTop: 14, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, opacity: acceptOffer.isPending ? 0.55 : pressed ? 0.82 : 1 })}
                  >
                    {acceptOffer.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-bold text-white">Teklifi Kabul Et</Text>}
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
