import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "@/lib/theme-provider";

export default function ExploreFixtureLayout() {
  return <ThemeProvider><SafeAreaProvider><Stack screenOptions={{ headerShown: false }} /></SafeAreaProvider></ThemeProvider>;
}
