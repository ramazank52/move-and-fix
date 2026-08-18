import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { ProviderBottomNav } from "@/components/provider-bottom-nav";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";

const MENU_ITEMS = [
  { labelKey: "provider.menuNewJobs", icon: "briefcase.fill", color: "#FF7A1A", route: "/provider-opportunities" },
  { labelKey: "provider.menuActiveJobs", icon: "bolt.fill", color: "#4F8CFF", route: "/provider-jobs" },
  { labelKey: "provider.menuEarnings", icon: "wallet.pass.fill", color: "#22C55E", route: "/(tabs)/wallet" },
  { labelKey: "provider.menuMessages", icon: "message.fill", color: "#31B7D8", route: "/(tabs)/messages" },
  { labelKey: "provider.menuProfile", icon: "person.fill", color: "#F45B8A", route: "/(tabs)/profile" },
] as const;

export default function ProviderDashboardScreen() {
  const colors = useColors();
  const { t, formatMoney } = useTranslation();
  const router = useRouter();
  const { height: viewportHeight } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [availabilityOverride, setAvailabilityOverride] = useState<boolean | null>(null);

  const profileQuery = trpc.providers.myProfile.useQuery(undefined, { refetchOnMount: true });
  const jobsQuery = trpc.providers.myJobs.useQuery(undefined, { refetchOnMount: true });
  const earningsQuery = trpc.providers.myEarnings.useQuery(undefined, { refetchOnMount: true });
  const opportunitiesQuery = trpc.providers.newJobs.useQuery(undefined, { refetchOnMount: true });
  const cockpitQuery = trpc.providers.businessCockpit.useQuery(undefined, { refetchOnMount: true });
  const availabilityMutation = trpc.providers.updateAvailability.useMutation();

  const profile = profileQuery.data;
  const earnings = earningsQuery.data;
  const cockpit = cockpitQuery.data;
  const opportunities = opportunitiesQuery.data ?? [];
  const activeJobs = useMemo(
    () => (jobsQuery.data ?? []).filter((job) => job.status === "active"),
    [jobsQuery.data],
  );
  const isAvailable = availabilityOverride ?? profile?.isAvailable === 1;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      profileQuery.refetch(),
      jobsQuery.refetch(),
      earningsQuery.refetch(),
      opportunitiesQuery.refetch(),
      cockpitQuery.refetch(),
    ]);
    setAvailabilityOverride(null);
    setRefreshing(false);
  }, [cockpitQuery, earningsQuery, jobsQuery, opportunitiesQuery, profileQuery]);

  const toggleAvailability = useCallback(async () => {
    if (availabilityMutation.isPending) return;
    const nextValue = !isAvailable;
    setAvailabilityOverride(nextValue);
    try {
      await availabilityMutation.mutateAsync({ isAvailable: nextValue });
      await Promise.all([profileQuery.refetch(), opportunitiesQuery.refetch()]);
      setAvailabilityOverride(null);
    } catch {
      setAvailabilityOverride(null);
      Alert.alert(t("provider.dashboardUnavailable"), t("provider.dashboardUnavailableBody"));
    }
  }, [availabilityMutation, isAvailable, opportunitiesQuery, profileQuery, t]);

  const hasError = profileQuery.isError || jobsQuery.isError || earningsQuery.isError || opportunitiesQuery.isError;
  const isLoading = profileQuery.isLoading || jobsQuery.isLoading || earningsQuery.isLoading || opportunitiesQuery.isLoading;

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
        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <ActivityIndicator size="large" color="#FF7A1A" />
            <Text style={{ color: colors.muted, fontSize: 14 }}>{t("provider.dashboardLoading")}</Text>
          </View>
        ) : hasError || !profile ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            <IconSymbol name="wifi.exclamationmark" size={36} color={colors.error} />
            <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "700", marginTop: 14 }}>
              {t("provider.dashboardUnavailable")}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 }}>
              {t("provider.dashboardUnavailableBody")}
            </Text>
            <Pressable
              onPress={onRefresh}
              style={({ pressed }) => ({
                marginTop: 18,
                backgroundColor: "#FF7A1A",
                borderRadius: 9,
                paddingHorizontal: 20,
                paddingVertical: 11,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>{t("explore.retry")}</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF7A1A" />}
          >
            <Text style={{ color: colors.foreground, fontSize: 25, lineHeight: 31, fontWeight: "800", marginBottom: 12 }}>
              {t("provider.today")}
            </Text>

            <LinearGradient
              colors={["#7A42F4", "#5526D5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 11, paddingHorizontal: 18, paddingVertical: 18, marginBottom: 12 }}
            >
              <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 18, fontWeight: "600" }}>
                {t("provider.todayEarnings")}
              </Text>
              <Text style={{ color: "#FFFFFF", fontSize: 31, lineHeight: 39, fontWeight: "800", marginTop: 3 }}>
                {formatMoney(earnings?.todayEarnings ?? 0)}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 11, lineHeight: 16, marginTop: 2 }}>
                {t("provider.totalEarnings", { amount: formatMoney(earnings?.totalEarnings ?? 0) })}
              </Text>
            </LinearGradient>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <Pressable
                onPress={() => router.push("/provider-jobs" as never)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 74,
                  borderRadius: 10,
                  padding: 13,
                  backgroundColor: colors.card,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{t("provider.activeJobs")}</Text>
                <Text style={{ color: colors.foreground, fontSize: 24, lineHeight: 30, fontWeight: "800", marginTop: 2 }}>
                  {activeJobs.length}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/provider-opportunities" as never)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 74,
                  borderRadius: 10,
                  padding: 13,
                  backgroundColor: colors.card,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{t("provider.newOffers")}</Text>
                <Text style={{ color: colors.foreground, fontSize: 24, lineHeight: 30, fontWeight: "800", marginTop: 2 }}>
                  {opportunities.length}
                </Text>
              </Pressable>
            </View>

            <View style={{ borderRadius: 10, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border, padding: 14, marginBottom: 10 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "800", marginBottom: 12 }}>{t("provider.cockpitTitle")}</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, borderRadius: 8, padding: 10, backgroundColor: `${colors.primary}0D` }}>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{t("provider.pendingPayments")}</Text>
                  <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 15, fontWeight: "800", marginTop: 4 }}>{formatMoney(cockpit?.earnings.pendingPayments ?? 0)}</Text>
                </View>
                <View style={{ flex: 1, borderRadius: 8, padding: 10, backgroundColor: `${colors.primary}0D` }}>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{t("provider.averageRating")}</Text>
                  <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 15, fontWeight: "800", marginTop: 4 }}>{cockpit?.averageRating == null ? t("provider.metricUnavailable") : cockpit.averageRating.toFixed(1)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1, borderRadius: 8, padding: 10, backgroundColor: `${colors.primary}0D` }}>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{t("provider.cancellationRate")}</Text>
                  <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 15, fontWeight: "800", marginTop: 4 }}>{cockpit?.cancellationRate == null ? t("provider.metricUnavailable") : `%${cockpit.cancellationRate.toFixed(2)}`}</Text>
                </View>
                <View style={{ flex: 1, borderRadius: 8, padding: 10, backgroundColor: `${colors.primary}0D` }}>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{t("provider.activeJobs")}</Text>
                  <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 15, fontWeight: "800", marginTop: 4 }}>{String(cockpit?.activeJobs ?? 0)}</Text>
                </View>
              </View>
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: isAvailable, disabled: availabilityMutation.isPending }}
              onPress={toggleAvailability}
              style={({ pressed }) => ({
                minHeight: 48,
                borderRadius: 10,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.card,
                borderWidth: 0.5,
                borderColor: colors.border,
                marginBottom: 10,
                opacity: pressed || availabilityMutation.isPending ? 0.68 : 1,
              })}
            >
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>{t("provider.availability")}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                {availabilityMutation.isPending ? (
                  <ActivityIndicator size="small" color="#22C55E" />
                ) : (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isAvailable ? "#22C55E" : colors.muted }} />
                )}
                <Text style={{ color: isAvailable ? "#22C55E" : colors.muted, fontSize: 12, fontWeight: "700" }}>
                  {isAvailable ? t("provider.available") : t("provider.unavailable")}
                </Text>
              </View>
            </Pressable>

            <View style={{ flex: 1, minHeight: 276, borderRadius: 10, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border, overflow: "hidden" }}>
              {MENU_ITEMS.map((item, index) => (
                <Pressable
                  key={item.labelKey}
                  onPress={() => router.push(item.route as never)}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 46,
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    borderBottomWidth: index === MENU_ITEMS.length - 1 ? 0 : 0.5,
                    borderBottomColor: colors.border,
                    opacity: pressed ? 0.62 : 1,
                  })}
                >
                  <IconSymbol name={item.icon} size={18} color={item.color} />
                  <Text style={{ flex: 1, color: colors.foreground, fontSize: 14, fontWeight: "600", marginLeft: 12 }}>
                    {t(item.labelKey)}
                  </Text>
                  <IconSymbol name="chevron.right" size={17} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
        <ProviderBottomNav active="home" />
      </View>
    </ScreenContainer>
  );
}
