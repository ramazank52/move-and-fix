import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JobTrackingMap } from "@/components/job-tracking-map";
import type { TrackingCoordinate } from "@/components/job-tracking-map.types";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { readUriAsBase64 } from "@/lib/file-to-base64";
import { useTranslation } from "@/lib/i18n";
import { formatMoney, localeForLanguage, type Language, type TranslationKey, type TranslationValues } from "@/lib/i18n-core";
import { trpc } from "@/lib/trpc";

type LifecycleStatus =
  | "scheduled"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

type PendingCompletionMedia = {
  id: string;
  uri: string;
  originalName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif" | "video/mp4" | "video/quicktime";
  kind: "image" | "video";
  sizeBytes?: number;
};

const COMPLETION_MEDIA_LIMIT = 4;
const MAX_COMPLETION_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_COMPLETION_VIDEO_BYTES = 25 * 1024 * 1024;
const ALLOWED_COMPLETION_MIME_TYPES = new Set<PendingCompletionMedia["mimeType"]>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
]);

function resolveCompletionMime(asset: ImagePicker.ImagePickerAsset): PendingCompletionMedia["mimeType"] | null {
  if (asset.mimeType && ALLOWED_COMPLETION_MIME_TYPES.has(asset.mimeType as PendingCompletionMedia["mimeType"])) {
    return asset.mimeType as PendingCompletionMedia["mimeType"];
  }
  if (asset.type === "video") return "video/mp4";
  return "image/jpeg";
}

const TIMELINE: readonly {
  status: Exclude<LifecycleStatus, "cancelled">;
  labelKey: TranslationKey;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { status: "scheduled", labelKey: "tracking.timeline.scheduled", icon: "event-available" },
  { status: "on_the_way", labelKey: "tracking.timeline.onTheWay", icon: "directions-car" },
  { status: "arrived", labelKey: "tracking.timeline.arrived", icon: "location-on" },
  { status: "in_progress", labelKey: "tracking.timeline.inProgress", icon: "handyman" },
  { status: "completed", labelKey: "tracking.timeline.completed", icon: "check-circle" },
];

const NEXT_ACTION: Partial<
  Record<LifecycleStatus, { status: LifecycleStatus; labelKey: TranslationKey; icon: keyof typeof MaterialIcons.glyphMap }>
> = {
  scheduled: { status: "on_the_way", labelKey: "tracking.action.depart", icon: "directions-car" },
  on_the_way: { status: "arrived", labelKey: "tracking.action.arrived", icon: "location-on" },
  arrived: { status: "in_progress", labelKey: "tracking.action.start", icon: "play-arrow" },
  in_progress: { status: "completed", labelKey: "tracking.action.complete", icon: "check" },
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

type Translate = (key: TranslationKey, values?: TranslationValues) => string;

function getStatusCopy(t: Translate, status: LifecycleStatus, etaMinutes: number | null) {
  switch (status) {
    case "scheduled":
      return { title: t("tracking.status.scheduledTitle"), subtitle: t("tracking.status.scheduledSubtitle"), color: "#8B5CF6" };
    case "on_the_way":
      return {
        title: t("tracking.status.onTheWayTitle"),
        subtitle: etaMinutes == null ? t("tracking.status.onTheWaySubtitle") : t("tracking.status.etaSubtitle", { minutes: etaMinutes }),
        color: "#3B82F6",
      };
    case "arrived":
      return { title: t("tracking.status.arrivedTitle"), subtitle: t("tracking.status.arrivedSubtitle"), color: "#22C55E" };
    case "in_progress":
      return { title: t("tracking.status.inProgressTitle"), subtitle: t("tracking.status.inProgressSubtitle"), color: "#F59E0B" };
    case "completed":
      return { title: t("tracking.status.completedTitle"), subtitle: t("tracking.status.completedSubtitle"), color: "#22C55E" };
    case "cancelled":
      return { title: t("tracking.status.cancelledTitle"), subtitle: t("tracking.status.cancelledSubtitle"), color: "#EF4444" };
  }
}

function formatPrice(amount: string | number | null | undefined, language: Language) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return formatMoney(value, language);
}

function formatUpdatedAt(value: Date | string | null | undefined, language: Language, t: Translate) {
  if (!value) return t("tracking.noLocation");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("tracking.locationUnknown");
  return t("tracking.lastUpdated", { time: date.toLocaleTimeString(localeForLanguage(language), { hour: "2-digit", minute: "2-digit" }) });
}

