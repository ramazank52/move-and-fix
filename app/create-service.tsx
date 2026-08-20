import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { File } from "expo-file-system";
import { ScreenContainer } from "@/components/screen-container";
import { RequestRouteMap } from "@/components/request-route-map";
import type { RequestRouteCoordinate } from "@/components/request-route-map.types";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/lib/i18n";

type ServiceType =
  | "generic"
  | "painting"
  | "electrical"
  | "plumbing"
  | "cleaning"
  | "moving"
  | "courier"
  | "tow_truck"
  | "roadside";

type RequestAttributeValue = string | number | boolean | null;

type AllowedRequestMediaMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif"
  | "video/mp4"
  | "video/quicktime";

type PendingMedia = {
  id: string;
  uri: string;
  originalName: string;
  mimeType?: AllowedRequestMediaMime;
  kind: "image" | "video";
  sizeBytes?: number;
};

const SERVICE_TYPE_BY_SLUG: Record<string, ServiceType> = {
  painting: "painting",
  electrical: "electrical",
  plumbing: "plumbing",
  cleaning: "cleaning",
  moving: "moving",
  courier: "courier",
  towing: "tow_truck",
  tow_truck: "tow_truck",
  roadside: "roadside",
};

const ROUTE_SERVICE_TYPES = new Set<ServiceType>(["moving", "courier", "tow_truck"]);
const REQUEST_MEDIA_LIMIT = 8;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, AllowedRequestMediaMime> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

function isAllowedRequestMediaMime(value: string): value is AllowedRequestMediaMime {
  return Object.values(MIME_BY_EXTENSION).includes(value as AllowedRequestMediaMime);
}

function resolveMediaMime(asset: ImagePicker.ImagePickerAsset): AllowedRequestMediaMime | undefined {
  if (asset.mimeType && isAllowedRequestMediaMime(asset.mimeType)) return asset.mimeType;
  const extension = (asset.fileName ?? asset.uri).split("?")[0]?.split(".").pop()?.toLowerCase();
  return extension ? MIME_BY_EXTENSION[extension] : undefined;
}

