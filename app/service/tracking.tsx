import { Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

export default function TrackingScreen() {
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
          Canlı Takip
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Map with route */}
      <View style={{ flex: 1, position: "relative" }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "#E8F4E8",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Simulated route line */}
          <View
            style={{
              position: "absolute",
              top: "30%",
              left: "20%",
              width: "60%",
              height: 3,
              backgroundColor: colors.primary,
              borderRadius: 2,
              transform: [{ rotate: "25deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              top: "45%",
              left: "45%",
              width: "35%",
              height: 3,
              backgroundColor: colors.primary,
              borderRadius: 2,
              transform: [{ rotate: "-15deg" }],
            }}
          />

          {/* Provider marker */}
          <View
            style={{
              position: "absolute",
              top: "25%",
              left: "20%",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: "#FFF",
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 16 }}>🔧</Text>
            </View>
          </View>

          {/* User marker */}
          <View
            style={{
              position: "absolute",
              top: "60%",
              left: "70%",
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#3B82F6",
                borderWidth: 3,
                borderColor: "#FFF",
              }}
            />
          </View>

          <Text style={{ position: "absolute", bottom: 20, fontSize: 13, color: "#64748B" }}>
            📍 Canlı konum takibi (cihazda aktif)
          </Text>
        </View>

        {/* ETA Card */}
        <View
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            backgroundColor: colors.background,
            borderRadius: 12,
            padding: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.success + "18",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSymbol name="clock.fill" size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 13, color: colors.muted }}>Tahmini Varış</Text>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground }}>12 dakika</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Mesafe</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.primary }}>3.2 km</Text>
          </View>
        </View>
      </View>

      {/* Bottom Provider Info */}
      <View
        style={{
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          padding: 16,
          paddingBottom: 30,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.primary + "18",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary }}>A</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Ahmet Yılmaz</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>Elektrik Ustası • ★ 4.9</Text>
          </View>
          <Pressable
            onPress={() => router.push("/chat/1" as any)}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primary + "15",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <IconSymbol name="message.fill" size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.success + "15",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <IconSymbol name="phone.fill" size={18} color={colors.success} />
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 10,
          }}
        >
          <View
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: colors.surface,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 11, color: colors.muted }}>Hizmet</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, marginTop: 2 }}>Klima Bakımı</Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: colors.surface,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 11, color: colors.muted }}>Ücret</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary, marginTop: 2 }}>₺850</Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: colors.surface,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 11, color: colors.muted }}>Durum</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.success, marginTop: 2 }}>Yolda</Text>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
