import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

function host(name: string) { return ({ children, ...props }: Record<string, unknown>) => React.createElement(name, props, children as React.ReactNode); }
const colors = { primary: "#4F46E5", foreground: "#111827", muted: "#64748B", surface: "#F8FAFC", border: "#E5E7EB", error: "#DC2626", accentBlue: "#2563EB", warning: "#D97706" };

vi.mock("react-native", async () => {
  const { createElement, Fragment } = await import("react");
  return {
    ActivityIndicator: host("activity-indicator"), Pressable: host("pressable"), ScrollView: host("scroll-view"), Text: host("text"), TextInput: host("text-input"), View: host("view"),
    FlatList: ({ data, renderItem, ...props }: { data: unknown[]; renderItem: (value: { item: unknown }) => React.ReactNode }) => createElement(
      "flat-list", props, createElement(Fragment, null, data.map((item, index) => createElement(Fragment, { key: index }, renderItem({ item })))),
    ),
  };
});
vi.mock("@/components/screen-container", () => ({ ScreenContainer: host("screen-container") }));
vi.mock("@/components/ui/icon-symbol", () => ({ IconSymbol: host("icon") }));
vi.mock("@/hooks/use-colors", () => ({ useColors: () => colors }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => values?.count !== undefined ? `${key}:${values.count}` : key }) }));

import { ExploreScreenView } from "../components/explore-screen-view";
import { createExploreFixtureProps } from "./explore-fixture/explore-fixture-props";

describe("Explore presentational-view fixture", () => {
  it("renders normal, loading, empty and error through the same production view without external imports", async () => {
    for (const state of ["normal", "loading", "empty", "error"] as const) {
      await act(async () => { TestRenderer.create(<ExploreScreenView {...createExploreFixtureProps(state)} />); });
    }
    const fixtureSource = await import("node:fs/promises").then((fs) => fs.readFile("tests/explore-fixture/app/index.tsx", "utf8"));
    const propsSource = await import("node:fs/promises").then((fs) => fs.readFile("tests/explore-fixture/explore-fixture-props.ts", "utf8"));
    expect(fixtureSource).toContain("ExploreScreenView");
    expect(fixtureSource).not.toMatch(/trpc|useAuth|fetch\(/i);
    expect(propsSource).toContain("const noOp");
  });
});
