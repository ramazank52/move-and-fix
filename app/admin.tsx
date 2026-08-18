import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function formatTry(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Yönetim verileri alınamadı.";
}

export default function AdminDashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const dashboardQuery = trpc.owner.dashboard.useQuery(undefined, { staleTime: 30_000 });
  const categoriesQuery = trpc.owner.categories.useQuery(undefined, { staleTime: 60_000 });
  const reviewQueueQuery = trpc.owner.operationalReviewQueue.useQuery({ limit: 12 }, { staleTime: 20_000, retry: false });
  const dashboard = dashboardQuery.data;
  const categories = categoriesQuery.data ?? [];
  const isRefreshing = dashboardQuery.isRefetching || categoriesQuery.isRefetching;
  const error = dashboardQuery.error ?? categoriesQuery.error;

  const refresh = () => {
    void Promise.all([dashboardQuery.refetch(), categoriesQuery.refetch(), reviewQueueQuery.refetch()]);
  };

  const stats = dashboard
    ? [
        { label: "Toplam Kullanıcı", value: String(dashboard.activeUsers), color: "#3B82F6" },
        { label: "Müsait Usta", value: String(dashboard.activeProviders), color: "#10B981" },
        { label: "Toplam Tahsilat", value: formatTry(dashboard.totalRevenue), color: "#F59E0B" },
        { label: "Bugünkü Talep", value: String(dashboard.dailyOrders), color: "#A855F7" },
      ]
    : [];

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
        <Pressable onPress={() => router.back()} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Geri dön">
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          MoveOS
        </Text>
        <Pressable onPress={refresh} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Yönetim verilerini yenile">
          <IconSymbol name="arrow.clockwise" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {dashboardQuery.isLoading || categoriesQuery.isLoading ? (
          <View style={{ minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.muted }}>MoveOS verileri yükleniyor…</Text>
          </View>
        ) : error ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.error }}>
            <Text style={{ color: colors.error, fontWeight: "600", marginBottom: 6 }}>Yönetim verileri kullanılamıyor</Text>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>{errorMessage(error)}</Text>
            <Pressable
              onPress={refresh}
              style={{ marginTop: 14, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Yönetim verilerini yeniden yükle"
            >
              <Text style={{ color: colors.primary, fontWeight: "600" }}>Tekrar dene</Text>
            </Pressable>
          </View>
        ) : dashboard ? (
          <>
            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
              Ortak platform verileri · TRY · son yenileme anlık
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
              {stats.map((stat) => (
                <View
                  key={stat.label}
                  style={{
                    width: "48%",
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.muted }}>{stat.label}</Text>
                  <Text style={{ fontSize: 21, fontWeight: "bold", color: stat.color, marginTop: 5, fontVariant: ["tabular-nums"] }}>
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>Platform Finans Özeti</Text>
              {[
                ["Bugünkü tahsilat", formatTry(dashboard.dailyRevenue)],
                ["Serbest bırakılmayı bekleyen escrow", formatTry(dashboard.pendingPayments)],
                ["Gerçekleşen platform komisyonu", formatTry(dashboard.commissionRevenue)],
                ["Standart komisyon", "%10"],
              ].map(([label, value], index) => (
                <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: index === 0 ? 0 : 10 }}>
                  <Text style={{ color: colors.muted }}>{label}</Text>
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>{value}</Text>
                </View>
              ))}
            </View>

            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>Hizmet Kategorileri</Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
              {categories.length === 0 ? (
                <Text style={{ color: colors.muted, padding: 16 }}>Kayıtlı kategori bulunmuyor.</Text>
              ) : (
                categories.map((category, index) => (
                  <View
                    key={category.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderBottomWidth: index < categories.length - 1 ? 0.5 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: category.color ?? colors.primary, marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontWeight: "600" }}>{category.name}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                        {category.pricingType === "km_based" ? "KM bazlı" : category.pricingType === "hourly" ? "Saatlik" : "Sabit fiyat"} · {category.professionalCount} profesyonel
                      </Text>
                    </View>
                    <Text style={{ color: category.isActive ? colors.success : colors.muted, fontSize: 12, fontWeight: "600" }}>
                      {category.isActive ? "AKTİF" : "ARŞİV"}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={{ marginTop: 20, backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>Sistem Sinyalleri</Text>
              {dashboard.risks.length > 0 ? (
                dashboard.risks.map((risk) => <Text key={risk} style={{ color: colors.warning, lineHeight: 20 }}>• {risk}</Text>)
              ) : (
                <Text style={{ color: colors.muted }}>Bu özet için kaydedilmiş açık risk sinyali yok.</Text>
              )}
            </View>

            <View style={{ marginTop: 20, backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>Operasyon Vaka Kuyruğu</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: 12 }}>
                Destek ve claim kayıtlarının veri-minimize inceleme özeti. Ayrıntılar ilgili korumalı işlem ekranında açılır.
              </Text>
              {reviewQueueQuery.isLoading ? (
                <View style={{ paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: colors.muted }}>Kuyruk yükleniyor…</Text>
                </View>
              ) : reviewQueueQuery.error ? (
                <Text style={{ color: colors.muted, lineHeight: 19 }}>
                  Operasyon vaka kuyruğu bu oturum için kullanılamıyor. Bu yüzey Super Admin ve MFA doğrulaması gerektirir.
                </Text>
              ) : reviewQueueQuery.data?.length ? (
                reviewQueueQuery.data.map((item, index) => (
                  <View
                    key={`${item.source}-${item.caseId}`}
                    style={{ borderTopWidth: index === 0 ? 0 : 0.5, borderTopColor: colors.border, paddingTop: index === 0 ? 0 : 11, marginTop: index === 0 ? 0 : 11 }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <Text style={{ color: colors.foreground, fontWeight: "600", flex: 1 }}>
                        {item.source === "insurance_claim" ? "Sigorta / Claim" : "Destek"} #{item.caseId}
                      </Text>
                      <Text style={{ color: item.requiresSuperAdmin ? colors.warning : colors.primary, fontSize: 12, fontWeight: "700" }}>{item.status.toUpperCase()}</Text>
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>İş dosyası #{item.requestId}{item.priority ? ` · ${item.priority}` : ""}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: colors.muted }}>İnceleme bekleyen veri-minimize vaka özeti bulunmuyor.</Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
