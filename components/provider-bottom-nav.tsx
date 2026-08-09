import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type ProviderNavKey = "home" | "opportunities" | "jobs" | "messages" | "profile";

const NAV_ITEMS = [
  { key: "home", label: "Ana Sayfa", icon: "house.fill", route: "/provider-dashboard" },
  { key: "opportunities", label: "Fırsatlar", icon: "briefcase.fill", route: "/provider-opportunities" },
  { key: "jobs", label: "İşlerim", icon: "calendar", route: "/provider-jobs" },
  { key: "messages", label: "Mesajlar", icon: "message.fill", route: "/(tabs)/messages" },
  { key: "profile", label: "Profil", icon: "person.fill", route: "/(tabs)/profile" },
] as const;

export function ProviderBottomNav({ active }: { active: ProviderNavKey }) {
  const colors = useColors();
  const router = useRouter();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        minHeight: 64,
        paddingTop: 8,
        paddingHorizontal: 6,
        backgroundColor: colors.background,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        const color = isActive ? "#FF7A1A" : colors.muted;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
            onPress={() => {
              if (!isActive) router.replace(item.route as never);
            }}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <IconSymbol name={item.icon} size={21} color={color} />
            <Text style={{ color, fontSize: 10, lineHeight: 13, fontWeight: isActive ? "700" : "500" }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
