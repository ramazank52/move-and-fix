import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type FilterKey = "active" | "offers" | "scheduled" | "completed";
type LifecycleStatus =
  | "scheduled"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | null;

type FilterableJob = {
  status: string;
  lifecycleStatus: LifecycleStatus;
};

const FILTERS: readonly { key: FilterKey; label: string }[] = [
  { key: "active", label: "Aktif" },
  { key: "offers", label: "Teklifler" },
  { key: "scheduled", label: "Planlanan" },
  { key: "completed", label: "Tamamlanan" },
];

const STATUS_META: Record<
  Exclude<LifecycleStatus, null> | "offers",
  { label: string; color: string; background: string }
> = {
  offers: { label: "Teklif Bekliyor", color: "#F59E0B", background: "#F59E0B1F" },
  scheduled: { label: "Planlandı", color: "#8A5CFF", background: "#8A5CFF1F" },
  on_the_way: { label: "Yolda", color: "#3B82F6", background: "#3B82F61F" },
  arrived: { label: "Geldi", color: "#06B6D4", background: "#06B6D41F" },
  in_progress: { label: "İş Başladı", color: "#22C55E", background: "#22C55E1F" },
  completed: { label: "Tamamlandı", color: "#22C55E", background: "#22C55E1F" },
  cancelled: { label: "İptal", color: "#EF4444", background: "#EF44441F" },
};

function formatMoney(value: number | string | null | undefined) {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `₺${numeric.toLocaleString("tr-TR")}` : null;
}

function getLifecycle(job: FilterableJob): Exclude<LifecycleStatus, null> | "offers" {
  if (job.status === "pending") return "offers";
  if (job.status === "completed") return "completed";
  if (job.status === "cancelled") return "cancelled";
  return job.lifecycleStatus ?? "scheduled";
}

function matchesFilter(job: FilterableJob, filter: FilterKey) {
  const lifecycle = getLifecycle(job);
  if (filter === "offers") return job.status === "pending";
  if (filter === "scheduled") return job.status === "active" && lifecycle === "scheduled";
  if (filter === "completed") return lifecycle === "completed" || lifecycle === "cancelled";
  return job.status === "active" && lifecycle !== "scheduled";
}

