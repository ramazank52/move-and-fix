import { useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { JobCard } from "@/components/job-card";
import { SAMPLE_JOBS } from "@/lib/data/jobs";
import { IconSymbol } from "@/components/ui/icon-symbol";

type TabType = "active" | "pending" | "completed" | "cancelled";

export default function MyJobsScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<TabType>("active");

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "active", label: "Aktif", icon: "bolt.fill" },
    { key: "pending", label: "Bekleyen", icon: "clock.fill" },
    { key: "completed", label: "Tamamlanan", icon: "checkmark.circle.fill" },
    { key: "cancelled", label: "İptal", icon: "xmark.circle.fill" },
  ];

  const filteredJobs = SAMPLE_JOBS.filter((job) => job.status === activeTab);

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

      {/* Job List */}
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        renderItem={({ item }) => <JobCard job={item} />}
        showsVerticalScrollIndicator={false}
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
              {activeTab === "pending" && "Bekleyen iş yok"}
              {activeTab === "completed" && "Tamamlanan iş yok"}
              {activeTab === "cancelled" && "İptal edilen iş yok"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
              Yeni bir hizmet talebi oluşturarak başlayın
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