function parseAiAnalysisFlags(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function formatAiConfidence(value: string | number | null | undefined) {
  const confidence = Number(value);
  return Number.isFinite(confidence) && confidence >= 0 && confidence <= 1
    ? `%${Math.round(confidence * 100)}`
    : null;
}

export default function LiveTrackingScreen() {
  const colors = useColors();
  const { t, language } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = Number(params.requestId);
  const hasValidRequestId = Number.isInteger(requestId) && requestId > 0;
  const utils = trpc.useUtils();
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [proofSummary, setProofSummary] = useState("");
  const [pendingProofMedia, setPendingProofMedia] = useState<PendingCompletionMedia[]>([]);
  const [isDisputeComposerOpen, setIsDisputeComposerOpen] = useState(false);
  const [disputeDescription, setDisputeDescription] = useState("");
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
  const completionQuery = trpc.completion.workflow.useQuery(
    { requestId },
    { enabled: hasValidRequestId, refetchInterval: 15_000, retry: 1 },
  );
  const refreshCompletion = async () => {
    await Promise.all([
      utils.completion.workflow.invalidate({ requestId }),
      utils.tracking.get.invalidate({ requestId }),
      completionQuery.refetch(),
      trackingQuery.refetch(),
    ]);
  };
  const submitProof = trpc.completion.submitProof.useMutation({
    onSuccess: async () => {
      setProofSummary("");
      setPendingProofMedia([]);
      await refreshCompletion();
    },
  });
  const approveCompletion = trpc.completion.approve.useMutation({ onSuccess: refreshCompletion });
  const openDispute = trpc.completion.dispute.useMutation({
    onSuccess: async () => {
      setDisputeDescription("");
      setIsDisputeComposerOpen(false);
      await refreshCompletion();
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
  const statusInfo = getStatusCopy(t, lifecycleStatus, tracking?.etaMinutes ?? null);
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

  const handlePickProofMedia = async () => {
    const remaining = COMPLETION_MEDIA_LIMIT - pendingProofMedia.length;
    if (remaining <= 0) {
      Alert.alert("Kanıt medya sınırı", `En fazla ${COMPLETION_MEDIA_LIMIT} fotoğraf veya video ekleyebilirsiniz.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Galeri izni gerekli", "İş kanıtı eklemek için galeri erişimine izin vermelisiniz.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (result.canceled) return;

    const rejected: string[] = [];
    const accepted = result.assets.slice(0, remaining).flatMap((asset, index) => {
      const mimeType = resolveCompletionMime(asset);
      const kind = asset.type === "video" ? "video" : "image";
      const maxBytes = kind === "video" ? MAX_COMPLETION_VIDEO_BYTES : MAX_COMPLETION_IMAGE_BYTES;
      if (!mimeType || (asset.fileSize != null && asset.fileSize > maxBytes)) {
        rejected.push(asset.fileName ?? `Dosya ${index + 1}`);
        return [];
      }
      return [{
        id: `${Date.now()}-${index}-${asset.assetId ?? "local"}`,
        uri: asset.uri,
        originalName: asset.fileName ?? `iş-kaniti-${Date.now()}-${index}.${kind === "video" ? "mp4" : "jpg"}`,
        mimeType,
        kind,
        sizeBytes: asset.fileSize,
      } satisfies PendingCompletionMedia];
    });
    setPendingProofMedia((current) => [...current, ...accepted].slice(0, COMPLETION_MEDIA_LIMIT));
    if (rejected.length > 0) {
      Alert.alert("Bazı dosyalar eklenmedi", "Desteklenmeyen türde veya izin verilen boyuttan büyük medya seçildi.");
    }
  };

  const handleSubmitProof = async () => {
    if (proofSummary.trim().length < 10) {
      Alert.alert("Açıklama gerekli", "Yapılan işi en az 10 karakterle açıklayın.");
      return;
    }
    if (pendingProofMedia.length === 0) {
      Alert.alert("Kanıt gerekli", "En az bir fotoğraf veya video ekleyin.");
      return;
    }
    try {
      const media = await Promise.all(
        pendingProofMedia.map(async (item) => ({
          originalName: item.originalName,
          mimeType: item.mimeType,
          base64: await readUriAsBase64(item.uri),
        })),
      );
      await submitProof.mutateAsync({ requestId, summary: proofSummary.trim(), media });
      Alert.alert("Kanıt gönderildi", "Müşterinin 48 saat içinde onay veya itiraz yanıtı vermesi bekleniyor.");
    } catch (error) {
      Alert.alert("Kanıt gönderilemedi", error instanceof Error ? error.message : "İş kanıtı yüklenemedi.");
    }
  };

  const handleApproveCompletion = async () => {
    try {
      await approveCompletion.mutateAsync({ requestId });
      Alert.alert("İş onaylandı", "Emanet tutarı güvenli biçimde profesyonel cüzdanına aktarıldı.");
    } catch (error) {
      Alert.alert("Onay tamamlanamadı", error instanceof Error ? error.message : "İş onaylanamadı.");
    }
  };

  const handleOpenDispute = async () => {
    if (disputeDescription.trim().length < 10) {
      Alert.alert("Açıklama gerekli", "İtiraz nedeninizi en az 10 karakterle açıklayın.");
      return;
    }
    try {
      await openDispute.mutateAsync({
        requestId,
        reasonCode: "quality_issue",
        description: disputeDescription.trim(),
      });
      Alert.alert("İtiraz kaydedildi", "Emanet çözümü yönetici incelemesine gönderildi.");
    } catch (error) {
      Alert.alert("İtiraz açılamadı", error instanceof Error ? error.message : "İtiraz kaydedilemedi.");
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
              {distanceKm == null
                ? formatUpdatedAt(tracking.lastLocationAt, language, t)
                : `${distanceKm.toFixed(1)} km · ${formatUpdatedAt(tracking.lastLocationAt, language, t)}`}
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
            <Text style={[styles.priceText, { color: colors.primary }]}>{formatPrice(tracking.acceptedPrice, language)}</Text>
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
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{tracking.address || t("tracking.addressMissing")}</Text>
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
                  <Text style={[styles.timelineLabel, { color: isCurrent ? colors.foreground : colors.muted }]} numberOfLines={2}>{t(step.labelKey)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {completionQuery.data?.canProviderSubmitProof ? (
          <View style={[styles.completionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.completionTitleRow}>
              <MaterialIcons name="verified-user" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>İş Kanıtı</Text>
            </View>
            <Text style={[styles.completionHint, { color: colors.muted }]}>İşi bitirdiğinizi fotoğraf veya video ile belgeleyin. Müşterinin yanıt süresi 48 saattir.</Text>
            <Text style={[styles.aiDisclosure, { color: colors.muted }]}>Gönderdiğiniz görseller, yalnız incelemeyi desteklemek üzere MoveAI tarafından analiz edilebilir. Analiz onay veya ödeme kararı vermez.</Text>
            <TextInput
              value={proofSummary}
              onChangeText={setProofSummary}
              placeholder="Yapılan işlemi açıklayın"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
              style={[styles.completionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <Pressable onPress={handlePickProofMedia} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.primary, opacity: pressed ? 0.72 : 1 }]}> 
              <MaterialIcons name="add-photo-alternate" size={19} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Fotoğraf veya Video Ekle</Text>
            </Pressable>
            {pendingProofMedia.map((item) => (
              <View key={item.id} style={[styles.proofMediaRow, { borderColor: colors.border }]}> 
                <MaterialIcons name={item.kind === "video" ? "videocam" : "image"} size={18} color={colors.primary} />
                <Text style={[styles.proofMediaName, { color: colors.foreground }]} numberOfLines={1}>{item.originalName}</Text>
                <Pressable onPress={() => setPendingProofMedia((current) => current.filter((media) => media.id !== item.id))} hitSlop={10}>
                  <MaterialIcons name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
            ))}
            <Pressable disabled={submitProof.isPending} onPress={handleSubmitProof} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed || submitProof.isPending ? 0.72 : 1 }]}> 
              {submitProof.isPending ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="upload-file" size={20} color="#FFFFFF" />}
              <Text style={styles.primaryButtonText}>İş Kanıtını Gönder</Text>
            </Pressable>
          </View>
        ) : null}

        {completionQuery.data?.proof ? (
          <View style={[styles.completionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.completionTitleRow}>
              <MaterialIcons name={completionQuery.data.dispute ? "gavel" : "fact-check"} size={20} color={completionQuery.data.dispute ? colors.warning : colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>İş Kanıtı Durumu</Text>
            </View>
            <Text style={[styles.proofSummary, { color: colors.foreground }]}>{completionQuery.data.proof.summary}</Text>
            <Text style={[styles.completionHint, { color: colors.muted }]}> 
              {completionQuery.data.dispute
                ? "İtiraz açık. Emanet tutarı yönetici çözümünü bekliyor."
                : completionQuery.data.responseExpired
                  ? "Müşteri yanıt süresi doldu; emanet serbest bırakma işlemi sıraya alındı."
                  : completionQuery.data.canCustomerRespond
                    ? "Kanıtı inceleyip işi onaylayın veya itiraz oluşturun."
                    : "İş kanıtı kaydedildi."}
            </Text>
            {completionQuery.data.proof.aiAnalysisStatus === "completed" ? (
              <View style={[styles.aiAnalysisCard, { backgroundColor: colors.background, borderColor: colors.border }]}> 
                <View style={styles.completionTitleRow}>
                  <MaterialIcons name="auto-awesome" size={17} color={colors.primary} />
                  <Text style={[styles.aiAnalysisTitle, { color: colors.foreground }]}>MoveAI inceleme notu</Text>
                  {formatAiConfidence(completionQuery.data.proof.aiAnalysisConfidence) ? (
                    <Text style={[styles.aiConfidence, { color: colors.primary }]}>
                      Güven {formatAiConfidence(completionQuery.data.proof.aiAnalysisConfidence)}
                    </Text>
                  ) : null}
                </View>
                {completionQuery.data.proof.aiAnalysisSummary ? (
                  <Text style={[styles.aiAnalysisCopy, { color: colors.foreground }]}>{completionQuery.data.proof.aiAnalysisSummary}</Text>
                ) : null}
                {parseAiAnalysisFlags(completionQuery.data.proof.aiAnalysisFlags).map((flag) => (
                  <View key={flag} style={styles.aiFlagRow}>
                    <MaterialIcons name="info-outline" size={15} color={colors.warning} />
                    <Text style={[styles.aiFlagText, { color: colors.muted }]}>{flag}</Text>
                  </View>
                ))}
                <Text style={[styles.aiDisclosure, { color: colors.muted }]}>Bu otomatik değerlendirme yalnız karar desteğidir; müşteri onayı, itiraz veya yönetici kararı yerine geçmez.</Text>
              </View>
            ) : null}
            {completionQuery.data.canCustomerRespond ? (
              <View style={styles.completionActions}>
                <Pressable disabled={approveCompletion.isPending} onPress={handleApproveCompletion} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.success, opacity: pressed || approveCompletion.isPending ? 0.72 : 1 }]}> 
                  {approveCompletion.isPending ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />}
                  <Text style={styles.primaryButtonText}>İşi Onayla</Text>
                </Pressable>
                <Pressable onPress={() => setIsDisputeComposerOpen((open) => !open)} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.error, opacity: pressed ? 0.72 : 1 }]}> 
                  <MaterialIcons name="report-problem" size={19} color={colors.error} />
                  <Text style={[styles.secondaryButtonText, { color: colors.error }]}>İtiraz Oluştur</Text>
                </Pressable>
                {isDisputeComposerOpen ? (
                  <View style={styles.disputeComposer}>
                    <TextInput
                      value={disputeDescription}
                      onChangeText={setDisputeDescription}
                      placeholder="İtiraz nedeninizi açıklayın"
                      placeholderTextColor={colors.muted}
                      multiline
                      maxLength={2000}
                      style={[styles.completionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    />
                    <Pressable disabled={openDispute.isPending} onPress={handleOpenDispute} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.error, opacity: pressed || openDispute.isPending ? 0.72 : 1 }]}> 
                      {openDispute.isPending ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="gavel" size={20} color="#FFFFFF" />}
                      <Text style={styles.primaryButtonText}>İtirazı Gönder</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

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
                <Text style={styles.primaryButtonText}>{t(nextAction.labelKey)}</Text>
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
  aiAnalysisCard: { borderRadius: 12, borderWidth: 1, gap: 7, padding: 11 },
  aiAnalysisCopy: { fontSize: 12, lineHeight: 18 },
  aiAnalysisTitle: { flex: 1, fontSize: 12, fontWeight: "700" },
  aiConfidence: { fontSize: 10, fontWeight: "700" },
  aiDisclosure: { fontSize: 11, lineHeight: 16 },
  aiFlagRow: { alignItems: "flex-start", flexDirection: "row", gap: 6 },
  aiFlagText: { flex: 1, fontSize: 11, lineHeight: 16 },
  avatar: { alignItems: "center", borderRadius: 25, height: 50, justifyContent: "center", width: 50 },
  avatarText: { fontSize: 19, fontWeight: "800" },
  detailCard: { borderRadius: 18, borderWidth: 1, gap: 14, padding: 16 },
  detailCopy: { flex: 1 },
  detailHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 11, marginBottom: 2 },
  detailRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  detailValue: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  completionActions: { gap: 9 },
  completionCard: { borderRadius: 18, borderWidth: 1, gap: 12, padding: 16 },
  completionHint: { fontSize: 12, lineHeight: 18 },
  completionInput: { borderRadius: 12, borderWidth: 1, fontSize: 14, lineHeight: 20, minHeight: 86, padding: 12, textAlignVertical: "top" },
  completionTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  disputeComposer: { gap: 9, marginTop: 2 },
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
  proofMediaName: { flex: 1, fontSize: 12, fontWeight: "600" },
  proofMediaRow: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 9, paddingBottom: 8 },
  proofSummary: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
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
