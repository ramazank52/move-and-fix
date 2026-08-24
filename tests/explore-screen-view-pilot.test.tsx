import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

function host(name: string) { return ({ children, ...props }: Record<string, unknown>) => React.createElement(name, props, children as React.ReactNode); }
const mocked = vi.hoisted(() => ({ router: { push: vi.fn() }, refetchCategories: vi.fn(), refetchProviders: vi.fn() }));
const router = mocked.router;
let captured: Record<string, unknown> | undefined;
const refetchCategories = mocked.refetchCategories;
const refetchProviders = mocked.refetchProviders;

vi.mock("expo-router", () => ({ router: mocked.router, useLocalSearchParams: () => ({ q: "boya", filter: "emergency" }) }));
vi.mock("@/components/explore-screen-view", () => ({ ExploreScreenView: (props: Record<string, unknown>) => { captured = props; return React.createElement("explore-screen-view", props); } }));
vi.mock("@/lib/trpc", () => ({ trpc: { categories: { list: { useQuery: () => ({ data: [{ id: 1, slug: "painting", name: "Boya", professionalCount: 2 }], isLoading: false, error: null, refetch: refetchCategories }) } }, provider: { nearby: { useQuery: () => ({ data: [{ id: 2, displayName: "Usta" }], isLoading: false, error: null, refetch: refetchProviders }) } } } }));
vi.mock("react-native", () => ({ View: host("view") }));

import ExploreScreen from "../app/(tabs)/explore";

describe("Explore presentational-view pilot", () => {
  beforeEach(() => { vi.clearAllMocks(); captured = undefined; });
  it("keeps live tRPC values and production router/refetch callbacks in the wrapper", async () => {
    await act(async () => { TestRenderer.create(<ExploreScreen />); });
    expect(captured?.initialSearchQuery).toBe("boya");
    expect(captured?.initialFilter).toBe("emergency");
    await act(async () => {
      (captured?.onOpenCategory as (slug: string) => void)("painting");
      (captured?.onOpenProvider as (id: number) => void)(2);
      (captured?.onRetryCategories as () => void)();
      (captured?.onRetryProviders as () => void)();
    });
    expect(router.push).toHaveBeenNthCalledWith(1, "/category/painting");
    expect(router.push).toHaveBeenNthCalledWith(2, "/provider/2");
    expect(refetchCategories).toHaveBeenCalledOnce();
    expect(refetchProviders).toHaveBeenCalledOnce();
  });
});
