import { Text, View, Pressable, Platform } from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function LiveTrackingScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ providerName?: string; service?: string }>();
  const providerName = params.providerName || "Usta";
  const service = params.service || "Hizmet";

  // Simulated live tracking data
  const [eta, setEta] = useState(12); // minutes
  const [distance, setDistance] = useState(3.2); // km
  const [status, setStatus] = useState<"approaching" | "arrived" | "working">("approaching");
  const [providerLocation, setProviderLocation] = useState({ lat: 41.005, lng: 28.975 });

  // Simulate movement
  useEffect(() => {
    const interval = setInterval(() => {
      setEta((prev) => Math.max(0, prev - 1));
      setDistance((prev) => Math.max(0, prev - 0.3));
      setProviderLocation((prev) => ({
        lat: prev.lat + 0.0003,
        lng: prev.lng + 0.0002,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (eta <= 0 && status === "approaching") {
      setStatus("arrived");
    }
  }, [eta, status]);

  const getStatusInfo = () => {
    switch (status) {
      case "approaching":
        return { title: "Yolda", subtitle: `Tahmini varış: ${eta} dk`, color: "#3B82F6", icon: "🚗" };
      case "arrived":
        return { title: "Ulaştı!", subtitle: "Usta konumunuza ulaştı", color: colors.success, icon: "✅" };
      case "working":
        return { title: "Çalışıyor", subtitle: "Hizmet devam ediyor", color: "#F59E0B", icon: "🔧" };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
          zIndex: 10,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          Canlı Takip
        </Text>
        <Pressable style={{ padding: 4 }}>
          <IconSymbol name="phone.fill" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Map Area */}
      <View style={{ flex: 1, backgroundColor: "#E8F4E8", position: "relative" }}>
        {/* Grid */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2 }}>
          {[...Array(10)].map((_, i) => (
            <View key={`h-${i}`} style={{ position: "absolute", top: `${(i + 1) * 10}%`, left: 0, right: 0, height: 1, backgroundColor: "#94A3B8" }} />
          ))}
          {[...Array(8)].map((_, i) => (
            <View key={`v-${i}`} style={{ position: "absolute", left: `${(i + 1) * 12.5}%`, top: 0, bottom: 0, width: 1, backgroundColor: "#94A3B8" }} />
          ))}
        </View>

        {/* Roads */}
        <View style={{ position: "absolute", top: "35%", left: 0, right: 0, height: 10, backgroundColor: "#CBD5E1", opacity: 0.5 }} />
        <View style={{ position: "absolute", top: "65%", left: 0, right: 0, height: 8, backgroundColor: "#CBD5E1", opacity: 0.4 }} />
        <View style={{ position: "absolute", left: "45%", top: 0, bottom: 0, width: 10, backgroundColor: "#CBD5E1", opacity: 0.5 }} />

        {/* Route line (dashed) */}
        <View
          style={{
            position: "absolute",
            top: "30%",
            left: "25%",
            width: "40%",
            height: 3,
            backgroundColor: colors.primary,
            opacity: 0.6,
            transform: [{ rotate: "25deg" }],
          }}
        />

        {/* Provider marker (moving) */}
        <View
          style={{
            position: "absolute",
            top: status === "arrived" ? "55%" : "30%",
            left: status === "arrived" ? "48%" : "25%",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: statusInfo.color,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 3,
              borderColor: "#FFF",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text style={{ fontSize: 20 }}>{statusInfo.icon}</Text>
          </View>
          <View
            style={{
              marginTop: 4,
              backgroundColor: "#FFF",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "600", color: colors.foreground }}>{providerName}</Text>
          </View>
        </View>

        {/* User location (destination) */}
        <View style={{ position: "absolute", top: "55%", left: "48%", alignItems: "center" }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: "#3B82F6",
              borderWidth: 3,
              borderColor: "#FFF",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: -8,
              left: -8,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#3B82F6" + "20",
            }}
          />
          <Text style={{ marginTop: 4, fontSize: 10, color: "#3B82F6", fontWeight: "600" }}>Siz</Text>
        </View>

        {/* ETA Badge */}
        {status === "approaching" && (
          <View
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              backgroundColor: "#FFF",
              borderRadius: 12,
              padding: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.muted }}>Tahmini Varış</Text>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary }}>{eta} dk</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>{distance.toFixed(1)} km uzakta</Text>
          </View>
        )}
      </View>

      {/* Bottom Info Card */}
      <View
        style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          paddingBottom: 30,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        {/* Status */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            backgroundColor: statusInfo.color + "10",
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: statusInfo.color,
              marginRight: 10,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: statusInfo.color }}>{statusInfo.title}</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>{statusInfo.subtitle}</Text>
          </View>
        </View>

        {/* Provider Info */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.primary + "15",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>
              {providerName.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>{providerName}</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>{service}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={({ pressed }) => [
                {
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary + "12",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <IconSymbol name="phone.fill" size={18} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => router.push(`/chat/1` as any)}
              style={({ pressed }) => [
                {
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary + "12",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <IconSymbol name="message.fill" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Action buttons */}
        {status === "arrived" && (
          <Pressable
            onPress={() => setStatus("working")}
            style={({ pressed }) => [
              {
                backgroundColor: colors.success,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600" }}>Hizmeti Başlat</Text>
          </Pressable>
        )}

        {status === "working" && (
          <Pressable
            onPress={() => {
              router.push(`/review/create?providerId=1&providerName=${providerName}&jobTitle=${service}` as any);
            }}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600" }}>Hizmeti Tamamla & Değerlendir</Text>
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}

