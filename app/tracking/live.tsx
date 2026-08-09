import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JobTrackingMap } from "@/components/job-tracking-map";
import type { TrackingCoordinate } from "@/components/job-tracking-map.types";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type LifecycleStatus =
  | "scheduled"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

const TIMELINE: readonly {
  status: Exclude<LifecycleStatus, "cancelled">;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { status: "scheduled", label: "Planlandı", icon: "event-available" },
  { status: "on_the_way", label: "Yolda", icon: "directions-car" },
  { status: "arrived", label: "Ulaştı", icon: "location-on" },
  { status: "in_progress", label: "İş Başladı", icon: "handyman" },
  { status: "completed", label: "Tamamlandı", icon: "check-circle" },
];

const NEXT_ACTION: Partial<
  Record<LifecycleStatus, { status: LifecycleStatus; label: string; icon: keyof typeof MaterialIcons.glyphMap }>
> = {
  scheduled: { status: "on_the_way", label: "Yola Çık", icon: "directions-car" },
  on_the_way: { status: "arrived", label: "Adrese Ulaştım", icon: "location-on" },
  arrived: { status: "in_progress", label: "İşi Başlat", icon: "play-arrow" },
  in_progress: { status: "completed", label: "İşi Tamamla", icon: "check" },
};

function parseCoordinate(value: string | null | undefined) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDistanceKm(start: TrackingCoordinate | null, end: TrackingCoordinate | null) {
  if (!start || !end) return null;
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(start.latitude)) *
      Math.cos(toRadians(end.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getStatusCopy(status: LifecycleStatus, etaMinutes: number | null) {
  switch (status) {
    case "scheduled":
      return { title: "Planlandı", subtitle: "Profesyonel hizmet için hazırlanıyor", color: "#8B5CF6" };
    case "on_the_way":
      return {
        title: "Yolda",
        subtitle: etaMinutes == null ? "Profesyonel konumunuza geliyor" : `Tahmini varış ${etaMinutes} dakika`,
        color: "#3B82F6",
      };
    case "arrived":
      return { title: "Adrese Ulaştı", subtitle: "Profesyonel hizmet adresinde", color: "#22C55E" };
    case "in_progress":
      return { title: "Hizmet Devam Ediyor", subtitle: "İşlem profesyonel tarafından başlatıldı", color: "#F59E0B" };
    case "completed":
      return { title: "Hizmet Tamamlandı", subtitle: "Deneyiminizi değerlendirebilirsiniz", color: "#22C55E" };
    case "cancelled":
      return { title: "İş İptal Edildi", subtitle: "Bu iş için canlı takip sonlandırıldı", color: "#EF4444" };
  }
}

function formatPrice(amount: string | number | null | undefined) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

function formatUpdatedAt(value: Date | string | null | undefined) {
  if (!value) return "Henüz konum paylaşılmadı";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Güncelleme zamanı bilinmiyor";
  return `Son güncelleme ${date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function LiveTrackingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = Number(params.requestId);
  const hasValidRequestId = Number.isInteger(requestId) && requestId > 0;
  const utils = trpc.useUtils();
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const locationMutationPendingRef = useRef(false);

  const trackingQuery = trpc.tracking.get.useQuery(
    { requestId },
    {
      enabled: hasValidRequestId,
      refetchInterval: 10_000,
      retry: 1,
    },
  );
  const publishLocation = trpc.tracking.publishLocation.useMutation({
    onSuccess: () => utils.tracking.get.invalidate({ requestId }),
  });
  const updateLifecycle = trpc.tracking.updateLifecycle.useMutation({
    onSuccess: async () => {
      await utils.tracking.get.invalidate({ requestId });
      await trackingQuery.refetch();
    },
  });

  useEffect(() => {
    return () => {
      locationSubscriptionRef.current?.remove();
      locationSubscriptionRef.current = null;
    };
  }, []);

  const tracking = trackingQuery.data;
  const lifecycleStatus = (tracking?.lifecycleStatus ?? "scheduled") as LifecycleStatus;
  const statusInfo = getStatusCopy(lifecycleStatus, tracking?.etaMinutes ?? null);
  const providerCoordinate = useMemo<TrackingCoordinate | null>(() => {
    const latitude = parseCoordinate(tracking?.providerLatitude);
    const longitude = parseCoordinate(tracking?.providerLongitude);
    return latitude == null || longitude == null ? null : { latitude, longitude };
  }, [tracking?.providerLatitude, tracking?.providerLongitude]);
  const customerCoordinate = useMemo<TrackingCoordinate | null>(() => {
    const latitude = parseCoordinate(tracking?.customerLatitude);
    const longitude = parseCoordinate(tracking?.customerLongitude);
    return latitude == null || longitude == null ? null : { latitude, longitude };
  }, [tracking?.customerLatitude, tracking?.customerLongitude]);
  const distanceKm = useMemo(
    () => getDistanceKm(providerCoordinate, customerCoordinate),
    [customerCoordinate, providerCoordinate],
  );

  const stopLocationSharing = () => {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    setIsSharingLocation(false);
  };

  const startLocationSharing = async () => {
    if (tracking?.viewerRole !== "provider") return;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Konum izni gerekli",
          "Canlı takip için yalnızca iş aktifken ön planda konum izni vermelisiniz.",
        );
        return;
      }

      stopLocationSharing();
      setIsSharingLocation(true);
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 15,
          timeInterval: 10_000,
        },
        async (position) => {
          if (locationMutationPendingRef.current) return;
          locationMutationPendingRef.current = true;
          try {
            await publishLocation.mutateAsync({
              requestId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy ?? undefined,
            });
          } catch (error) {
            stopLocationSharing();
            Alert.alert(
              "Konum paylaşılamadı",
              error instanceof Error ? error.message : "Canlı konum güncellenemedi.",
            );
          } finally {
            locationMutationPendingRef.current = false;
          }
        },
      );
    } catch (error) {
      stopLocationSharing();
      Alert.alert(
        "Konum başlatılamadı",
        error instanceof Error ? error.message : "Cihaz konum servisine erişilemedi.",
      );
    }
  };

  const handleLifecycleAction = async () => {
    const action = NEXT_ACTION[lifecycleStatus];
    if (!action) return;
    try {
      await updateLifecycle.mutateAsync({ requestId, status: action.status });
      if (action.status === "completed") stopLocationSharing();
    } catch (error) {
      Alert.alert(
        "Durum güncellenemedi",
        error instanceof Error ? error.message : "İş durumu güncellenirken hata oluştu.",
      );
    }
  };

  const openExternalMap = async () => {
    const coordinate = providerCoordinate ?? customerCoordinate;
    if (!coordinate) {
      Alert.alert("Konum bulunamadı", "Haritada açılabilecek doğrulanmış bir koordinat henüz yok.");
      return;
    }
    const label = encodeURIComponent(tracking?.providerName || tracking?.address || "Hizmet konumu");
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?ll=${coordinate.latitude},${coordinate.longitude}&q=${label}`
        : Platform.OS === "android"
          ? `geo:${coordinate.latitude},${coordinate.longitude}?q=${coordinate.latitude},${coordinate.longitude}(${label})`
          : `https://www.openstreetmap.org/?mlat=${coordinate.latitude}&mlon=${coordinate.longitude}#map=16/${coordinate.latitude}/${coordinate.longitude}`;
    await Linking.openURL(url);
  };

  if (!hasValidRequestId) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center px-6">
        <MaterialIcons name="error-outline" size={40} color={colors.error} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Geçersiz iş bağlantısı</Text>
        <Text style={[styles.stateText, { color: colors.muted }]}>Canlı takip için geçerli bir iş numarası gerekiyor.</Text>
        <Pressable onPress={() => router.back()} style={[styles.stateButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.stateButtonText}>Geri Dön</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  if (trackingQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Aktif iş yükleniyor…</Text>
      </ScreenContainer>
    );
  }

  if (trackingQuery.isError || !tracking) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center px-6">
        <MaterialIcons name="lock-outline" size={40} color={colors.error} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Aktif iş açılamadı</Text>
        <Text style={[styles.stateText, { color: colors.muted }]}>
          {trackingQuery.error?.message || "Bu işe erişiminiz bulunmuyor veya iş artık mevcut değil."}
        </Text>
        <Pressable onPress={() => trackingQuery.refetch()} style={[styles.stateButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.stateButtonText}>Tekrar Dene</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const activeTimelineIndex = TIMELINE.findIndex((step) => step.status === lifecycleStatus);
  const providerName = tracking.providerName || "Atanmış profesyonel";
  const serviceName = tracking.categoryName || tracking.title || "Hizmet";
  const nextAction = NEXT_ACTION[lifecycleStatus];

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerAction}>
          <MaterialIcons name="chevron-left" size={26} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTextGroup}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Aktif İş</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>#{requestId}</Text>
        </View>
        <Pressable onPress={openExternalMap} hitSlop={12} style={styles.headerAction}>
          <MaterialIcons name="open-in-new" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={trackingQuery.isRefetching} onRefresh={() => trackingQuery.refetch()} tintColor={colors.primary} />
        }
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusCard, { backgroundColor: `${statusInfo.color}14`, borderColor: `${statusInfo.color}38` }]}>
          <View style={[styles.statusIcon, { backgroundColor: `${statusInfo.color}20` }]}>
            <MaterialIcons
              name={TIMELINE[Math.max(activeTimelineIndex, 0)]?.icon ?? "info"}
              size={22}
              color={statusInfo.color}
            />
          </View>
          <View style={styles.statusTextGroup}>
            <Text style={[styles.statusTitle, { color: statusInfo.color }]}>{statusInfo.title}</Text>
            <Text style={[styles.statusSubtitle, { color: colors.muted }]}>{statusInfo.subtitle}</Text>
          </View>
          {tracking.etaMinutes != null && lifecycleStatus === "on_the_way" ? (
            <View style={[styles.etaPill, { backgroundColor: colors.surface }]}>
              <Text style={[styles.etaValue, { color: colors.foreground }]}>{tracking.etaMinutes}</Text>
              <Text style={[styles.etaUnit, { color: colors.muted }]}>dk</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.mapCard, { borderColor: colors.border }]}>
          <JobTrackingMap
            providerCoordinate={providerCoordinate}
            customerCoordinate={customerCoordinate}
            providerName={providerName}
            address={tracking.address}
            primaryColor={colors.primary}
            surfaceColor={colors.surface}
            borderColor={colors.border}
            foregroundColor={colors.foreground}
            mutedColor={colors.muted}
          />
          <View style={[styles.mapMeta, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <MaterialIcons name="my-location" size={15} color={colors.primary} />
            <Text style={[styles.mapMetaText, { color: colors.muted }]}>
              {distanceKm == null ? formatUpdatedAt(tracking.lastLocationAt) : `${distanceKm.toFixed(1)} km · ${formatUpdatedAt(tracking.lastLocationAt)}`}
            </Text>
          </View>
        </View>

        <View style={[styles.providerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}1F` }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{providerName.charAt(0).toLocaleUpperCase("tr-TR")}</Text>
          </View>
          <View style={styles.providerCopy}>
            <View style={styles.providerNameRow}>
              <Text style={[styles.providerName, { color: colors.foreground }]} numberOfLines={1}>{providerName}</Text>
              {tracking.providerVerified ? <MaterialIcons name="verified" size={17} color="#3B82F6" /> : null}
            </View>
            <Text style={[styles.providerService, { color: colors.muted }]} numberOfLines={1}>{serviceName}</Text>
            <View style={styles.providerStats}>
              <MaterialIcons name="star" size={14} color="#F59E0B" />
              <Text style={[styles.providerStatText, { color: colors.foreground }]}>{Number(tracking.providerRating || 0).toFixed(1)}</Text>
              <Text style={[styles.providerStatDivider, { color: colors.border }]}>•</Text>
              <Text style={[styles.providerStatText, { color: colors.muted }]}>{tracking.providerCompletedJobs || 0} iş</Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              if (!tracking.providerUserId) {
                Alert.alert("Mesaj kullanılamıyor", "Atanmış profesyonelin kullanıcı kaydı bulunamadı.");
                return;
              }
              router.push(`/chat/${requestId}?otherUserId=${tracking.providerUserId}` as never);
            }}
            style={({ pressed }) => [styles.roundAction, { backgroundColor: `${colors.primary}18`, opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialIcons name="chat-bubble-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.detailHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Hizmet Detayı</Text>
            <Text style={[styles.priceText, { color: colors.primary }]}>{formatPrice(tracking.acceptedPrice)}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="home-repair-service" size={19} color={colors.muted} />
            <View style={styles.detailCopy}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Hizmet</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{tracking.title || serviceName}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={19} color={colors.muted} />
            <View style={styles.detailCopy}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Adres</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{tracking.address || "Adres paylaşılmadı"}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>İş Durumu</Text>
          <View style={styles.timelineRow}>
            {TIMELINE.map((step, index) => {
              const isComplete = lifecycleStatus !== "cancelled" && index <= activeTimelineIndex;
              const isCurrent = lifecycleStatus !== "cancelled" && index === activeTimelineIndex;
              return (
                <View key={step.status} style={styles.timelineStep}>
                  <View style={styles.timelineVisualRow}>
                    {index > 0 ? <View style={[styles.timelineLine, { backgroundColor: isComplete ? colors.primary : colors.border }]} /> : <View style={styles.timelineLinePlaceholder} />}
                    <View style={[styles.timelineDot, { backgroundColor: isComplete ? colors.primary : colors.background, borderColor: isComplete ? colors.primary : colors.border }]}>
                      <MaterialIcons name={isComplete ? "check" : step.icon} size={isCurrent ? 15 : 13} color={isComplete ? "#FFFFFF" : colors.muted} />
                    </View>
                  </View>
                  <Text style={[styles.timelineLabel, { color: isCurrent ? colors.foreground : colors.muted }]} numberOfLines={2}>{step.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {tracking.viewerRole === "provider" ? (
          <View style={styles.providerActions}>
            {lifecycleStatus !== "completed" && lifecycleStatus !== "cancelled" ? (
              <Pressable
                onPress={isSharingLocation ? stopLocationSharing : startLocationSharing}
                style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}
              >
                <MaterialIcons name={isSharingLocation ? "location-disabled" : "share-location"} size={19} color={colors.primary} />
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  {isSharingLocation ? "Konum Paylaşımını Durdur" : "Canlı Konumu Paylaş"}
                </Text>
              </Pressable>
            ) : null}
            {nextAction ? (
              <Pressable
                disabled={updateLifecycle.isPending}
                onPress={handleLifecycleAction}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed || updateLifecycle.isPending ? 0.72 : 1 }]}
              >
                {updateLifecycle.isPending ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name={nextAction.icon} size={20} color="#FFFFFF" />}
                <Text style={styles.primaryButtonText}>{nextAction.label}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : lifecycleStatus === "completed" && tracking.assignedProviderId ? (
          <Pressable
            onPress={() => router.push(`/review/create?requestId=${requestId}&providerId=${tracking.assignedProviderId}&providerName=${encodeURIComponent(providerName)}&jobTitle=${encodeURIComponent(serviceName)}` as never)}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}
          >
            <MaterialIcons name="star-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Hizmeti Değerlendir</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", borderRadius: 25, height: 50, justifyContent: "center", width: 50 },
  avatarText: { fontSize: 19, fontWeight: "800" },
  detailCard: { borderRadius: 18, borderWidth: 1, gap: 14, padding: 16 },
  detailCopy: { flex: 1 },
  detailHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 11, marginBottom: 2 },
  detailRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  detailValue: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  etaPill: { alignItems: "center", borderRadius: 12, minWidth: 48, paddingHorizontal: 9, paddingVertical: 7 },
  etaUnit: { fontSize: 9, fontWeight: "600" },
  etaValue: { fontSize: 17, fontWeight: "800", lineHeight: 19 },
  header: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", minHeight: 54, paddingHorizontal: 14 },
  headerAction: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  headerSubtitle: { fontSize: 10, marginTop: 1 },
  headerTextGroup: { alignItems: "center", flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  loadingText: { fontSize: 13, marginTop: 12 },
  mapCard: { borderRadius: 20, borderWidth: 1, height: 272, overflow: "hidden", position: "relative" },
  mapMeta: { alignItems: "center", borderRadius: 12, borderWidth: 1, bottom: 12, flexDirection: "row", gap: 6, left: 12, paddingHorizontal: 10, paddingVertical: 7, position: "absolute" },
  mapMetaText: { fontSize: 10, fontWeight: "600" },
  priceText: { fontSize: 17, fontWeight: "800" },
  primaryButton: { alignItems: "center", borderRadius: 15, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 16 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  providerActions: { gap: 10 },
  providerCard: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", padding: 14 },
  providerCopy: { flex: 1, marginLeft: 12, minWidth: 0 },
  providerName: { flexShrink: 1, fontSize: 15, fontWeight: "700" },
  providerNameRow: { alignItems: "center", flexDirection: "row", gap: 5 },
  providerService: { fontSize: 12, marginTop: 2 },
  providerStatDivider: { fontSize: 12, marginHorizontal: 3 },
  providerStatText: { fontSize: 11, fontWeight: "600" },
  providerStats: { alignItems: "center", flexDirection: "row", marginTop: 5 },
  roundAction: { alignItems: "center", borderRadius: 21, height: 42, justifyContent: "center", width: 42 },
  scrollContent: { gap: 12, paddingHorizontal: 16, paddingTop: 14 },
  secondaryButton: { alignItems: "center", borderRadius: 15, borderWidth: 1.5, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50, paddingHorizontal: 16 },
  secondaryButtonText: { fontSize: 14, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  stateButton: { borderRadius: 14, marginTop: 18, paddingHorizontal: 22, paddingVertical: 12 },
  stateButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  stateText: { fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
  stateTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  statusCard: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", padding: 14 },
  statusIcon: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  statusSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  statusTextGroup: { flex: 1, marginHorizontal: 11 },
  statusTitle: { fontSize: 15, fontWeight: "800" },
  timelineCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  timelineDot: { alignItems: "center", borderRadius: 13, borderWidth: 2, height: 26, justifyContent: "center", width: 26 },
  timelineLabel: { fontSize: 9, fontWeight: "600", lineHeight: 12, marginTop: 6, minHeight: 24, paddingHorizontal: 1, textAlign: "center" },
  timelineLine: { flex: 1, height: 2 },
  timelineLinePlaceholder: { flex: 1, height: 2 },
  timelineRow: { flexDirection: "row", marginTop: 15 },
  timelineStep: { alignItems: "center", flex: 1 },
  timelineVisualRow: { alignItems: "center", flexDirection: "row", width: "100%" },
});
