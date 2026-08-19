import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ProviderBottomNav } from "@/components/provider-bottom-nav";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { formatMoney } from "@/lib/i18n-core";
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
  courier: { icon: "shippingbox.fill", color: "#22C55E" },
  tow_truck: { icon: "car.fill", color: "#EF4444" },
  towing: { icon: "car.fill", color: "#EF4444" },
  roadside: { icon: "wrench.adjustable.fill", color: "#8A5CFF" },
  appliance: { icon: "refrigerator.fill", color: "#6366F1" },
};

export default function ProviderOpportunitiesScreen() {
  const colors = useColors();
  const { t, language } = useTranslation();
  const { height: viewportHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(() => {
    const parsed = Number(params.requestId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const [price, setPrice] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [message, setMessage] = useState("");

  const profileQuery = trpc.provider.myProfile.useQuery();
  const jobsQuery = trpc.provider.newJobs.useQuery();
  const categoriesQuery = trpc.categories.list.useQuery();
  const opportunities = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const categoryById = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((category) => [category.id, category])),
    [categoriesQuery.data],
  );
  const selectedOpportunity = useMemo(
    () => opportunities.find((item) => item.id === selectedRequestId) ?? null,
    [opportunities, selectedRequestId],
  );

  const createOffer = trpc.offers.create.useMutation({
    onSuccess: async () => {
      Alert.alert(t("opportunities.offerSentTitle"), t("opportunities.offerSentBody"));
      setSelectedRequestId(null);
      setPrice("");
      setEstimatedTime("");
      setMessage("");
      await jobsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert(t("opportunities.offerFailedTitle"), error.message || t("opportunities.retry"));
    },
  });

  const submitOffer = () => {
    const amount = Number(price.replace(",", "."));

    if (!selectedOpportunity || !profileQuery.data?.id) {
      Alert.alert(t("opportunities.profileRequiredTitle"), t("opportunities.profileRequiredBody"));
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert(t("opportunities.invalidAmountTitle"), t("opportunities.invalidAmountBody"));
      return;
    }
    if (!estimatedTime.trim()) {
      Alert.alert(t("opportunities.durationRequiredTitle"), t("opportunities.durationRequiredBody"));
      return;
    }

    createOffer.mutate({
      requestId: selectedOpportunity.id,
      price: Math.round(amount),
      estimatedTime: estimatedTime.trim(),
      message: message.trim() || undefined,
    });
  };

  if (jobsQuery.isLoading || profileQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.muted, fontSize: 14 }}>{t("opportunities.loading")}</Text>
      </ScreenContainer>
    );
  }

  if (jobsQuery.isError || profileQuery.isError || categoriesQuery.isError) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center px-8">
        <IconSymbol name="wifi.exclamationmark" size={42} color={colors.error} />
        <Text style={{ marginTop: 16, color: colors.foreground, fontSize: 18, fontWeight: "700", textAlign: "center" }}>{t("opportunities.errorTitle")}</Text>
        <Text style={{ marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: "center" }}>
          {t("opportunities.errorBody")}
        </Text>
        <Pressable
          onPress={() => {
            profileQuery.refetch();
            jobsQuery.refetch();
            categoriesQuery.refetch();
          }}
          style={({ pressed }) => ({
            marginTop: 18,
            borderRadius: 12,
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 12,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>{t("opportunities.retry")}</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

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
      <View
        style={{
          height: 54,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ color: colors.foreground, fontSize: 18, lineHeight: 24, fontWeight: "700" }}>{t("opportunities.title")}</Text>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={opportunities}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 18, flexGrow: opportunities.length ? undefined : 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
            <IconSymbol name="briefcase.fill" size={44} color={colors.muted} />
            <Text style={{ marginTop: 16, color: colors.foreground, fontSize: 18, fontWeight: "700", textAlign: "center" }}>{t("opportunities.emptyTitle")}</Text>
            <Text style={{ marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: "center" }}>
              {t("opportunities.emptyBody")}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedRequestId === item.id;
          const category = categoryById.get(item.categoryId);
          const categoryMeta = CATEGORY_META[category?.slug ?? ""] ?? {
            icon: "briefcase.fill",
            color: colors.primary,
          };
          return (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 14,
                borderWidth: isSelected ? 1.5 : 0.5,
                borderColor: isSelected ? colors.primary : colors.border,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: `${categoryMeta.color}18`,
                  }}
                >
                  <IconSymbol name={categoryMeta.icon as any} size={20} color={categoryMeta.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 19, fontWeight: "700" }} numberOfLines={2}>{item.title}</Text>
                  <Text style={{ marginTop: 2, color: colors.muted, fontSize: 11 }} numberOfLines={1}>
                    {category?.name || t("opportunities.serviceFallback")}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <IconSymbol name="location.fill" size={13} color={colors.muted} />
                    <Text style={{ flex: 1, marginLeft: 4, color: colors.muted, fontSize: 12, lineHeight: 17 }} numberOfLines={1}>
                      {item.address || t("opportunities.locationMissing")}
                    </Text>
                    {item.distanceKm ? (
                      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>{item.distanceKm} km</Text>
                    ) : null}
                  </View>
                </View>
              </View>

              {item.description ? (
                <Text style={{ marginTop: 12, color: colors.muted, fontSize: 12, lineHeight: 20 }} numberOfLines={2}>{item.description}</Text>
              ) : null}

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{t("opportunities.customerBudget")}</Text>
                  <Text style={{ marginTop: 4, color: colors.foreground, fontSize: 16, fontWeight: "800" }}>
                    {item.budgetMin || item.budgetMax
                      ? `${formatMoney(item.budgetMin ?? 0, language)} – ${formatMoney(item.budgetMax ?? item.budgetMin ?? 0, language)}`
                      : t("opportunities.openForOffer")}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedRequestId(isSelected ? null : item.id)}
                  style={({ pressed }) => ({
                    borderRadius: 12,
                    backgroundColor: isSelected ? `${colors.primary}18` : colors.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    opacity: pressed ? 0.82 : 1,
                  })}
                >
                  <Text style={{ color: isSelected ? colors.primary : "#FFFFFF", fontWeight: "700" }}>
                    {isSelected ? t("opportunities.close") : t("opportunities.makeOffer")}
                  </Text>
                </Pressable>
              </View>

              {isSelected ? (
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: colors.border }}>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholder={t("opportunities.pricePlaceholder")}
                    placeholderTextColor={colors.muted}
                    style={{
                      minHeight: 48,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      paddingHorizontal: 14,
                    }}
                  />
                  <TextInput
                    value={estimatedTime}
                    onChangeText={setEstimatedTime}
                    placeholder={t("opportunities.estimatedTimePlaceholder")}
                    placeholderTextColor={colors.muted}
                    style={{
                      minHeight: 48,
                      marginTop: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      paddingHorizontal: 14,
                    }}
                  />
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder={t("opportunities.messagePlaceholder")}
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={500}
                    style={{
                      minHeight: 82,
                      marginTop: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      padding: 14,
                      textAlignVertical: "top",
                    }}
                  />
                  <Pressable
                    disabled={createOffer.isPending}
                    onPress={submitOffer}
                    style={({ pressed }) => ({
                      minHeight: 48,
                      marginTop: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.primary,
                      opacity: createOffer.isPending ? 0.55 : pressed ? 0.85 : 1,
                    })}
                  >
                    {createOffer.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{t("opportunities.sendOffer")}</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
      />
      <ProviderBottomNav active="opportunities" />
      </View>
    </ScreenContainer>
  );
}
