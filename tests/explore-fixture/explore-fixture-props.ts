import type { ExploreScreenViewProps } from "@/components/explore-screen-view";

export type ExploreFixtureState = "normal" | "loading" | "empty" | "error";

const noOp = () => undefined;
const categories = Object.freeze([
  { id: 201, slug: "painting", name: "Boya & Badana", pricingType: "fixed", professionalCount: 4, color: "#8B5CF6" },
  { id: 202, slug: "tow_truck", name: "Çekici", pricingType: "km_based", professionalCount: 2, color: "#EF4444" },
]);
const providers = Object.freeze([
  { id: 301, displayName: "Sentetik Usta", isVerified: 1, rating: 4.9, moveScore: 96 },
]);

export function createExploreFixtureProps(state: ExploreFixtureState): ExploreScreenViewProps {
  return Object.freeze({
    categories: state === "empty" ? [] : categories,
    nearbyProviders: state === "empty" ? [] : providers,
    categoriesLoading: state === "loading",
    categoriesError: state === "error",
    providersLoading: state === "loading",
    providersError: state === "error",
    onOpenCategory: noOp,
    onOpenProvider: noOp,
    onRetryCategories: noOp,
    onRetryProviders: noOp,
  });
}
