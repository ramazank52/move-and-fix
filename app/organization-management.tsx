import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";

export default function OrganizationManagementScreen() {
  const colors = useColors();
  const { locale, t } = useTranslation();
  const styles = createStyles(colors);
  const organizations = trpc.organizations.list.useQuery(undefined, { retry: false });
  const organization = organizations.data?.[0] ?? null;
  const input = organization ? { organizationId: organization.id } : undefined;
  const sites = trpc.organizations.sites.useQuery(input!, { enabled: Boolean(input), retry: false });
  const assets = trpc.organizations.assets.useQuery(input!, { enabled: Boolean(input), retry: false });
  const schedules = trpc.organizations.maintenanceSchedules.useQuery(input!, { enabled: Boolean(input), retry: false });
  const batches = trpc.organizations.requestBatches.useQuery(input!, { enabled: Boolean(input), retry: false });
  const invoices = trpc.organizations.invoices.useQuery(input!, { enabled: Boolean(input), retry: false });
  const loading = organizations.isLoading || (Boolean(organization) && (sites.isLoading || assets.isLoading || schedules.isLoading || batches.isLoading || invoices.isLoading));
  const hasError = organizations.isError || sites.isError || assets.isError || schedules.isError || batches.isError || invoices.isError;

  return (
    <ScreenContainer className="flex-1" safeAreaClassName="flex-1" style={styles.screen}>
      <FlatList
        data={organization ? [organization] : []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <>
            <View style={styles.headerRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
                <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
              </Pressable>
              <View style={styles.headerText}><Text style={styles.title}>{t("organization.title")}</Text><Text style={styles.subtitle}>{t("organization.subtitle")}</Text></View>
            </View>
            {loading ? <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>{t("organization.loading")}</Text></View> : null}
            {hasError ? <View style={styles.state}><Text style={styles.errorText}>{t("organization.error")}</Text></View> : null}
            {!loading && !hasError && !organization ? <View style={styles.state}><IconSymbol name="building.2.fill" size={30} color={colors.muted} /><Text style={styles.stateText}>{t("organization.none")}</Text></View> : null}
          </>
        )}
        renderItem={({ item }) => (
          <>
            <View style={styles.organizationCard}>
              <View style={styles.organizationIcon}><IconSymbol name={item.type === "fleet" ? "car.fill" : "building.2.fill"} size={22} color={colors.primary} /></View>
              <View style={styles.flex}><Text style={styles.organizationName}>{item.name}</Text><Text style={styles.organizationMeta}>{item.type} · {item.memberRole}</Text></View>
            </View>
            <Section title={t("organization.sites")} icon="location.fill" empty={t("organization.noSites")} items={sites.data?.map((site) => ({ id: site.id, title: site.name, subtitle: site.address })) ?? []} styles={styles} colors={colors} />
            <Section title={t("organization.assets")} icon="briefcase.fill" empty={t("organization.noAssets")} items={assets.data?.map((asset) => ({ id: asset.id, title: asset.name, subtitle: asset.kind })) ?? []} styles={styles} colors={colors} />
            <Section title={t("organization.schedules")} icon="calendar" empty={t("organization.noSchedules")} items={schedules.data?.map((schedule) => ({ id: schedule.id, title: schedule.title, subtitle: `${schedule.cadence} · ${new Date(schedule.nextRunAt).toLocaleDateString(locale)}` })) ?? []} styles={styles} colors={colors} />
            <Section title={t("organization.batches")} icon="briefcase.fill" empty={t("organization.noBatches")} items={batches.data?.map((batch) => ({ id: batch.id, title: batch.title, subtitle: `${batch.status} · ${batch.requestIds.length}` })) ?? []} styles={styles} colors={colors} />
            <Section title={t("organization.invoices")} icon="calendar" empty={t("organization.noInvoices")} items={invoices.data?.map((invoice) => ({ id: invoice.id, title: invoice.invoiceNumber, subtitle: `${invoice.status} · ${invoice.totalAmount} ${invoice.currency}` })) ?? []} styles={styles} colors={colors} />
          </>
        )}
      />
    </ScreenContainer>
  );
}

function Section({ title, icon, empty, items, styles, colors }: { title: string; icon: Parameters<typeof IconSymbol>[0]["name"]; empty: string; items: { id: number; title: string; subtitle: string }[]; styles: ReturnType<typeof createStyles>; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.section}><View style={styles.sectionTitleRow}><IconSymbol name={icon} size={17} color={colors.primary} /><Text style={styles.sectionTitle}>{title}</Text></View>{items.length ? items.map((item) => <View key={item.id} style={styles.row}><View style={styles.flex}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowSubtitle}>{item.subtitle}</Text></View></View>) : <Text style={styles.empty}>{empty}</Text>}</View>;
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingBottom: 104, flexGrow: 1 }, flex: { flex: 1 }, pressed: { opacity: 0.65 },
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 }, back: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginRight: 11 }, headerText: { flex: 1 }, title: { color: colors.foreground, fontSize: 22, lineHeight: 28, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
    state: { minHeight: 132, padding: 20, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, stateText: { color: colors.muted, textAlign: "center", fontSize: 14, lineHeight: 20 }, errorText: { color: colors.error, textAlign: "center", fontSize: 14, lineHeight: 20 },
    organizationCard: { marginBottom: 14, flexDirection: "row", alignItems: "center", padding: 15, backgroundColor: colors.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, organizationIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.primary}1A`, marginRight: 12 }, organizationName: { color: colors.foreground, fontSize: 16, lineHeight: 22, fontWeight: "800" }, organizationMeta: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2, textTransform: "capitalize" },
    section: { padding: 14, marginBottom: 12, backgroundColor: colors.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }, sectionTitle: { color: colors.foreground, fontSize: 14, lineHeight: 20, fontWeight: "800" }, row: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, rowTitle: { color: colors.foreground, fontSize: 14, lineHeight: 19, fontWeight: "700" }, rowSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2, textTransform: "capitalize" }, empty: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingVertical: 7 },
  });
}
