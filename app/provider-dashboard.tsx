import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

export default function ProviderDashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  const profileQuery = trpc.providers.myProfile.useQuery(undefined, {
    refetchOnMount: true,
  });
  const jobsQuery = trpc.providers.myJobs.useQuery(undefined, {
    refetchOnMount: true,
  });
  const earningsQuery = trpc.providers.myEarnings.useQuery(undefined, {
    refetchOnMount: true,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      profileQuery.refetch(),
      jobsQuery.refetch(),
      earningsQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [profileQuery, jobsQuery, earningsQuery]);

  const profile = profileQuery.data as any;
  const activeJobs = ((jobsQuery.data as any[]) || []).filter(
    (j) => j.status === "active" || j.status === "in_progress"
  );
  const newRequests = ((jobsQuery.data as any[]) || []).filter(
    (j) => j.status === "pending" && !j.assignedProviderId
  );
  const earnings = earningsQuery.data as any;

  const todayEarnings = earnings?.todayEarnings ?? 0;
  const totalEarnings = earnings?.totalEarnings ?? 0;
  const completedJobs = earnings?.completedJobs ?? 0;
  const rating = profile?.rating ?? 0;
  const moveScore = profile?.moveScore ?? Math.round(rating * 20);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
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
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: colors.foreground }}>
          Usta Paneli
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Loading State */}
        {profileQuery.isLoading && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>Yükleniyor...</Text>
          </View>
        )}

        {/* Error State */}
        {profileQuery.isError && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: colors.error + "10",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <IconSymbol name="wifi.exclamationmark" size={30} color={colors.error} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 6 }}>
              Veri yüklenemedi
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: 16 }}>
              Panel verileri getirilemedi. Lütfen tekrar deneyin.
            </Text>
            <Pressable
              onPress={() => onRefresh()}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={{ color: "#FFF", fontWeight: "600", fontSize: 14 }}>Tekrar Dene</Text>
            </Pressable>
          </View>
        )}

        {profileQuery.isSuccess && (
          <>
            {/* MoveScore Card */}
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: 18,
                padding: 22,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View>
                  <Text style={{ color: "#FFF", fontSize: 14, opacity: 0.9 }}>MoveScore</Text>
                  <Text style={{ color: "#FFF", fontSize: 40, fontWeight: "800", marginTop: 4 }}>
                    {moveScore}
                  </Text>
                  <Text style={{ color: "#FFF", fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    {moveScore >= 90 ? "Harika! Üst sıralarda yer alıyorsunuz." : moveScore >= 70 ? "İyi gidiyorsunuz!" : "Daha fazla iş tamamlayarak yükselin."}
                  </Text>
                </View>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconSymbol name="star.fill" size={26} color="#FFF" />
                </View>
              </View>
            </View>

            {/* Availability Toggle */}
            <Pressable
              onPress={() => setIsAvailable(!isAvailable)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: isAvailable ? colors.success + "15" : colors.muted + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <IconSymbol name={isAvailable ? "checkmark.circle.fill" : "xmark.circle.fill"} size={22} color={isAvailable ? colors.success : colors.muted} />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                    Müsaitlik Durumu
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                    {isAvailable ? "Yeni iş kabul ediyorsunuz" : "Şu an müsait değilsiniz"}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  width: 52,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: isAvailable ? colors.success : colors.muted + "30",
                  padding: 3,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#FFF",
                    alignSelf: isAvailable ? "flex-end" : "flex-start",
                  }}
                />
              </View>
            </Pressable>

            {/* Stats Grid */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: colors.primary + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <IconSymbol name="turkishlirasign.circle.fill" size={18} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>
                  ₺{todayEarnings}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Bugünkü Kazanç</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: colors.success + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <IconSymbol name="briefcase.fill" size={18} color={colors.success} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>
                  {activeJobs.length}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Aktif İşler</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: "#8A5CFF15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <IconSymbol name="star.fill" size={18} color="#8A5CFF" />
                </View>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>
                  {rating > 0 ? rating.toFixed(1) : "—"}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Puan</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: colors.warning + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <IconSymbol name="checkmark.seal.fill" size={18} color={colors.warning} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>
                  {completedJobs}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Tamamlanan</Text>
              </View>
            </View>

            {/* New Job Opportunities */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
                Yeni İş Fırsatları
              </Text>
              {newRequests.length > 0 && (
                <Pressable
                  onPress={() => router.push("/provider-opportunities" as any)}
                  style={{
                    minWidth: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 8,
                  }}
                >
                  <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "800" }}>{newRequests.length}</Text>
                </Pressable>
              )}
            </View>

            {newRequests.length > 0 ? (
              newRequests.slice(0, 5).map((req) => (
                <Pressable
                  key={req.id}
                  onPress={() => router.push(`/provider-opportunities?requestId=${req.id}` as any)}
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.card,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 10,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, flex: 1 }} numberOfLines={1}>
                      {req.title || "Hizmet Talebi"}
                    </Text>
                    {req.budgetMax && (
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
                        ₺{req.budgetMin || 0}-₺{req.budgetMax}
                      </Text>
                    )}
                  </View>
                  {req.description && (
                    <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }} numberOfLines={2}>
                      {req.description}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <IconSymbol name="location.fill" size={12} color={colors.muted} />
                      <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }} numberOfLines={1}>
                        {req.address || "Konum belirtilmedi"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <IconSymbol name="clock.fill" size={12} color={colors.primary} />
                      <Text style={{ fontSize: 12, color: colors.primary, marginLeft: 4, fontWeight: "600" }}>
                        Teklif Ver
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 40,
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: colors.muted + "10",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <IconSymbol name="briefcase.fill" size={24} color={colors.muted} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                  Şu an yeni iş fırsatı yok
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                  Müsait durumda olduğunuzda yeni talepler burada görünecek
                </Text>
              </View>
            )}

            {/* Total Earnings */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 18,
                marginTop: 20,
                borderWidth: 0.5,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: colors.primary + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <IconSymbol name="turkishlirasign.circle.fill" size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: colors.muted }}>Toplam Kazanç</Text>
                  <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>
                    ₺{totalEarnings}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push("/(tabs)/wallet" as any)}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: colors.primary + "15",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>Cüzdan</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
