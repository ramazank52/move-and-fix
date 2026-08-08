import { useState } from "react";
import { View, Text, Pressable, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";

type TabType = "active" | "pending" | "completed" | "cancelled";

export default function MyJobsScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [refreshing, setRefreshing] = useState(false);

  const requestsQuery = trpc.requests.list.useQuery(undefined, {
    refetchOnMount: true,
  });

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "active", label: "Aktif", icon: "bolt.fill" },
    { key: "pending", label: "Teklifler", icon: "clock.fill" },
    { key: "completed", label: "Tamamlanan", icon: "checkmark.circle.fill" },
    { key: "cancelled", label: "İptal", icon: "xmark.circle.fill" },
  ];

  const allRequests = (requestsQuery.data as any[]) || [];
  const filteredJobs = allRequests.filter((job) => job.status === activeTab);

  const onRefresh = async () => {
    setRefreshing(true);
    await requestsQuery.refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return colors.primary;
      case "pending": return "#F59E0B";
      case "completed": return "#10B981";
      case "cancelled": return "#EF4444";
      default: return colors.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Aktif";
      case "pending": return "Bekleyen";
      case "completed": return "Tamamlandı";
      case "cancelled": return "İptal";
      default: return status;
    }
  };

  const renderJob = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => router.push(`/job/${item.id}` as any)}
      style={({ pressed }) => [
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          borderWidth: 0.5,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, flex: 1 }} numberOfLines={1}>
          {item.title || "Hizmet Talebi"}
        </Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            backgroundColor: getStatusColor(item.status) + "15",
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: getStatusColor(item.status) }}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      {item.description && (
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <IconSymbol name="location.fill" size={12} color={colors.muted} />
          <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }} numberOfLines={1}>
            {item.address || "Konum belirtilmedi"}
          </Text>
        </View>
        {item.budgetMax && (
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
            ₺{item.budgetMin || 0} - ₺{item.budgetMax}
          </Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="px-5 pt-6">
      {/* Title */}
      <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground, marginBottom: 20 }}>
        İşlerim
      </Text>

      {/* Tab Pills */}
      <View style={{ flexDirection: "row", marginBottom: 20, gap: 8 }}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 16,
                backgroundColor: activeTab === tab.key ? colors.primary : colors.card,
                borderWidth: 0.5,
                borderColor: activeTab === tab.key ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
                shadowColor: activeTab === tab.key ? colors.primary : "transparent",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: activeTab === tab.key ? 2 : 0,
              },
            ]}
          >
            <IconSymbol
              name={tab.icon as any}
              size={13}
              color={activeTab === tab.key ? "#FFF" : colors.muted}
            />
            <Text
              style={{
                color: activeTab === tab.key ? "#FFFFFF" : colors.muted,
                fontWeight: "700",
                fontSize: 13,
                marginLeft: 5,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Loading State */}
      {requestsQuery.isLoading && (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>Yükleniyor...</Text>
        </View>
      )}

      {/* Error State */}
      {requestsQuery.isError && (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
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
            Bir şeyler ters gitti
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: 16 }}>
            İşlemler yüklenemedi. Lütfen tekrar deneyin.
          </Text>
          <Pressable
            onPress={() => requestsQuery.refetch()}
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

      {/* Job List */}
      {requestsQuery.isSuccess && (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          renderItem={renderJob}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  backgroundColor: colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              >
                <IconSymbol name="briefcase.fill" size={30} color={colors.muted} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 6 }}>
                {activeTab === "active" && "Aktif işiniz yok"}
                {activeTab === "pending" && "Bekleyen teklif yok"}
                {activeTab === "completed" && "Tamamlanan iş yok"}
                {activeTab === "cancelled" && "İptal edilen iş yok"}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: 16 }}>
                Yeni bir hizmet talebi oluşturarak başlayın
              </Text>
              <Pressable
                onPress={() => router.push("/create-service" as any)}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <IconSymbol name="plus" size={16} color="#FFF" />
                <Text style={{ color: "#FFF", fontWeight: "600", fontSize: 14, marginLeft: 6 }}>
                  Hizmet Talebi Oluştur
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}
