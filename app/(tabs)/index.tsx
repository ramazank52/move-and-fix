import { useRouter } from "expo-router";
import React from "react";
import { HomeScreenView } from "@/components/home-screen-view";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/lib/i18n";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Fetch data
  const { data: activeJobs } = trpc.requests.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: nearbyProviders, isLoading: providersLoading } = trpc.provider.nearby.useQuery(
    { lat: "41.0082", lng: "28.9784" },
    { enabled: !!user }
  );

  const activeJob = activeJobs?.find((j) => j.status === "active");
  const userName = user?.name?.split(" ")[0] || t("home.defaultName");

  // Quick access categories — referans görsele göre
  const quickAccess = [
    { name: t("home.quickAccess_emergency"), icon: "exclamationmark.triangle.fill" as const, color: colors.error },
    { name: t("home.quickAccess_vehicle"), icon: "car.fill" as const, color: colors.primary },
    { name: t("home.quickAccess_home"), icon: "house.fill" as const, color: colors.accentBlue },
    { name: t("home.quickAccess_moving"), icon: "shippingbox.fill" as const, color: colors.accentPurple },
  ];

  // Popular services — referans görsele göre
  const popularServices = [
    { name: t("home.service.cleaning"), count: 234, icon: "sparkles" as const },
    { name: t("home.service.plumbing"), count: 156, icon: "wrench.fill" as const },
    { name: t("home.service.electricity"), count: 189, icon: "bolt.fill" as const },
    { name: t("home.service.airConditioning"), count: 142, icon: "sun.max.fill" as const },
  ];

  return <HomeScreenView
    colors={colors}
    greeting={t("home.greeting", { name: userName })}
    subtitle={t("home.subtitle")}
    searchPlaceholder={t("home.searchPlaceholder")}
    moveAITitle={t("home.moveAITitle")}
    moveAISubtitle={t("home.moveAISubtitle")}
    quickAccessTitle={t("home.quickAccess")}
    nearbyProvidersTitle={t("home.nearbyProviders")}
    popularServicesTitle={t("home.popularServices")}
    seeAllLabel={t("common.seeAll")}
    noNearbyProvidersLabel={t("home.noNearbyProviders")}
    activeJobLabel={t("home.activeJob")}
    serviceCount={(count) => t("home.serviceCount", { count })}
    quickAccess={quickAccess}
    popularServices={popularServices}
    activeJob={activeJob}
    nearbyProviders={nearbyProviders}
    providersLoading={providersLoading}
    interactionsDisabled={false}
    onOpenMoveAI={() => router.push("/ai-assistant" as any)}
    onOpenExplore={() => router.push("/explore" as any)}
    onOpenJob={(id) => router.push(`/job/${id}` as any)}
    onOpenProvider={(id) => router.push(`/provider/${id}` as any)}
  />;
}
