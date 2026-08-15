import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, Dimensions } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useLocalization } from "@/lib/i18n";

export default function TabLayout() {
  const colors = useColors();
  const { translate } = useLocalization();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  const screenWidth = Dimensions.get("window").width;

  // 6 tab için label font size ekran genişliğine göre ayarla
  const labelSize = screenWidth < 380 ? 8 : screenWidth < 420 ? 9 : 10;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: labelSize,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: translate("home"),
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: translate("explore"),
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-jobs"
        options={{
          title: translate("myJobs"),
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: translate("messages"),
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="message.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: translate("wallet"),
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="wallet.pass.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: translate("profile"),
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