function parseOptionalInteger(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function calculateStraightLineDistanceKm(
  pickup: RequestRouteCoordinate,
  destination: RequestRouteCoordinate,
): number {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.latitude - pickup.latitude);
  const longitudeDelta = toRadians(destination.longitude - pickup.longitude);
  const pickupLatitude = toRadians(pickup.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(pickupLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

async function readUriAsBase64(uri: string): Promise<string> {
  if (Platform.OS !== "web") return new File(uri).base64();
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Seçilen medya okunamadı");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return globalThis.btoa(binary);
}

const STEP_KEYS = ["request.step.service", "request.step.details", "request.step.time", "request.step.location", "request.step.confirm"] as const;
const URGENCY_OPTIONS = [
  { id: "emergency", labelKey: "request.urgency.emergency", icon: "bolt.fill", color: "#EF4444" },
  { id: "today", labelKey: "request.urgency.today", icon: "clock.fill", color: "#F59E0B" },
  { id: "scheduled", labelKey: "request.urgency.scheduled", icon: "calendar", color: "#10B981" },
] as const;

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

export default function CreateServiceScreen() {
  const colors = useColors();
  const router = useRouter();
  const { language, t, isRTL, formatMoney } = useTranslation();
  const { height: viewportHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{ categoryId?: string; categoryLabel?: string }>();

  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState(() => {
    const parsed = Number(params.categoryId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<string>("today");
  const [address, setAddress] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>();
  const [latitude, setLatitude] = useState<string | undefined>();
  const [longitude, setLongitude] = useState<string | undefined>();
  const [isLocating, setIsLocating] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [pickupFloor, setPickupFloor] = useState("");
  const [destinationFloor, setDestinationFloor] = useState("");
  const [pickupHasElevator, setPickupHasElevator] = useState(false);
  const [destinationHasElevator, setDestinationHasElevator] = useState(false);
  const [distanceKm, setDistanceKm] = useState("");
  const [pickupCoordinate, setPickupCoordinate] = useState<RequestRouteCoordinate | null>(null);
  const [destinationCoordinate, setDestinationCoordinate] = useState<RequestRouteCoordinate | null>(null);
  const [isResolvingRoute, setIsResolvingRoute] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, RequestAttributeValue>>({});
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const categoriesQuery = trpc.categories.list.useQuery();
  const countryRegistryQuery = trpc.countryRegistry.list.useQuery(undefined, { refetchOnMount: true });
  const categories = useMemo<NonNullable<typeof categoriesQuery.data>>(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const countryOptions = countryRegistryQuery.data ?? [];
  const serviceType = selectedCategory ? (SERVICE_TYPE_BY_SLUG[selectedCategory.slug] ?? "generic") : "generic";
  const subcategoriesQuery = trpc.categories.subcategories.useQuery(
    { categoryId },
    { enabled: categoryId > 0 },
  );
  const subcategories = subcategoriesQuery.data ?? [];

  const updateAttribute = useCallback((key: string, value: RequestAttributeValue) => {
    setAttributes((current) => ({ ...current, [key]: value }));
  }, []);

  useEffect(() => {
    const routeCategory = params.categoryId?.trim();
    if (!routeCategory || categoryId > 0 || categories.length === 0) return;
    const match = categories.find(
      (category) => category.slug === routeCategory || String(category.id) === routeCategory,
    );
    if (match) setCategoryId(match.id);
  }, [categories, categoryId, params.categoryId]);

  useEffect(() => {
    setSubcategoryId(undefined);
    setAttributes({});
  }, [categoryId]);

  const uploadMediaMutation = trpc.requests.uploadMedia.useMutation();
  const priceEstimateMutation = trpc.priceIntelligence.estimate.useMutation();
  const priceEstimate = priceEstimateMutation.data;
  const priceEstimateRange =
    priceEstimate?.status === "available"
    && typeof priceEstimate.lowAmount === "number"
    && typeof priceEstimate.highAmount === "number"
      ? { lowAmount: priceEstimate.lowAmount, highAmount: priceEstimate.highAmount }
      : null;
  const priceEstimateLocale = language === "en" || language === "ru" ? language : "tr";
  const formatTryAmount = useCallback((amount: number) => formatMoney(amount), [formatMoney]);

  const handleUseCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(t("request.locationPermissionTitle"), t("request.locationPermissionBody"));
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextLatitude = current.coords.latitude.toFixed(7);
      const nextLongitude = current.coords.longitude.toFixed(7);
      setLatitude(nextLatitude);
      setLongitude(nextLongitude);
      if (ROUTE_SERVICE_TYPES.has(serviceType)) {
        setPickupCoordinate({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      }

      if (!address.trim()) {
        try {
          const places = await Location.reverseGeocodeAsync(current.coords);
          const place = places[0];
          const formatted = place
            ? [place.street, place.streetNumber, place.district, place.city].filter(Boolean).join(", ")
            : "";
          if (formatted) {
            if (ROUTE_SERVICE_TYPES.has(serviceType) && !pickupAddress.trim()) setPickupAddress(formatted);
            else if (!address.trim()) setAddress(formatted);
          }
        } catch {
          // Coordinates remain usable even if reverse geocoding is unavailable.
        }
      }
    } catch (error) {
      Alert.alert(t("request.locationUnavailableTitle"), error instanceof Error ? error.message : t("request.locationUnavailableBody"));
    } finally {
      setIsLocating(false);
    }
  }, [address, pickupAddress, serviceType, t]);

  const handleResolveRoute = useCallback(async () => {
    if (pickupAddress.trim().length < 3 || destinationAddress.trim().length < 3) {
      Alert.alert(t("request.routeAddressMissingTitle"), t("request.routeAddressMissingBody"));
      return;
    }

    setIsResolvingRoute(true);
    try {
      const [pickupResults, destinationResults] = await Promise.all([
        Location.geocodeAsync(pickupAddress.trim()),
        Location.geocodeAsync(destinationAddress.trim()),
      ]);
      const pickup = pickupResults[0];
      const destination = destinationResults[0];
      if (!pickup || !destination) {
        throw new Error(t("request.routeNotFoundBody"));
      }

      const nextPickup = { latitude: pickup.latitude, longitude: pickup.longitude };
      const nextDestination = { latitude: destination.latitude, longitude: destination.longitude };
      setPickupCoordinate(nextPickup);
      setDestinationCoordinate(nextDestination);
      setLatitude(pickup.latitude.toFixed(7));
      setLongitude(pickup.longitude.toFixed(7));
      setDistanceKm(String(Math.max(1, Math.round(calculateStraightLineDistanceKm(nextPickup, nextDestination)))));
    } catch (error) {
      Alert.alert(
        t("request.routeUnavailableTitle"),
        error instanceof Error ? error.message : t("request.routeUnavailableBody"),
      );
    } finally {
      setIsResolvingRoute(false);
    }
  }, [destinationAddress, pickupAddress, t]);

  const handlePickMedia = useCallback(async () => {
    const remaining = REQUEST_MEDIA_LIMIT - pendingMedia.length;
    if (remaining <= 0) {
      Alert.alert(t("request.mediaLimitTitle"), t("request.mediaLimitBody", { limit: REQUEST_MEDIA_LIMIT }));
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("request.galleryPermissionTitle"), t("request.galleryPermissionBody"));
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

    const accepted: PendingMedia[] = [];
    const rejected: string[] = [];
    result.assets.slice(0, remaining).forEach((asset, index) => {
      const mimeType = resolveMediaMime(asset);
      const kind = asset.type === "video" ? "video" : "image";
      const maxBytes = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (!mimeType || (asset.fileSize != null && asset.fileSize > maxBytes)) {
        rejected.push(asset.fileName ?? `Dosya ${index + 1}`);
        return;
      }
      accepted.push({
        id: `${Date.now()}-${index}-${asset.assetId ?? "local"}`,
        uri: asset.uri,
        originalName: asset.fileName ?? `talep-medya-${Date.now()}-${index}.${kind === "video" ? "mp4" : "jpg"}`,
        mimeType,
        kind,
        sizeBytes: asset.fileSize,
      });
    });
    setPendingMedia((current) => [...current, ...accepted].slice(0, REQUEST_MEDIA_LIMIT));
    if (rejected.length > 0) {
      Alert.alert(t("request.mediaRejectedTitle"), t("request.mediaRejectedBody"));
    }
  }, [pendingMedia.length, t]);

  const createRequestMutation = trpc.requests.create.useMutation({
    onSuccess: async (requestId) => {
      let failedUploads = 0;
      for (const media of pendingMedia) {
        if (!media.mimeType) {
          failedUploads += 1;
          continue;
        }
        try {
          const base64 = await readUriAsBase64(media.uri);
          await uploadMediaMutation.mutateAsync({
            requestId,
            originalName: media.originalName,
            mimeType: media.mimeType,
            base64,
          });
        } catch {
          failedUploads += 1;
        }
      }

      const message = failedUploads > 0
        ? t("request.submitPartialUploadBody", { count: failedUploads })
        : t("request.submitSuccessBody");
      Alert.alert(t("request.submitSuccessTitle"), message, [
        { text: t("request.ok"), onPress: () => router.replace("/(tabs)/my-jobs" as never) },
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t("request.submitErrorTitle"),
        error.message || t("request.submitErrorBody"),
        [{ text: t("request.ok") }],
      );
    },
  });

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return categoryId > 0;
      case 1: return title.trim().length >= 3;
      case 2: return urgency.length > 0;
      case 3:
        return countryCode !== null && (ROUTE_SERVICE_TYPES.has(serviceType)
          ? pickupAddress.trim().length >= 3 && destinationAddress.trim().length >= 3
          : address.trim().length >= 5);
      case 4: return true;
      default: return false;
    }
  }, [step, categoryId, title, urgency, address, pickupAddress, destinationAddress, serviceType, countryCode]);

  const handleSubmit = () => {
    if (!countryCode) {
      Alert.alert(t("request.countryRequiredTitle"), t("request.countryRequiredBody"));
      return;
    }
    const normalizedAttributes = Object.fromEntries(
      Object.entries({ ...attributes, urgency }).filter(([, value]) => value !== "" && value != null),
    );
    createRequestMutation.mutate({
      categoryId,
      countryCode,
      title: title.trim(),
      description: description.trim() || undefined,
      address: ROUTE_SERVICE_TYPES.has(serviceType)
        ? pickupAddress.trim()
        : address.trim() || undefined,
      latitude,
      longitude,
      budgetMin: parseOptionalInteger(budgetMin),
      budgetMax: parseOptionalInteger(budgetMax),
      distanceKm: parseOptionalInteger(distanceKm),
      details: {
        subcategoryId,
        serviceType,
        pickupAddress: ROUTE_SERVICE_TYPES.has(serviceType) ? pickupAddress.trim() : undefined,
        destinationAddress: ROUTE_SERVICE_TYPES.has(serviceType) ? destinationAddress.trim() : undefined,
        pickupLatitude: ROUTE_SERVICE_TYPES.has(serviceType) && pickupCoordinate
          ? pickupCoordinate.latitude.toFixed(7)
          : undefined,
        pickupLongitude: ROUTE_SERVICE_TYPES.has(serviceType) && pickupCoordinate
          ? pickupCoordinate.longitude.toFixed(7)
          : undefined,
        destinationLatitude: ROUTE_SERVICE_TYPES.has(serviceType) && destinationCoordinate
          ? destinationCoordinate.latitude.toFixed(7)
          : undefined,
        destinationLongitude: ROUTE_SERVICE_TYPES.has(serviceType) && destinationCoordinate
          ? destinationCoordinate.longitude.toFixed(7)
          : undefined,
        pickupFloor: serviceType === "moving" ? parseOptionalInteger(pickupFloor) : undefined,
        destinationFloor: serviceType === "moving" ? parseOptionalInteger(destinationFloor) : undefined,
        pickupHasElevator: serviceType === "moving" ? pickupHasElevator : undefined,
        destinationHasElevator: serviceType === "moving" ? destinationHasElevator : undefined,
        distanceKm: parseOptionalInteger(distanceKm),
        attributes: normalizedAttributes,
      },
    });
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-background"
      safeAreaClassName="flex-1 bg-background"
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={{
          flex: 1,
          minHeight: Platform.OS === "web" ? viewportHeight : undefined,
          backgroundColor: colors.background,
        }}
      >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={handleBack}
          style={{ padding: 4 }}
          accessibilityRole="button"
          accessibilityLabel={t("request.backAccessibility")}
        >
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: colors.foreground }}>
          {t("request.title")}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Step Indicator */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {STEP_KEYS.map((labelKey, i) => (
            <View key={labelKey} style={{ flex: 1, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: i <= step ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: i <= step ? colors.primary : colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: i <= step ? "#FFF" : colors.muted,
                  }}
                >
                  {i + 1}
                </Text>
              </View>
              {i < STEP_KEYS.length - 1 && (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: i < step ? colors.primary : colors.border,
                    marginHorizontal: 4,
                  }}
                />
              )}
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, textAlign: "center", marginTop: 8 }}>
          {t("request.step", { step: step + 1, label: t(STEP_KEYS[step]) })}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 112 }}
      >
        {/* Step 0: Hizmet Seç */}
        {step === 0 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              {t("request.chooseService")}
            </Text>
            {categoriesQuery.isLoading ? (
              <View style={{ minHeight: 160, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ marginTop: 10, color: colors.muted, fontSize: 13 }}>{t("request.servicesLoading")}</Text>
              </View>
            ) : categoriesQuery.isError ? (
              <View style={{ minHeight: 160, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
                <IconSymbol name="wifi.exclamationmark" size={32} color={colors.error} />
                <Text style={{ marginTop: 10, color: colors.foreground, fontWeight: "700" }}>{t("request.servicesFailed")}</Text>
                <Pressable
                  onPress={() => categoriesQuery.refetch()}
                  style={({ pressed }) => ({
                    marginTop: 12,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{t("request.retry")}</Text>
                </Pressable>
              </View>
            ) : params.categoryId && selectedCategory ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.primary + "10",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.primary + "30",
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: (selectedCategory.color || CATEGORY_META[selectedCategory.slug]?.color || colors.primary) + "18",
                  }}
                >
                  <IconSymbol
                    name={(CATEGORY_META[selectedCategory.slug]?.icon || "briefcase.fill") as any}
                    size={21}
                    color={selectedCategory.color || CATEGORY_META[selectedCategory.slug]?.color || colors.primary}
                  />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary, marginLeft: 10 }}>
                  {selectedCategory.name}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {categories.map((category) => {
                  const meta = CATEGORY_META[category.slug] ?? { icon: "briefcase.fill", color: colors.primary };
                  const categoryColor = category.color || meta.color;
                  const selected = categoryId === category.id;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setCategoryId(category.id)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: selected ? colors.primary + "10" : colors.card,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1.5,
                        borderColor: selected ? colors.primary : colors.border,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 11,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: categoryColor + "18",
                        }}
                      >
                        <IconSymbol name={meta.icon as any} size={20} color={categoryColor} />
                      </View>
                      <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                        {category.name}
                      </Text>
                      {selected ? <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {categoryId > 0 ? (
              <View style={{ marginTop: 18 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>
                  {t("request.subcategory")}
                </Text>
                {subcategoriesQuery.isLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ alignSelf: "flex-start" }} />
                ) : subcategoriesQuery.isError ? (
                  <Pressable
                    onPress={() => subcategoriesQuery.refetch()}
                    style={({ pressed }) => ({
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.error + "55",
                      backgroundColor: colors.error + "10",
                      padding: 12,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text style={{ color: colors.error, fontWeight: "700" }}>{t("request.subcategoriesFailed")}</Text>
                  </Pressable>
                ) : subcategories.length > 0 ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {subcategories.map((subcategory) => {
                      const selected = subcategoryId === subcategory.id;
                      return (
                        <Pressable
                          key={subcategory.id}
                          onPress={() => setSubcategoryId(selected ? undefined : subcategory.id)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 13,
                            paddingVertical: 9,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primary + "16" : colors.card,
                            opacity: pressed ? 0.78 : 1,
                          })}
                        >
                          <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 13, fontWeight: "700" }}>
                            {subcategory.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={{ color: colors.muted, fontSize: 13, textAlign: isRTL ? "right" : "left" }}>{t("request.noSubcategory")}</Text>
                )}
              </View>
            ) : null}
          </View>
        )}

        {/* Step 1: Detay */}
        {step === 1 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              {t("request.details.heading")}
            </Text>
            <View style={{ gap: 14 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6, textAlign: isRTL ? "right" : "left" }}>{t("request.details.title")}</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t("request.details.titlePlaceholder")}
                  placeholderTextColor={colors.muted}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: colors.foreground,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                  }}
                />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6, textAlign: isRTL ? "right" : "left" }}>{t("request.details.description")}</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("request.details.descriptionPlaceholder")}
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: colors.foreground,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                    textAlignVertical: "top",
                    minHeight: 100,
                  }}
                />
              </View>

              {serviceType === "painting" ? (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.foreground, textAlign: isRTL ? "right" : "left" }}>{t("request.details.painting")}</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.details.area")}</Text>
                      <TextInput
                        value={attributes.areaSqm == null ? "" : String(attributes.areaSqm)}
                        onChangeText={(value) => updateAttribute("areaSqm", parseOptionalInteger(value) ?? null)}
                        placeholder={t("request.details.areaPlaceholder")}
                        placeholderTextColor={colors.muted}
                        keyboardType="numeric"
                        style={{ backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.details.roomCount")}</Text>
                      <TextInput
                        value={attributes.roomCount == null ? "" : String(attributes.roomCount)}
                        onChangeText={(value) => updateAttribute("roomCount", parseOptionalInteger(value) ?? null)}
                        placeholder={t("request.details.roomPlaceholder")}
                        placeholderTextColor={colors.muted}
                        keyboardType="numeric"
                        style={{ backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }}
                      />
                    </View>
                  </View>
                  <Pressable
                    onPress={() => updateAttribute("paintIncluded", attributes.paintIncluded !== true)}
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: colors.border, opacity: pressed ? 0.82 : 1 })}
                  >
                    <Text style={{ color: colors.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{t("request.details.paintIncluded")}</Text>
                    <IconSymbol name={attributes.paintIncluded === true ? "checkmark.circle.fill" : "circle"} size={21} color={attributes.paintIncluded === true ? colors.primary : colors.muted} />
                  </Pressable>
                </View>
              ) : null}

              {serviceType === "electrical" || serviceType === "plumbing" ? (
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.foreground, marginBottom: 9 }}>
                    {serviceType === "electrical" ? t("request.details.electrical") : t("request.details.plumbing")}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {(serviceType === "electrical"
                      ? [
                        { value: "Arıza", labelKey: "request.option.electricalFault" },
                        { value: "Montaj", labelKey: "request.option.installation" },
                        { value: "Tesisat", labelKey: "request.option.electricalWiring" },
                        { value: "Sigorta / Pano", labelKey: "request.option.fusePanel" },
                      ]
                      : [
                        { value: "Su Kaçağı", labelKey: "request.option.waterLeak" },
                        { value: "Tıkanıklık", labelKey: "request.option.blockage" },
                        { value: "Montaj", labelKey: "request.option.installation" },
                        { value: "Tesisat Yenileme", labelKey: "request.option.plumbingRenewal" },
                      ]
                    ).map((option) => {
                      const selected = attributes.issueType === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => updateAttribute("issueType", option.value)}
                          style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + "16" : colors.card, opacity: pressed ? 0.8 : 1 })}
                        >
                          <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 13, fontWeight: "700" }}>{t(option.labelKey as `request.${string}`)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {serviceType === "cleaning" ? (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.foreground, textAlign: isRTL ? "right" : "left" }}>{t("request.details.cleaning")}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { value: "Ev", labelKey: "request.option.home" },
                      { value: "Ofis", labelKey: "request.option.office" },
                      { value: "İnşaat Sonrası", labelKey: "request.option.postConstruction" },
                      { value: "Boş Daire", labelKey: "request.option.emptyApartment" },
                    ].map((option) => {
                      const selected = attributes.placeType === option.value;
                      return (
                        <Pressable key={option.value} onPress={() => updateAttribute("placeType", option.value)} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + "16" : colors.card, opacity: pressed ? 0.8 : 1 })}>
                          <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 13, fontWeight: "700" }}>{t(option.labelKey as `request.${string}`)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput
                    value={attributes.roomCount == null ? "" : String(attributes.roomCount)}
                    onChangeText={(value) => updateAttribute("roomCount", parseOptionalInteger(value) ?? null)}
                    placeholder={t("request.details.cleaningRoomPlaceholder")}
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    style={{ backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }}
                  />
                </View>
              ) : null}

              {serviceType === "moving" ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.foreground, textAlign: isRTL ? "right" : "left" }}>{t("request.details.moving")}</Text>
                  <TextInput
                    value={typeof attributes.inventorySummary === "string" ? attributes.inventorySummary : ""}
                    onChangeText={(value) => updateAttribute("inventorySummary", value)}
                    placeholder={t("request.details.movingPlaceholder")}
                    placeholderTextColor={colors.muted}
                    multiline
                    style={{ minHeight: 82, textAlignVertical: "top", backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }}
                  />
                  <Pressable onPress={() => updateAttribute("packingAssistance", attributes.packingAssistance !== true)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: colors.border, opacity: pressed ? 0.82 : 1 })}>
                    <Text style={{ color: colors.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{t("request.details.packing")}</Text>
                    <IconSymbol name={attributes.packingAssistance === true ? "checkmark.circle.fill" : "circle"} size={21} color={attributes.packingAssistance === true ? colors.primary : colors.muted} />
                  </Pressable>
                </View>
              ) : null}

              {serviceType === "courier" ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.foreground, textAlign: isRTL ? "right" : "left" }}>{t("request.details.courier")}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { value: "Evrak", labelKey: "request.option.document" },
                      { value: "Küçük Paket", labelKey: "request.option.smallPackage" },
                      { value: "Koli", labelKey: "request.option.box" },
                      { value: "Hassas Ürün", labelKey: "request.option.fragile" },
                    ].map((option) => {
                      const selected = attributes.parcelType === option.value;
                      return (
                        <Pressable key={option.value} onPress={() => updateAttribute("parcelType", option.value)} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + "16" : colors.card, opacity: pressed ? 0.8 : 1 })}>
                          <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 13, fontWeight: "700" }}>{t(option.labelKey as `request.${string}`)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput
                    value={attributes.weightKg == null ? "" : String(attributes.weightKg)}
                    onChangeText={(value) => updateAttribute("weightKg", Number(value.replace(",", ".")) || null)}
                    placeholder={t("request.details.weightPlaceholder")}
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    style={{ backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }}
                  />
                </View>
              ) : null}

              {serviceType === "tow_truck" || serviceType === "roadside" ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.foreground }}>
                    {serviceType === "tow_truck" ? t("request.details.towTruck") : t("request.details.roadside")}
                  </Text>
                  <TextInput
                    value={typeof attributes.vehicle === "string" ? attributes.vehicle : ""}
                    onChangeText={(value) => updateAttribute("vehicle", value)}
                    placeholder={t("request.details.vehiclePlaceholder")}
                    placeholderTextColor={colors.muted}
                    style={{ backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }}
                  />
                  <TextInput
                    value={typeof attributes.problem === "string" ? attributes.problem : ""}
                    onChangeText={(value) => updateAttribute("problem", value)}
                    placeholder={t("request.details.problemPlaceholder")}
                    placeholderTextColor={colors.muted}
                    style={{ backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }}
                  />
                </View>
              ) : null}

              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: colors.foreground, textAlign: isRTL ? "right" : "left" }}>{t("request.media.title")}</Text>
                    <Text style={{ marginTop: 3, fontSize: 12, lineHeight: 17, color: colors.muted }}>
                      {t("request.media.hint", { limit: REQUEST_MEDIA_LIMIT })}
                    </Text>
                  </View>
                  <Pressable onPress={handlePickMedia} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.primary + "16", opacity: pressed ? 0.78 : 1 })}>
                    <IconSymbol name="photo.fill" size={18} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>{t("request.media.add")}</Text>
                  </Pressable>
                </View>
                {pendingMedia.map((media) => (
                  <View key={media.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, padding: 11, borderWidth: 0.5, borderColor: colors.border }}>
                    <IconSymbol name={media.kind === "video" ? "play.circle.fill" : "photo.fill"} size={20} color={colors.primary} />
                    <Text numberOfLines={1} style={{ flex: 1, marginHorizontal: 9, color: colors.foreground, fontSize: 13, fontWeight: "600" }}>{media.originalName}</Text>
                    <Pressable onPress={() => setPendingMedia((current) => current.filter((item) => item.id !== media.id))} style={{ padding: 4 }}>
                      <IconSymbol name="trash.fill" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.budget.min")}</Text>
                  <TextInput
                    value={budgetMin}
                    onChangeText={setBudgetMin}
                    placeholder={t("request.budget.zero")}
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 15,
                      color: colors.foreground,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.budget.max")}</Text>
                  <TextInput
                    value={budgetMax}
                    onChangeText={setBudgetMax}
                    placeholder={t("request.budget.zero")}
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 15,
                      color: colors.foreground,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                    }}
                  />
                </View>
              </View>

              <View
                style={{
                  backgroundColor: colors.primary + "0D",
                  borderWidth: 1,
                  borderColor: colors.primary + "35",
                  borderRadius: 16,
                  padding: 14,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 11,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.primary + "1C",
                    }}
                  >
                    <IconSymbol name={"sparkles" as any} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "800" }}>
                      {t("request.priceEstimate.title")}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }}>
                      {t("request.priceEstimate.description")}
                    </Text>
                  </View>
                </View>

                {priceEstimate ? (
                  <View
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                      padding: 12,
                      gap: 7,
                    }}
                  >
                    {priceEstimateRange ? (
                      <>
                        <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "800" }}>
                          {formatTryAmount(priceEstimateRange.lowAmount)} – {formatTryAmount(priceEstimateRange.highAmount)}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
                          {t("request.priceEstimate.sampleDescription", { count: priceEstimate.sampleSize })}
                        </Text>
                        {priceEstimate.narrative?.status === "available" && priceEstimate.narrative.summary ? (
                          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
                            {priceEstimate.narrative.summary}
                          </Text>
                        ) : null}
                        <Pressable
                          onPress={() => {
                            setBudgetMin(String(priceEstimateRange.lowAmount));
                            setBudgetMax(String(priceEstimateRange.highAmount));
                          }}
                          style={({ pressed }) => ({
                            alignSelf: "flex-start",
                            borderRadius: 10,
                            paddingHorizontal: 11,
                            paddingVertical: 8,
                            backgroundColor: colors.primary + "16",
                            opacity: pressed ? 0.78 : 1,
                          })}
                        >
                          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{t("request.priceEstimate.apply")}</Text>
                        </Pressable>
                      </>
                    ) : (
                      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
                        {t("request.priceEstimate.noData")}
                      </Text>
                    )}
                  </View>
                ) : null}

                {priceEstimateMutation.isError ? (
                  <Text style={{ color: colors.error, fontSize: 12, lineHeight: 17 }}>
                    {t("request.priceEstimate.error")}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("request.priceEstimate.accessibility")}
                  disabled={priceEstimateMutation.isPending || categoryId <= 0 || !countryCode}
                  onPress={() => priceEstimateMutation.mutate({
                    categoryId,
                    countryCode: countryCode!,
                    locale: priceEstimateLocale,
                  })}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    borderRadius: 12,
                    paddingVertical: 11,
                    backgroundColor: colors.primary,
                    opacity: pressed || priceEstimateMutation.isPending || categoryId <= 0 || !countryCode ? 0.65 : 1,
                  })}
                >
                  {priceEstimateMutation.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <IconSymbol name={"sparkles" as any} size={17} color="#FFFFFF" />}
                  <Text style={{ marginLeft: 7, color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>
                    {priceEstimateMutation.isPending ? t("request.priceEstimate.loading") : t("request.priceEstimate.show")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Zaman */}
        {step === 2 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              {t("request.time.title")}
            </Text>
            <View style={{ gap: 10 }}>
              {URGENCY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setUrgency(opt.id)}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: urgency === opt.id ? opt.color + "10" : colors.card,
                      borderRadius: 16,
                      padding: 18,
                      borderWidth: 1.5,
                      borderColor: urgency === opt.id ? opt.color : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: opt.color + "15",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol name={opt.icon as any} size={22} color={opt.color} />
                  </View>
                  <Text style={{ flex: 1, marginLeft: 14, fontSize: 16, fontWeight: "700", color: colors.foreground }}>
                    {t(opt.labelKey)}
                  </Text>
                  {urgency === opt.id && (
                    <IconSymbol name="checkmark.circle.fill" size={22} color={opt.color} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Konum */}
        {step === 3 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              {ROUTE_SERVICE_TYPES.has(serviceType) ? t("request.route.title") : t("request.location.title")}
            </Text>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.country")}</Text>
              {countryRegistryQuery.isLoading ? <View style={{ paddingVertical: 12 }}><Text style={{ color: colors.muted, fontSize: 13 }}>{t("request.countryLoading")}</Text></View> : null}
              {!countryRegistryQuery.isLoading && countryOptions.length === 0 ? <Text style={{ color: colors.error, fontSize: 13, lineHeight: 18 }}>{t("request.countryUnavailable")}</Text> : null}
              <View style={{ gap: 8 }}>
                {countryOptions.map((option) => {
                  const selected = countryCode === option.countryCode;
                  const availabilityKey = option.availability === "AVAILABLE"
                    ? "request.countryAvailable"
                    : option.availability === "COMING_SOON"
                      ? "request.countryComingSoon"
                      : "request.countryBlocked";
                  return <Pressable
                    key={option.countryCode}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled: !option.selectable }}
                    accessibilityLabel={`${option.displayName}: ${t(availabilityKey)}`}
                    disabled={!option.selectable}
                    onPress={() => setCountryCode(option.countryCode)}
                    style={({ pressed }) => ({
                      alignItems: "center", backgroundColor: selected ? colors.primary + "12" : colors.card,
                      borderColor: selected ? colors.primary : colors.border, borderRadius: 14, borderWidth: 1,
                      flexDirection: "row", justifyContent: "space-between",
                      opacity: !option.selectable ? 0.52 : pressed ? 0.8 : 1, padding: 14,
                    })}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}><Text style={{ color: colors.foreground, fontWeight: "700" }}>{option.displayName}</Text><Text style={{ color: option.selectable ? colors.success : colors.muted, fontSize: 12, marginTop: 2 }}>{t(availabilityKey)}</Text></View>
                    <IconSymbol name={selected ? "checkmark.circle.fill" : "circle"} size={21} color={selected ? colors.primary : colors.muted} />
                  </Pressable>;
                })}
              </View>
            </View>
            {ROUTE_SERVICE_TYPES.has(serviceType) ? (
              <View style={{ gap: 13 }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.route.pickup")}</Text>
                  <TextInput value={pickupAddress} onChangeText={(value) => { setPickupAddress(value); setPickupCoordinate(null); }} placeholder={t("request.route.pickupPlaceholder")} placeholderTextColor={colors.muted} multiline style={{ minHeight: 72, textAlignVertical: "top", textAlign: isRTL ? "right" : "left", backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }} />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.route.destination")}</Text>
                  <TextInput value={destinationAddress} onChangeText={(value) => { setDestinationAddress(value); setDestinationCoordinate(null); }} placeholder={t("request.route.destinationPlaceholder")} placeholderTextColor={colors.muted} multiline style={{ minHeight: 72, textAlignVertical: "top", textAlign: isRTL ? "right" : "left", backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }} />
                </View>
                <Pressable
                  onPress={handleResolveRoute}
                  disabled={isResolvingRoute}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    backgroundColor: colors.primary + "18",
                    borderColor: colors.primary + "55",
                    borderRadius: 14,
                    borderWidth: 1,
                    flexDirection: "row",
                    justifyContent: "center",
                    opacity: pressed || isResolvingRoute ? 0.7 : 1,
                    paddingVertical: 13,
                  })}
                >
                  {isResolvingRoute ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <IconSymbol name="map.fill" size={18} color={colors.primary} />
                  )}
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700", marginLeft: 8 }}>
                    {isResolvingRoute ? t("request.route.loading") : t("request.route.show")}
                  </Text>
                </Pressable>
                <View style={{ borderColor: colors.border, borderRadius: 16, borderWidth: 0.5, height: 210, overflow: "hidden" }}>
                  <RequestRouteMap
                    pickupCoordinate={pickupCoordinate}
                    destinationCoordinate={destinationCoordinate}
                    pickupLabel={pickupAddress || t("request.route.pickupFallback")}
                    destinationLabel={destinationAddress || t("request.route.destinationFallback")}
                    primaryColor={colors.primary}
                    surfaceColor={colors.card}
                    borderColor={colors.border}
                    foregroundColor={colors.foreground}
                    mutedColor={colors.muted}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.route.distance")}</Text>
                  <TextInput value={distanceKm} onChangeText={setDistanceKm} placeholder={t("request.route.distancePlaceholder")} placeholderTextColor={colors.muted} keyboardType="numeric" style={{ textAlign: isRTL ? "right" : "left", backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }} />
                  <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 }}>
                    {t("request.route.distanceHint")}
                  </Text>
                </View>
                {serviceType === "moving" ? (
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.route.pickupFloor")}</Text>
                        <TextInput value={pickupFloor} onChangeText={setPickupFloor} placeholder="0" placeholderTextColor={colors.muted} keyboardType="number-pad" style={{ backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.route.destinationFloor")}</Text>
                        <TextInput value={destinationFloor} onChangeText={setDestinationFloor} placeholder="0" placeholderTextColor={colors.muted} keyboardType="number-pad" style={{ backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border }} />
                      </View>
                    </View>
                    <Pressable onPress={() => setPickupHasElevator((value) => !value)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: colors.border, opacity: pressed ? 0.82 : 1 })}>
                      <Text style={{ color: colors.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{t("request.route.pickupElevator")}</Text>
                      <IconSymbol name={pickupHasElevator ? "checkmark.circle.fill" : "circle"} size={21} color={pickupHasElevator ? colors.primary : colors.muted} />
                    </Pressable>
                    <Pressable onPress={() => setDestinationHasElevator((value) => !value)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: colors.border, opacity: pressed ? 0.82 : 1 })}>
                      <Text style={{ color: colors.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{t("request.route.destinationElevator")}</Text>
                      <IconSymbol name={destinationHasElevator ? "checkmark.circle.fill" : "circle"} size={21} color={destinationHasElevator ? colors.primary : colors.muted} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              <View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{t("request.address")}</Text>
                <TextInput value={address} onChangeText={setAddress} placeholder={t("request.addressPlaceholder")} placeholderTextColor={colors.muted} multiline numberOfLines={3} style={{ backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.foreground, borderWidth: 0.5, borderColor: colors.border, textAlignVertical: "top", textAlign: isRTL ? "right" : "left", minHeight: 80 }} />
              </View>
            )}
            <Pressable
              onPress={handleUseCurrentLocation}
              disabled={isLocating}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderRadius: 14, paddingVertical: 14, marginTop: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primary + "50", opacity: pressed || isLocating ? 0.7 : 1 })}
            >
              {isLocating ? <ActivityIndicator color={colors.primary} size="small" /> : <IconSymbol name="location.fill" size={18} color={colors.primary} />}
              <Text style={{ marginLeft: 8, color: colors.primary, fontWeight: "600", fontSize: 14 }}>
                {isLocating ? t("request.location.loading") : latitude && longitude ? t("request.location.updated") : t("request.location.use")}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Step 4: Onay */}
        {step === 4 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              {t("request.summary.heading")}
            </Text>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                padding: 20,
                borderWidth: 0.5,
                borderColor: colors.border,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>{t("request.summary.service")}</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                  {selectedCategory?.name || t("request.summary.unselected")}
                </Text>
              </View>
              {subcategoryId ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 14, color: colors.muted }}>{t("request.summary.subcategory")}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                    {subcategories.find((item) => item.id === subcategoryId)?.name ?? "—"}
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>{t("request.summary.title")}</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, maxWidth: 200 }} numberOfLines={2}>
                  {title || "—"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>{t("request.summary.urgency")}</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                  {(() => {
                    const selectedUrgency = URGENCY_OPTIONS.find((u) => u.id === urgency);
                    return selectedUrgency ? t(selectedUrgency.labelKey) : "—";
                  })()}
                </Text>
              </View>
              {ROUTE_SERVICE_TYPES.has(serviceType) ? (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 14, color: colors.muted }}>{t("request.summary.pickup")}</Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, maxWidth: 200 }} numberOfLines={2}>{pickupAddress || "—"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 14, color: colors.muted }}>{t("request.summary.destination")}</Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, maxWidth: 200 }} numberOfLines={2}>{destinationAddress || "—"}</Text>
                  </View>
                  {distanceKm ? (
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, color: colors.muted }}>{t("request.summary.distance")}</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{distanceKm} km</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 14, color: colors.muted }}>{t("request.summary.address")}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, maxWidth: 200 }} numberOfLines={2}>{address || "—"}</Text>
                </View>
              )}
              {pendingMedia.length > 0 ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 14, color: colors.muted }}>{t("request.summary.media")}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{t("request.summary.fileCount", { count: pendingMedia.length })}</Text>
                </View>
              ) : null}
              {(budgetMin || budgetMax) && (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 14, color: colors.muted }}>{t("request.summary.budget")}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                    {budgetMin && formatTryAmount(Number(budgetMin))}
                    {budgetMin && budgetMax && " - "}
                    {budgetMax && formatTryAmount(Number(budgetMax))}
                  </Text>
                </View>
              )}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.primary + "08",
                borderRadius: 14,
                padding: 14,
                marginTop: 14,
                borderWidth: 0.5,
                borderColor: colors.primary + "20",
              }}
            >
              <IconSymbol name="info.circle.fill" size={18} color={colors.primary} />
              <Text style={{ flex: 1, marginLeft: 8, fontSize: 12, color: colors.muted, lineHeight: 18 }}>
                {t("request.summary.postSubmitInfo")}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: Platform.OS === "web" ? 20 : 34,
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          onPress={handleNext}
          disabled={!canProceed() || createRequestMutation.isPending || uploadMediaMutation.isPending}
          style={({ pressed }) => [
            {
              backgroundColor: !canProceed() || createRequestMutation.isPending || uploadMediaMutation.isPending ? colors.muted : colors.primary,
              borderRadius: 16,
              paddingVertical: 17,
              alignItems: "center",
              opacity: pressed && canProceed() ? 0.9 : 1,
            },
          ]}
        >
          {createRequestMutation.isPending || uploadMediaMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
              {step < 4 ? t("request.next") : t("request.submit")}
            </Text>
          )}
        </Pressable>
      </View>
      </View>
    </ScreenContainer>
  );
}
