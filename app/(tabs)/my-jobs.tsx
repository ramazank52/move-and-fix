import { Text, View, FlatList, Pressable } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { JobCard } from "@/components/job-card";
import { SAMPLE_JOBS } from "@/lib/data/jobs";

type TabType = "active" | "pending" | "completed" | "cancelled";

export default function MyJobsScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<TabType>("active");

  const tabs: { key: TabType; label: string }[] = [
    { key: "active", label: "Aktif" },
    { key: "pending", label: "Bekleyen" },
    { key: "completed", label: "Tamamlanan" },
    { key: "cancelled", label: "İptal" },
  ];

  const filteredJobs = SAMPLE_JOBS.filter((job) => job.status === activeTab);

  return (
    <ScreenContainer className="px-4 pt-4">
      <Text className="text-2xl font-bold text-foreground mb-4">İşlerim</Text>
      <View className="flex-row mb-4 gap-2">
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={({ pressed }) => [
              {
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: activeTab === tab.key ? colors.primary : colors.surface,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: activeTab === tab.key ? "#FFFFFF" : colors.muted,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        renderItem={({ item }) => <JobCard job={item} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Text className="text-muted text-base">Bu kategoride iş bulunmuyor</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
