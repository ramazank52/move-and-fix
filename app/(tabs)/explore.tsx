import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ExploreScreenView, type ExploreFilterTab } from "@/components/explore-screen-view";
import { trpc } from "@/lib/trpc";

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ q?: string; filter?: string }>();
  const categoriesQuery = trpc.categories.list.useQuery();
  const providersQuery = trpc.provider.nearby.useQuery({});
  const initialFilter: ExploreFilterTab = params.filter === "emergency" ? "emergency" : params.filter === "km_based" ? "km_based" : "all";
  return <ExploreScreenView categories={categoriesQuery.data ?? []} nearbyProviders={providersQuery.data ?? []} categoriesLoading={categoriesQuery.isLoading} categoriesError={Boolean(categoriesQuery.error)} providersLoading={providersQuery.isLoading} providersError={Boolean(providersQuery.error)} initialSearchQuery={params.q ?? ""} initialFilter={initialFilter} onOpenCategory={(slug) => router.push(`/category/${slug}` as never)} onOpenProvider={(id) => router.push(`/provider/${id}` as never)} onRetryCategories={() => { void categoriesQuery.refetch(); }} onRetryProviders={() => { void providersQuery.refetch(); }} />;
}
