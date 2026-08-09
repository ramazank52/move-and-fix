import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ProviderBottomNav } from "@/components/provider-bottom-nav";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  active: "Aktif",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export default function ProviderJobsScreen() {
  const colors = useColors();
  const router = useRouter();
  const jobsQuery = trpc.providers.myJobs.useQuery(undefined, { refetchOnMount: true });
  const jobs = jobsQuery.data ?? [];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ minHeight: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
          <Text style={{ flex: 1, color: colors.foreground, fontSize: 20, lineHeight: 26, fontWeight: "800" }}>İşlerim</Text>
        </View>
        {jobsQuery.isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#FF7A1A" />
          </View>
        ) : jobsQuery.isError ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
            <IconSymbol name="wifi.exclamationmark" size={34} color={colors.error} />
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", marginTop: 12 }}>İşler yüklenemedi</Text>
            <Pressable onPress={() => jobsQuery.refetch()} style={{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9, backgroundColor: "#FF7A1A" }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={jobsQuery.isRefetching} onRefresh={jobsQuery.refetch} tintColor="#FF7A1A" />}
            contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 10 }}
            ListEmptyComponent={
              <View style={{ flex: 1, minHeight: 420, alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="briefcase.fill" size={34} color={colors.muted} />
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", marginTop: 12 }}>Henüz atanmış iş yok</Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>Kabul edilen işler burada görünecek.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (item.status === "active") router.push(`/tracking/live?requestId=${item.id}` as never);
                }}
                style={({ pressed }) => ({
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  padding: 14,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>{item.title}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 }} numberOfLines={2}>{item.address || "Konum belirtilmedi"}</Text>
                  </View>
                  <Text style={{ color: item.status === "active" ? "#22C55E" : colors.muted, fontSize: 11, fontWeight: "700" }}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
        <ProviderBottomNav active="jobs" />
      </View>
    </ScreenContainer>
  );
}