export default function MyJobsScreen() {
  const colors = useColors();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("active");
  const [refreshing, setRefreshing] = useState(false);
  const requestsQuery = trpc.requests.list.useQuery(undefined, { refetchOnMount: true });

  const jobs = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((filter) => [
          filter.key,
          jobs.filter((job) => matchesFilter(job, filter.key)).length,
        ]),
      ) as Record<FilterKey, number>,
    [jobs],
  );
  const filteredJobs = useMemo(
    () => jobs.filter((job) => matchesFilter(job, activeFilter)),
    [activeFilter, jobs],
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await requestsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const openJob = (job: (typeof jobs)[number]) => {
    if (job.status === "active") {
      router.push(`/tracking/live?requestId=${job.id}` as never);
      return;
    }
    router.push(`/job/${job.id}` as never);
  };

  const renderJob = ({ item: job }: { item: (typeof jobs)[number] }) => {
    const lifecycle = getLifecycle(job);
    const status = STATUS_META[lifecycle];
    const acceptedPrice = formatMoney(job.acceptedPrice);
    const budget =
      job.budgetMin != null && job.budgetMax != null
        ? `${formatMoney(job.budgetMin)} – ${formatMoney(job.budgetMax)}`
        : null;
    const actionLabel =
      job.status === "pending"
        ? "Teklifleri Gör"
        : job.status === "active"
          ? "İşi Takip Et"
          : "Detayı Gör";

    return (
      <Pressable
        onPress={() => openJob(job)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.serviceIcon, { backgroundColor: `${colors.primary}18` }]}>
            <IconSymbol name="wrench.and.screwdriver.fill" size={22} color={colors.primary} />
          </View>
          <View style={styles.cardHeading}>
            <Text style={[styles.category, { color: colors.primary }]}>
              {job.categoryName ?? "Hizmet"}
            </Text>
            <Text style={[styles.jobTitle, { color: colors.foreground }]} numberOfLines={2}>
              {job.title}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {job.providerName ? (
          <View style={[styles.providerRow, { borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: `${colors.primary}1F` }]}>
              <IconSymbol name="person.fill" size={18} color={colors.primary} />
            </View>
            <View style={styles.providerCopy}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Profesyonel</Text>
              <Text style={[styles.providerName, { color: colors.foreground }]} numberOfLines={1}>
                {job.providerName}
              </Text>
            </View>
            {job.etaMinutes != null ? (
              <View style={styles.etaRow}>
                <IconSymbol name="clock.fill" size={14} color={colors.muted} />
                <Text style={[styles.etaText, { color: colors.muted }]}>{job.etaMinutes} dk</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <IconSymbol name="calendar" size={16} color={colors.muted} />
            <Text style={[styles.metaValue, { color: colors.muted }]}>
              {new Date(job.createdAt).toLocaleDateString("tr-TR")}
            </Text>
          </View>
          {job.address ? (
            <View style={styles.metaItem}>
              <IconSymbol name="location.fill" size={16} color={colors.muted} />
              <Text style={[styles.metaValue, { color: colors.muted }]} numberOfLines={1}>
                {job.address}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.cardBottom, { borderTopColor: colors.border }]}>
          <View style={styles.priceCopy}>
            <Text style={[styles.metaLabel, { color: colors.muted }]}>
              {acceptedPrice ? "Kabul Edilen Teklif" : "Bütçe"}
            </Text>
            <Text style={[styles.price, { color: colors.foreground }]}>
              {acceptedPrice ?? budget ?? "Teklif bekleniyor"}
            </Text>
          </View>
          <View style={styles.actionRow}>
            {job.providerUserId ? (
              <Pressable
                accessibilityLabel={`${job.providerName ?? "Profesyonel"} ile mesajlaş`}
                onPress={(event) => {
                  event.stopPropagation();
                  router.push(
                    `/chat/${job.id}?otherUserId=${job.providerUserId}` as never,
                  );
                }}
                style={({ pressed }) => [
                  styles.messageButton,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <IconSymbol name="message.fill" size={17} color={colors.foreground} />
              </Pressable>
            ) : null}
            <View style={[styles.primaryAction, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryActionText}>{actionLabel}</Text>
              <IconSymbol name="chevron.right" size={15} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>İşlerim</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Tüm hizmetlerini tek yerden takip et</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filters}
      >
        {FILTERS.map((filter) => {
          const selected = activeFilter === filter.key;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              style={({ pressed }) => [
                styles.filter,
                {
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: selected ? "#FFFFFF" : colors.muted }]}>
                {filter.label}
              </Text>
              <View
                style={[
                  styles.filterCount,
                  { backgroundColor: selected ? "#FFFFFF24" : colors.background },
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    { color: selected ? "#FFFFFF" : colors.foreground },
                  ]}
                >
                  {counts[filter.key]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {requestsQuery.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateDescription, { color: colors.muted }]}>İşlerin yükleniyor...</Text>
        </View>
      ) : requestsQuery.error ? (
        <View style={styles.centerState}>
          <IconSymbol name="wifi.exclamationmark" size={42} color={colors.error} />
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>İşlerin alınamadı</Text>
          <Text style={[styles.stateDescription, { color: colors.muted }]}>
            {requestsQuery.error.message}
          </Text>
          <Pressable
            onPress={() => requestsQuery.refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.76 : 1 },
            ]}
          >
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderJob}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <IconSymbol name="briefcase.fill" size={32} color={colors.muted} />
              </View>
              <Text style={[styles.stateTitle, { color: colors.foreground }]}>Bu bölümde iş yok</Text>
              <Text style={[styles.stateDescription, { color: colors.muted }]}>
                Durumu değişen hizmetlerin burada otomatik olarak görünür.
              </Text>
              {activeFilter === "offers" ? (
                <Pressable
                  onPress={() => router.push("/create-service" as never)}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.76 : 1 },
                  ]}
                >
                  <Text style={styles.retryText}>Yeni Talep Oluştur</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 3 },
  filters: { flexGrow: 0 },
  filtersContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  filter: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filterText: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  filterCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountText: { fontSize: 11, lineHeight: 15, fontWeight: "800" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  emptyState: { alignItems: "center", paddingTop: 50, paddingHorizontal: 26 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stateTitle: { fontSize: 18, lineHeight: 24, fontWeight: "800", textAlign: "center", marginTop: 12 },
  stateDescription: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 7 },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  retryText: { color: "#FFFFFF", fontSize: 14, lineHeight: 19, fontWeight: "800" },
  listContent: { paddingHorizontal: 16, paddingBottom: 112 },
  card: { borderWidth: 1, borderRadius: 20, padding: 15, marginBottom: 12 },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start" },
  serviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  cardHeading: { flex: 1, minWidth: 0, paddingRight: 8 },
  category: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  jobTitle: { fontSize: 17, lineHeight: 22, fontWeight: "800", marginTop: 2 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 },
  statusText: { fontSize: 10, lineHeight: 14, fontWeight: "800" },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 13,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  providerCopy: { flex: 1, minWidth: 0 },
  providerName: { fontSize: 14, lineHeight: 19, fontWeight: "700", marginTop: 1 },
  etaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  etaText: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  metaGrid: { marginTop: 12, gap: 7 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaValue: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 17 },
  cardBottom: {
    borderTopWidth: 1,
    marginTop: 13,
    paddingTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  priceCopy: { flexShrink: 1 },
  metaLabel: { fontSize: 10, lineHeight: 14, fontWeight: "600" },
  price: { fontSize: 15, lineHeight: 20, fontWeight: "800", marginTop: 2 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  messageButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryAction: {
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  primaryActionText: { color: "#FFFFFF", fontSize: 11, lineHeight: 15, fontWeight: "800" },
});
