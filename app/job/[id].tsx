import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AreaMeasurementForm } from "@/components/area-measurement-form";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { VersionedAreaMeasurementDraft } from "@/shared/area-measurement";

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

function measurementRowToDraft(measurement: {
  idempotencyKey: string;
  method: "manual_rectangle" | "manual_polygon" | "ar_depth" | "ar_plane";
  unit: "m" | "cm";
  geometryJson: string;
  capabilityClass: "manual" | "ar_depth" | "ar_plane";
  qualityWarning: "estimated" | "tracking_lost" | "low_confidence" | null;
}): VersionedAreaMeasurementDraft | undefined {
  try {
    const geometry = JSON.parse(measurement.geometryJson) as { width?: number; height?: number; points?: { x: number; y: number }[]; confidence?: number | null };
    return {
      version: 1,
      idempotencyKey: measurement.idempotencyKey,
      method: measurement.method,
      unit: measurement.unit,
      width: geometry.width,
      height: geometry.height,
      points: geometry.points,
      confidence: geometry.confidence ?? undefined,
      capabilityClass: measurement.capabilityClass,
      qualityWarning: measurement.qualityWarning ?? undefined,
    };
  } catch {
    return undefined;
  }
}

export default function JobDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const requestId = Number(params.id);
  const isValidId = Number.isInteger(requestId) && requestId > 0;
  const [isMeasurementEditorOpen, setMeasurementEditorOpen] = useState(false);
  const [editedMeasurement, setEditedMeasurement] = useState<VersionedAreaMeasurementDraft | undefined>();

  const requestQuery = trpc.requests.get.useQuery(
    { id: requestId },
    { enabled: isValidId },
  );
  const offersQuery = trpc.offers.forRequest.useQuery(
    { requestId },
    { enabled: isValidId },
  );
  const isRequestOwner = requestQuery.data?.userId === user?.id;
  const measurementQuery = trpc.requests.getMeasurement.useQuery(
    { requestId },
    { enabled: isValidId && isRequestOwner },
  );
  const replaceMeasurement = trpc.requests.replaceMeasurement.useMutation({
    onSuccess: async () => {
      setMeasurementEditorOpen(false);
      setEditedMeasurement(undefined);
      await utils.requests.getMeasurement.invalidate({ requestId });
    },
    onError: (error) => Alert.alert("Alan ölçümü güncellenemedi", error.message || "Lütfen manuel ölçümü gözden geçirip tekrar deneyin."),
  });
  const deleteMeasurement = trpc.requests.deleteMeasurement.useMutation({
    onSuccess: async () => {
      setMeasurementEditorOpen(false);
      setEditedMeasurement(undefined);
      await utils.requests.getMeasurement.invalidate({ requestId });
    },
    onError: (error) => Alert.alert("Alan ölçümü silinemedi", error.message || "Lütfen tekrar deneyin."),
  });
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
  const rejectOffer = trpc.offers.reject.useMutation({
    onSuccess: async () => {
      await utils.offers.forRequest.invalidate({ requestId });
    },
    onError: (error) => Alert.alert("Teklif Reddedilemedi", error.message || "Lütfen yeniden deneyin."),
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

  const confirmReject = (offerId: number, providerName: string) => {
    Alert.alert(
      "Teklifi Reddet",
      `${providerName} adlı profesyonelin teklifini reddetmek istiyor musunuz?`,
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Reddet", style: "destructive", onPress: () => rejectOffer.mutate({ offerId }) },
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
        <Text className="ml-2 flex-1 text-lg font-bold text-foreground">Teklifler</Text>
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

        {isRequestOwner && request.status === "pending" ? (
          <View style={{ marginTop: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: "800" }}>Tahmini Alan Ölçümü</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>Teklif veya fiyat kararı değildir; işi tarif etmek için tahmini bilgidir.</Text>
              </View>
              {measurementQuery.isLoading ? <ActivityIndicator color={colors.primary} size="small" /> : null}
            </View>
            {measurementQuery.data ? (
              <View style={{ marginTop: 12, borderRadius: 12, backgroundColor: `${colors.primary}12`, padding: 12 }}>
                <Text style={{ color: colors.primary, fontWeight: "800" }}>{(measurementQuery.data.areaSquareCentimeters / 10_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} m²</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{measurementQuery.data.method === "manual_polygon" ? "Manuel çokgen" : "Manuel dikdörtgen"}</Text>
              </View>
            ) : !measurementQuery.isLoading && !measurementQuery.isError ? (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>Bu talep için henüz tahmini alan ölçümü eklenmedi.</Text>
            ) : null}
            {measurementQuery.isError ? <Text style={{ color: colors.error, fontSize: 12, marginTop: 12 }}>Alan ölçümü şu anda alınamadı. Lütfen tekrar deneyin.</Text> : null}
            {isMeasurementEditorOpen ? (
              <View style={{ marginTop: 12, gap: 10 }}>
                <AreaMeasurementForm value={measurementQuery.data ? measurementRowToDraft(measurementQuery.data) : undefined} onChange={setEditedMeasurement} />
                <Pressable
                  disabled={!editedMeasurement || replaceMeasurement.isPending}
                  onPress={() => editedMeasurement && replaceMeasurement.mutate({ requestId, measurement: editedMeasurement })}
                  style={({ pressed }) => ({ borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: !editedMeasurement || replaceMeasurement.isPending ? colors.muted : colors.primary, opacity: pressed ? 0.8 : 1 })}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{replaceMeasurement.isPending ? "Kaydediliyor…" : "Ölçümü Kaydet"}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Pressable onPress={() => setMeasurementEditorOpen(true)} style={({ pressed }) => ({ flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: "center", borderWidth: 1, borderColor: colors.primary, opacity: pressed ? 0.75 : 1 })}>
                  <Text style={{ color: colors.primary, fontWeight: "800" }}>{measurementQuery.data ? "Düzenle / Yeniden Ölç" : "Tahmini Ölçüm Ekle"}</Text>
                </Pressable>
                {measurementQuery.data ? (
                  <Pressable
                    disabled={deleteMeasurement.isPending}
                    onPress={() => Alert.alert("Ölçümü Sil", "Bu tahmini alan ölçümü silinsin mi?", [{ text: "Vazgeç", style: "cancel" }, { text: "Sil", style: "destructive", onPress: () => deleteMeasurement.mutate({ requestId }) }])}
                    style={({ pressed }) => ({ borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, alignItems: "center", borderWidth: 1, borderColor: colors.error, opacity: pressed ? 0.75 : 1 })}
                  >
                    <Text style={{ color: colors.error, fontWeight: "800" }}>Sil</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        ) : null}

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
            <Pressable
              onPress={() => router.push(`/expenses/${request.id}` as any)}
              style={({ pressed }) => ({ marginTop: 10, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>İş masraflarını görüntüle</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/job-capsule/${request.id}` as any)}
              style={({ pressed }) => ({ marginTop: 10, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.primary, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: colors.primary, fontWeight: "800" }}>Job Capsule’ı Görüntüle</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hasar veya claim bildir"
              onPress={() => router.push(`/claims/new?requestId=${request.id}` as any)}
              style={({ pressed }) => ({ marginTop: 10, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.warning, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: colors.warning, fontWeight: "800" }}>Hasar / Claim Bildir</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ marginBottom: 12, marginTop: 26, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text className="text-lg font-extrabold text-foreground">Gelen Teklifler</Text>
            <Text className="mt-1 text-xs font-semibold text-muted">{offers.length} profesyonel yanıt verdi</Text>
          </View>
          {offers.length > 1 ? (
            <Pressable
              onPress={() => router.push(`/compare-providers?requestId=${requestId}` as any)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.primary,
                paddingHorizontal: 10,
                paddingVertical: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <IconSymbol name="sparkles" size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800", marginLeft: 5 }}>Karşılaştır</Text>
            </Pressable>
          ) : null}
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
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: `${offerColor}15` }}>
                    <Text style={{ color: offerColor, fontSize: 17, fontWeight: "800" }}>{offer.providerName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 20, fontWeight: "800", flexShrink: 1 }} numberOfLines={1}>{offer.providerName}</Text>
                      {offer.providerVerified ? <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} style={{ marginLeft: 5 }} /> : null}
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 3 }}>
                      ★ {displayRating(offer.providerRating)} · {offer.providerReviewCount ?? 0} yorum · {offer.providerCompletedJobs ?? 0} iş
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                    <Text style={{ color: colors.foreground, fontSize: 17, lineHeight: 22, fontWeight: "900" }}>₺{offer.price.toLocaleString("tr-TR")}</Text>
                    <Text style={{ marginTop: 3, fontSize: 10, fontWeight: "700", color: offerColor }}>{offer.status === "accepted" ? "KABUL EDİLDİ" : offer.status === "rejected" ? "REDDEDİLDİ" : "BEKLİYOR"}</Text>
                  </View>
                </View>
                {offer.estimatedTime ? <Text className="mt-3 text-sm font-semibold text-foreground">Tahmini süre: {offer.estimatedTime}</Text> : null}
                {offer.message ? <Text className="mt-2 text-sm leading-5 text-muted">{offer.message}</Text> : null}
                {request.status === "pending" && offer.status === "pending" ? (
                  <View style={{ flexDirection: "row", gap: 9, marginTop: 14 }}>
                    <Pressable
                      disabled={acceptOffer.isPending || rejectOffer.isPending}
                      onPress={() => confirmReject(offer.id, offer.providerName)}
                      style={({ pressed }) => ({
                        flex: 0.42,
                        minHeight: 44,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: colors.border,
                        opacity: acceptOffer.isPending || rejectOffer.isPending ? 0.5 : pressed ? 0.72 : 1,
                      })}
                    >
                      <Text style={{ color: colors.muted, fontWeight: "800" }}>Reddet</Text>
                    </Pressable>
                    <Pressable
                      disabled={acceptOffer.isPending || rejectOffer.isPending}
                      onPress={() => confirmOffer(offer.id, offer.providerName, offer.price)}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 44,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.primary,
                        opacity: acceptOffer.isPending || rejectOffer.isPending ? 0.55 : pressed ? 0.82 : 1,
                      })}
                    >
                      {acceptOffer.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-bold text-white">Teklifi Kabul Et</Text>}
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
