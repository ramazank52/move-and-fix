import { ActivityIndicator, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

type CapabilityState = "AVAILABLE" | "NOT_CONFIGURED" | "NOT_SUPPORTED" | "TEMPORARILY_UNAVAILABLE" | "PERMISSION_REQUIRED" | "OFFLINE" | "UNAUTHORIZED";
type CapabilityRow = { key: string; state: CapabilityState; reasonCode: string };

const labels: Record<string, string> = {
  payment: "Ödeme",
  maps: "Harita",
  push: "Push bildirim",
  sounds: "Bildirim sesi",
  sms: "SMS",
  email: "E-posta",
  move_ai: "MoveAI",
  documents: "Belge doğrulama",
  media: "Medya tarama",
  camera_ar: "Kamera / AR ölçüm",
};

const stateLabels: Record<CapabilityState, string> = {
  AVAILABLE: "Kullanılabilir",
  NOT_CONFIGURED: "Yapılandırılmadı",
  NOT_SUPPORTED: "Desteklenmiyor",
  TEMPORARILY_UNAVAILABLE: "Geçici olarak kullanılamıyor",
  PERMISSION_REQUIRED: "İzin gerekli",
  OFFLINE: "Çevrimdışı",
  UNAUTHORIZED: "Yetki gerekli",
};

export function RuntimeCapabilityStatusCard({
  capabilities,
  isLoading,
  isError,
}: {
  capabilities?: readonly CapabilityRow[];
  isLoading: boolean;
  isError: boolean;
}) {
  const colors = useColors();
  if (isLoading) {
    return <View accessibilityRole="progressbar" style={{ padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 8 }}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.muted, fontSize: 12 }}>Hizmet durumu yükleniyor…</Text></View>;
  }
  if (isError || !capabilities) {
    return <View accessibilityRole="alert" style={{ padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.error }}><Text style={{ color: colors.error, fontWeight: "800" }}>Hizmet durumu şu anda alınamadı</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Bu ekran entegrasyonların kullanılabilir olduğunu varsaymaz.</Text></View>;
  }
  return <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
    <View style={{ paddingHorizontal: 16, paddingTop: 15, paddingBottom: 9 }}><Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>Hizmet Kullanılabilirliği</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>Sunucunun mevcut yapılandırma ve destek durumuna göre bilgi verilir. Teslimat başarısı anlamına gelmez.</Text></View>
    {capabilities.map((capability, index) => {
      const isAvailable = capability.state === "AVAILABLE";
      const color = isAvailable ? colors.success : capability.state === "NOT_SUPPORTED" ? colors.warning : colors.muted;
      return <View key={capability.key} accessibilityRole="text" style={{ paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: index === 0 ? 0 : 0.5, borderTopColor: colors.border, flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ color: colors.foreground, flex: 1, fontSize: 13, fontWeight: "600" }}>{labels[capability.key] ?? capability.key}</Text>
        <Text style={{ color, fontSize: 12, fontWeight: "700", textAlign: "right" }}>{stateLabels[capability.state]}</Text>
      </View>;
    })}
  </View>;
}
