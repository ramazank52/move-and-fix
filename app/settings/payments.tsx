import { Text, View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function PaymentsScreen() {
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
          Ödeme Yöntemlerim
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Saved Cards */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconSymbol name="creditcard.fill" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>**** **** **** 4532</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Visa • 12/28</Text>
            </View>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: colors.primary + "15",
              }}
            >
              <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "600" }}>Varsayılan</Text>
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconSymbol name="creditcard.fill" size={24} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>**** **** **** 8901</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Mastercard • 06/27</Text>
            </View>
          </View>
        </View>

        {/* Add Card */}
        <Pressable
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: colors.primary,
              borderStyle: "dashed",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <IconSymbol name="plus.circle.fill" size={20} color={colors.primary} />
          <Text style={{ marginLeft: 8, color: colors.primary, fontWeight: "600", fontSize: 14 }}>
            Yeni Kart Ekle
          </Text>
        </Pressable>

        {/* Escrow Info */}
        <View
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: "#6366F1" + "10",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#6366F1" + "25",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <IconSymbol name="shield.fill" size={18} color="#6366F1" />
            <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: "600", color: colors.foreground }}>
              Emanet Ödeme Sistemi
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>
            Ödemeniz hizmet tamamlanana kadar güvende tutulur. İş onaylandıktan sonra ustaya aktarılır.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
