import { Link, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { HomeScreenView } from "@/components/home-screen-view";
import { useColors } from "@/hooks/use-colors";
import { createHomeFixtureProps } from "../home-fixture-props";

const allowedStates = new Set(["normal", "loading", "empty", "disabled"]);

export default function HomeFixtureScreen() {
  const colors = useColors();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const fixtureState = state && allowedStates.has(state) ? state as "normal" | "loading" | "empty" | "disabled" : "normal";
  const props = createHomeFixtureProps(colors, fixtureState);

  return <View style={{ flex: 1 }}><View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }}><Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 12 }}>COMPONENT_FIXTURE — ROUTE E2E DEĞİLDİR</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Immutable sentetik props · dış etki yok · durum: {fixtureState}</Text><View style={{ flexDirection: "row", gap: 10, marginTop: 7 }}>{["normal", "loading", "empty", "disabled"].map((nextState) => <Link key={nextState} href={{ pathname: "/", params: { state: nextState } }} style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>{nextState}</Link>)}</View></View><HomeScreenView {...props} /></View>;
}
