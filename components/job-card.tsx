import { Text, View, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Job } from "@/lib/data/jobs";
import { router } from "expo-router";

interface Props {
  job: Job;
}

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

export function JobCard({ job }: Props) {
  const colors = useColors();
  const statusColor = statusColors[job.status] || colors.muted;

  return (
    <Pressable
      onPress={() => router.push(`/job/${job.id}` as any)}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          opacity: pressed ? 0.9 : 1,
          borderWidth: 1,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, flex: 1 }}>
          {job.title}
        </Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: statusColor + "20",
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: statusColor }}>
            {statusLabels[job.status]}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 14, color: colors.muted, marginTop: 6 }}>{job.providerName}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
        <Text style={{ fontSize: 13, color: colors.muted }}>{job.location}</Text>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>{job.price}</Text>
      </View>
      <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>{job.date}</Text>
    </Pressable>
  );
}
