import { Text, View, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SAMPLE_JOBS } from "@/lib/data/jobs";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const job = SAMPLE_JOBS.find((j) => j.id === id) || SAMPLE_JOBS[0];

  const statusColors: Record<string, string> = {
    active: "#10B981",
    pending: "#F59E0B",
    completed: "#3B82F6",
    cancelled: "#EF4444",
  };

  const statusLabels: Record<string, string> = {
    active: "Aktif",
    pending: "Bekliyor",
    completed: "Tamamlandı",
    cancelled: "İptal Edildi",
  };

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
          İş Detayı
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Status Badge */}
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: statusColors[job.status] + "18",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: statusColors[job.status] }}>
            {statusLabels[job.status]}
          </Text>
        </View>

        <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.foreground }}>{job.title}</Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 6 }}>{job.date}</Text>

        {/* Provider Info */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 20,
            padding: 14,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primary + "18",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>
              {job.providerName.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{job.providerName}</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>Hizmet Sağlayıcı</Text>
          </View>
          <Pressable
            onPress={() => router.push(`/chat/${job.id}` as any)}
            style={({ pressed }) => [
              {
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: colors.primary + "15",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Mesaj</Text>
          </Pressable>
        </View>

        {/* Details */}
        <View style={{ marginTop: 20, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconSymbol name="location.fill" size={18} color={colors.muted} />
            <Text style={{ marginLeft: 10, fontSize: 14, color: colors.foreground }}>{job.location}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconSymbol name="dollarsign.circle.fill" size={18} color={colors.muted} />
            <Text style={{ marginLeft: 10, fontSize: 14, color: colors.foreground }}>{job.price}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconSymbol name="clock.fill" size={18} color={colors.muted} />
            <Text style={{ marginLeft: 10, fontSize: 14, color: colors.foreground }}>{job.date}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>
            Açıklama
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 22 }}>{job.description}</Text>
        </View>

        {/* Payment Info */}
        <View
          style={{
            marginTop: 20,
            padding: 16,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 10 }}>
            Ödeme Bilgisi
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>Hizmet Bedeli</Text>
            <Text style={{ fontSize: 14, color: colors.foreground }}>{job.price}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>Platform Komisyonu</Text>
            <Text style={{ fontSize: 14, color: colors.foreground }}>₺0</Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingTop: 8,
              borderTopWidth: 0.5,
              borderTopColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>Toplam</Text>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: colors.primary }}>{job.price}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      {job.status === "active" && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
            paddingBottom: 30,
            backgroundColor: colors.background,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
          }}
        >
          <Pressable
            style={({ pressed }) => [
              {
                backgroundColor: colors.success,
                borderRadius: 12,
                paddingVertical: 15,
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>İşi Tamamla</Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}
