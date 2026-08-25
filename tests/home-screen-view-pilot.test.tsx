import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

function hostComponent(name: string) {
  return ({ children, ...props }: Record<string, unknown>) => React.createElement(name, props, children as React.ReactNode);
}

const router = { push: vi.fn() };
const colors = {
  accentBlue: "#2563EB", accentPurple: "#7C3AED", border: "#E5E7EB", error: "#DC2626",
  foreground: "#111827", muted: "#64748B", primary: "#4F46E5", surface: "#F8FAFC", warning: "#D97706",
};
let capturedProductionProps: Record<string, unknown> | undefined;
let nearbyQueryState: { data?: unknown[]; isLoading: boolean; isError: boolean } = {
  data: [{ id: 7, displayName: "Pilot Usta", isVerified: true, rating: 4.8 }],
  isLoading: false,
  isError: false,
};

vi.mock("react-native", () => ({
  ActivityIndicator: hostComponent("activity-indicator"), Pressable: hostComponent("pressable"), ScrollView: hostComponent("scroll-view"),
  Text: hostComponent("text"), TextInput: hostComponent("text-input"), View: hostComponent("view"),
}));
vi.mock("expo-router", () => ({ useRouter: () => router }));
vi.mock("@/components/home-screen-view", () => ({
  HomeScreenView: (props: Record<string, unknown>) => { capturedProductionProps = props; return React.createElement("home-screen-view", props); },
}));
vi.mock("@/hooks/use-colors", () => ({ useColors: () => colors }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { name: "Pilot Kullanıcı" } }) }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => values?.name ? `${key}:${values.name}` : key }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    requests: { list: { useQuery: () => ({ data: [{ id: 77, status: "active" }] }) } },
    provider: { nearby: { useQuery: () => nearbyQueryState } },
  },
}));

import ProductionHomeScreen from "../app/(tabs)/index";

describe("Home presentational-view isolation pilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProductionProps = undefined;
    nearbyQueryState = { data: [{ id: 7, displayName: "Pilot Usta", isVerified: true, rating: 4.8 }], isLoading: false, isError: false };
  });

  it("keeps the production wrapper's live callback routing when values are passed to the shared view", async () => {
    await act(async () => { TestRenderer.create(<ProductionHomeScreen />); });
    expect(capturedProductionProps).toBeDefined();
    expect(capturedProductionProps?.interactionsDisabled).toBe(false);

    await act(async () => {
      (capturedProductionProps?.onOpenMoveAI as () => void)();
      (capturedProductionProps?.onOpenExplore as () => void)();
      (capturedProductionProps?.onOpenJob as (id: number) => void)(77);
      (capturedProductionProps?.onOpenProvider as (id: number) => void)(7);
    });
    expect(router.push).toHaveBeenNthCalledWith(1, "/ai-assistant");
    expect(router.push).toHaveBeenNthCalledWith(2, "/explore");
    expect(router.push).toHaveBeenNthCalledWith(3, "/job/77");
    expect(router.push).toHaveBeenNthCalledWith(4, "/provider/7");
  });

  it("passes the real nearby-provider query error state and central error label to the shared view", async () => {
    nearbyQueryState = { isLoading: false, isError: true };
    await act(async () => { TestRenderer.create(<ProductionHomeScreen />); });
    expect(capturedProductionProps).toMatchObject({
      providersLoading: false,
      providersError: true,
      nearbyProvidersErrorLabel: "opportunities.errorBody",
    });
  });

});
