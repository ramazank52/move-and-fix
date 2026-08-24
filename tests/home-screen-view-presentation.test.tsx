import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

function hostComponent(name: string) {
  return ({ children, ...props }: Record<string, unknown>) => React.createElement(name, props, children as React.ReactNode);
}

const colors = {
  accentBlue: "#2563EB", accentPurple: "#7C3AED", border: "#E5E7EB", error: "#DC2626",
  foreground: "#111827", muted: "#64748B", primary: "#4F46E5", surface: "#F8FAFC", warning: "#D97706",
};

vi.mock("react-native", () => ({
  ActivityIndicator: hostComponent("activity-indicator"), Pressable: hostComponent("pressable"), ScrollView: hostComponent("scroll-view"),
  Text: hostComponent("text"), TextInput: hostComponent("text-input"), View: hostComponent("view"),
}));
vi.mock("@/components/screen-container", () => ({ ScreenContainer: hostComponent("screen-container") }));
vi.mock("@/components/ui/icon-symbol", () => ({ IconSymbol: hostComponent("icon") }));

import { HomeScreenView } from "../components/home-screen-view";
import { createHomeFixtureProps } from "./home-fixture/home-fixture-props";

describe("Home presentational-view fixture adapter", () => {
  it("renders the production shared view with immutable fixture props and side-effect-free callbacks", async () => {
    const fixtureProps = createHomeFixtureProps(colors, "normal");
    const before = JSON.stringify(fixtureProps);
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<HomeScreenView {...fixtureProps} />); });
    const actions = renderer!.root.findAll((node) => String(node.type) === "pressable");
    await act(async () => { actions[0]?.props.onPress(); });
    expect(JSON.stringify(fixtureProps)).toBe(before);
    expect(fixtureProps.interactionsDisabled).toBe(false);
    expect(fixtureProps.providersLoading).toBe(false);
  });

  it("maps normal, loading, empty and disabled fixture states without product data or auth imports", () => {
    const normal = createHomeFixtureProps(colors, "normal");
    const loading = createHomeFixtureProps(colors, "loading");
    const empty = createHomeFixtureProps(colors, "empty");
    const disabled = createHomeFixtureProps(colors, "disabled");
    expect(normal.activeJob).toEqual({ id: "fixture-active-job-01" });
    expect(loading.providersLoading).toBe(true);
    expect(empty.nearbyProviders).toEqual([]);
    expect(disabled.interactionsDisabled).toBe(true);
  });

  it("renders all required fixture states through the same HomeScreenView tree", async () => {
    for (const state of ["normal", "loading", "empty", "disabled"] as const) {
      let renderer: TestRenderer.ReactTestRenderer;
      await act(async () => { renderer = TestRenderer.create(<HomeScreenView {...createHomeFixtureProps(colors, state)} />); });
      const texts = renderer!.root.findAll((node) => String(node.type) === "text").map((node) => node.children.join(""));
      if (state === "loading") expect(renderer!.root.findAll((node) => String(node.type) === "activity-indicator")).toHaveLength(1);
      if (state === "empty") expect(texts).toContain("Yakında müsait usta bulunamadı.");
      if (state === "disabled") expect(renderer!.root.findAll((node) => String(node.type) === "pressable").every((node) => node.props.disabled)).toBe(true);
      if (state === "normal") expect(texts).toContain("Fixture Usta");
    }
  });

  it("keeps the fixture adapter outside auth, tRPC, database, network and external clients", () => {
    const root = process.cwd();
    const fixtureSources = [
      "tests/home-fixture/app/_layout.tsx",
      "tests/home-fixture/app/index.tsx",
      "tests/home-fixture/home-fixture-props.ts",
    ].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
    for (const forbidden of ["useAuth", "@/lib/trpc", "@/server/", "fetch(", "axios", "stripe", "iyzico", "notifications"]) {
      expect(fixtureSources).not.toContain(forbidden);
    }
  });
});
