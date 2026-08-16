import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function JobCapsuleScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const colors = useColors();
  const requestId = Number(id);
  const validRequestId = Number.isInteger(requestId) && requestId > 0;
  const capsuleQuery = trpc.jobCapsules.get.useQuery({ requestId }, { enabled: validRequestId });

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={{ height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <Pressable accessibilityLabel="Geri dön" onPress={() => router.back()} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.55 : 1 })}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ marginLeft: 8, flex: 1, color: colors.foreground, fontSize: 17, fontWeight: "800" }}>Job Capsule</Text>
        <IconSymbol name="checkmark.seal.fill" size={20} color={colors.primary} />
      </View>

      {!validRequestId ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
          <IconSymbol name="exclamationmark.triangle.fill" size={38} color={colors.warning} />
          <Text style={{ marginTop: 12, color: colors.foreground, fontSize: 16, fontWeight: "800" }}>Geçersiz iş bağlantısı</Text>
        </View>
      ) : capsuleQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.muted, fontSize: 13 }}>İş özeti doğrulanıyor…</Text>
        </View>
      ) : capsuleQuery.isError || !capsuleQuery.data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
          <IconSymbol name="lock.fill" size={36} color={colors.error} />
          <Text style={{ marginTop: 12, color: colors.foreground, fontSize: 16, fontWeight: "800", textAlign: "center" }}>İş kapsülü görüntülenemedi</Text>
          <Text style={{ marginTop: 7, color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center" }}>Bu özet yalnız işin müşteri ve atanmış profesyonel katılımcılarına açıktır.</Text>
          <Pressable onPress={() => capsuleQuery.refetch()} style={({ pressed }) => ({ marginTop: 18, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 })}>
            <Text style={{ color: "#FFF", fontWeight: "800" }}>Yeniden Dene</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
          <View style={{ borderRadius: 20, padding: 18, backgroundColor: `${colors.primary}0D`, borderWidth: 0.5, borderColor: `${colors.primary}42` }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <IconSymbol name="checkmark.seal.fill" size={22} color={colors.primary} />
              <Text style={{ marginLeft: 9, color: colors.foreground, fontSize: 16, fontWeight: "900" }}>Değişmez iş özeti</Text>
            </View>
            <Text style={{ marginTop: 9, color: colors.muted, fontSize: 13, lineHeight: 19 }}>Kapsül, sözleşme, ödeme, tamamlanma kanıtı ve değerlendirme kayıtlarından üretilir. Kaynak kayıtlar yetkili sistemlerde saklanır.</Text>
          </View>

          <Text style={{ marginTop: 24, marginBottom: 10, color: colors.foreground, fontSize: 16, fontWeight: "800" }}>İş durumu</Text>
          <View style={{ borderRadius: 16, padding: 16, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }}>
            <CapsuleRow label="Talep" value={capsuleQuery.data.request.status} colors={colors} />
            <CapsuleRow label="Oluşturulma" value={formatDate(capsuleQuery.data.request.createdAt)} colors={colors} />
            <CapsuleRow label="Son güncelleme" value={formatDate(capsuleQuery.data.request.updatedAt)} colors={colors} last />
          </View>

          <Text style={{ marginTop: 24, marginBottom: 10, color: colors.foreground, fontSize: 16, fontWeight: "800" }}>Sözleşme ve ödeme</Text>
          <View style={{ borderRadius: 16, padding: 16, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }}>
            <CapsuleRow label="Sözleşme" value={capsuleQuery.data.agreement ? "Kayıtlı" : "Kayıt bulunamadı"} colors={colors} />
            {capsuleQuery.data.agreement ? <CapsuleRow label="Anlaşan tutar" value={formatAmount(capsuleQuery.data.agreement.agreedAmount, capsuleQuery.data.agreement.currency)} colors={colors} /> : null}
            {capsuleQuery.data.agreement ? <CapsuleRow label="Kabul" value={formatDate(capsuleQuery.data.agreement.acceptedAt)} colors={colors} /> : null}
            <CapsuleRow label="Ödeme" value={capsuleQuery.data.payment ? `${capsuleQuery.data.payment.status} · ${formatAmount(capsuleQuery.data.payment.amount, capsuleQuery.data.agreement?.currency ?? "TRY")}` : "Kayıt bulunamadı"} colors={colors} last />
          </View>

          <Text style={{ marginTop: 24, marginBottom: 10, color: colors.foreground, fontSize: 16, fontWeight: "800" }}>Tamamlama ve değerlendirme</Text>
          <View style={{ borderRadius: 16, padding: 16, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }}>
            <CapsuleRow label="Kanıt" value={capsuleQuery.data.completionProof ? capsuleQuery.data.completionProof.status : "Kayıt bulunamadı"} colors={colors} />
            {capsuleQuery.data.completionProof ? <CapsuleRow label="Kanıt zamanı" value={formatDate(capsuleQuery.data.completionProof.createdAt)} colors={colors} /> : null}
            {capsuleQuery.data.completionProof?.releasedAt ? <CapsuleRow label="Serbest bırakma" value={formatDate(capsuleQuery.data.completionProof.releasedAt)} colors={colors} /> : null}
            <CapsuleRow label="Değerlendirme" value={capsuleQuery.data.review ? `${capsuleQuery.data.review.rating}/5` : "Henüz değerlendirme yok"} colors={colors} last />
          </View>

          <Text style={{ marginTop: 24, marginBottom: 10, color: colors.foreground, fontSize: 16, fontWeight: "800" }}>İş zaman çizelgesi</Text>
          {capsuleQuery.data.timeline.length === 0 ? (
            <View style={{ borderRadius: 16, padding: 18, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Bu iş için henüz görüntülenebilir zaman çizelgesi kaydı yok.</Text>
            </View>
          ) : capsuleQuery.data.timeline.map((event) => (
            <View key={event.id} style={{ marginBottom: 10, flexDirection: "row", borderRadius: 15, padding: 14, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5 }} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800" }}>{event.eventType.replace(/_/g, " ")}</Text>
                <Text style={{ marginTop: 3, color: colors.muted, fontSize: 11 }}>{formatDate(event.occurredAt)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function CapsuleRow({ label, value, colors, last = false }: { label: string; value: string; colors: ReturnType<typeof useColors>; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 18, paddingBottom: last ? 0 : 11, marginBottom: last ? 0 : 11, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.border }}>
      <Text style={{ flex: 0.45, color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ flex: 0.55, color: colors.foreground, fontSize: 12, fontWeight: "700", textAlign: "right" }}>{value}</Text>
    </View>
  );
}
