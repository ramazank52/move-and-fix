import type { HomeScreenViewProps } from "@/components/home-screen-view";

type FixtureState = "normal" | "loading" | "empty" | "disabled";

const noOp = () => undefined;
const noOpWithId = (_id: number | string) => undefined;

export function createHomeFixtureProps(
  colors: HomeScreenViewProps["colors"],
  state: FixtureState,
): HomeScreenViewProps {
  const providers = state === "empty" ? [] : [{ id: "fixture-provider-01", displayName: "Fixture Usta", isVerified: true, rating: 4.9 }];
  return {
    colors,
    greeting: "Merhaba Fixture 👋",
    subtitle: "Bugün sana nasıl yardımcı olabilirim?",
    searchPlaceholder: "Hizmet ara",
    moveAITitle: "MoveAI ile anlat",
    moveAISubtitle: "İhtiyacını yaz, doğru hizmeti bulalım.",
    quickAccessTitle: "Hızlı Erişim",
    nearbyProvidersTitle: "Yakındaki Ustalar",
    popularServicesTitle: "Popüler Hizmetler",
    seeAllLabel: "Tümünü Gör",
    noNearbyProvidersLabel: "Yakında müsait usta bulunamadı.",
    activeJobLabel: "Aktif İş",
    serviceCount: (count) => `${count} hizmet`,
    quickAccess: [
      { name: "Acil Yardım", icon: "exclamationmark.triangle.fill", color: colors.error },
      { name: "Araç", icon: "car.fill", color: colors.primary },
      { name: "Ev", icon: "house.fill", color: colors.accentBlue },
      { name: "Taşıma", icon: "shippingbox.fill", color: colors.accentPurple },
    ],
    popularServices: [
      { name: "Temizlik", count: 234, icon: "sparkles" },
      { name: "Tesisat", count: 156, icon: "wrench.fill" },
      { name: "Elektrik", count: 189, icon: "bolt.fill" },
      { name: "Klima", count: 142, icon: "sun.max.fill" },
    ],
    activeJob: state === "normal" ? { id: "fixture-active-job-01" } : undefined,
    nearbyProviders: providers,
    providersLoading: state === "loading",
    interactionsDisabled: state === "disabled",
    onOpenMoveAI: noOp,
    onOpenExplore: noOp,
    onOpenJob: noOpWithId,
    onOpenProvider: noOpWithId,
  };
}
