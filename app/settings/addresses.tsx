import { Text, View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const ADDRESSES = [
  { id: "1", title: "Ev", address: "Kadıköy, Caferağa Mah. Moda Cad. No:12/4, İstanbul", isDefault: true },
  { id: "2", title: "İş", address: "Şişli, Büyükdere Cad. No:185, Levent, İstanbul", isDefault: false },
];

export default function AddressesScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          Adreslerim
        </Text>
        <Pressable style={{ padding: 4 }}>
          <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        {ADDRESSES.map((addr) => (
          <View
            key={addr.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: addr.isDefault ? colors.primary + "40" : colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <IconSymbol name="location.fill" size={16} color={colors.primary} />
              <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                {addr.title}
              </Text>
              {addr.isDefault && (
                <View
                  style={{
                    marginLeft: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: colors.primary + "15",
                  }}
                >
                  <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "600" }}>Varsayılan</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>{addr.address}</Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
