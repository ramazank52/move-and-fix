import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { localeForLanguage } from "@/lib/i18n-core";
import { trpc } from "@/lib/trpc";

function formatSessionDate(value: Date | string, language: Parameters<typeof localeForLanguage>[0]) {
  return new Date(value).toLocaleString(localeForLanguage(language), { dateStyle: "medium", timeStyle: "short" });
}

export default function SecuritySettingsScreen() {
  const colors = useColors();
  const { t, language } = useTranslation();
  const router = useRouter();
  const utils = trpc.useUtils();
  const sessions = trpc.auth.sessions.useQuery();
  const revokeSession = trpc.auth.revokeSession.useMutation({
    onSuccess: () => utils.auth.sessions.invalidate(),
    onError: (error) => Alert.alert(t("security.revokeFailed"), error.message),
  });
  const revokeOthers = trpc.auth.revokeOtherSessions.useMutation({
    onSuccess: async ({ revokedCount }) => {
      await utils.auth.sessions.invalidate();
      Alert.alert(t("security.sessionsRevoked"), t("security.sessionsRevokedBody", { count: revokedCount }));
    },
    onError: (error) => Alert.alert(t("security.sessionsRevokeFailed"), error.message),
  });

  const confirmRevoke = (sessionId: string, isCurrent: boolean) => {
    Alert.alert(
      isCurrent ? t("security.revokeCurrentTitle") : t("security.revokeDeviceTitle"),
      isCurrent ? t("security.revokeCurrentBody") : t("security.revokeDeviceBody"),
      [
        { text: t("security.cancel"), style: "cancel" },
        { text: t("security.revoke"), style: "destructive", onPress: () => revokeSession.mutate({ sessionId }) },
      ],
    );
  };

  const confirmRevokeOthers = () => {
    Alert.alert(t("security.revokeOthersTitle"), t("security.revokeOthersBody"), [
      { text: t("security.cancel"), style: "cancel" },
      { text: t("security.revokeOthers"), style: "destructive", onPress: () => revokeOthers.mutate() },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} style={styles.screen}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel={t("security.back")} onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("security.title")}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.notice, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}35` }]}>
          <IconSymbol name="lock.shield.fill" size={20} color={colors.primary} />
          <View style={styles.noticeText}>
            <Text style={[styles.noticeTitle, { color: colors.foreground }]}>{t("security.noticeTitle")}</Text>
            <Text style={[styles.noticeBody, { color: colors.muted }]}>{t("security.noticeBody")}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("security.activeDevices")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("security.revokeOthers")}
            disabled={revokeOthers.isPending || !sessions.data?.sessions.some((item) => item.id !== sessions.data?.currentSessionId && !item.revokedAt)}
            onPress={confirmRevokeOthers}
            style={({ pressed }) => [styles.revokeOthers, { borderColor: colors.error }, (pressed || revokeOthers.isPending) && styles.pressed]}
          >
            <Text style={[styles.revokeOthersText, { color: colors.error }]}>{t("security.revokeOthers")}</Text>
          </Pressable>
        </View>

        {sessions.isLoading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : sessions.isError ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="wifi.exclamationmark" size={22} color={colors.error} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("security.loadFailed")}</Text>
            <Pressable onPress={() => sessions.refetch()} style={({ pressed }) => [styles.retry, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.retryText}>{t("security.retry")}</Text>
            </Pressable>
          </View>
        ) : sessions.data?.sessions.length ? (
          <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {sessions.data.sessions.map((session, index) => {
              const isCurrent = session.id === sessions.data?.currentSessionId;
              const inactive = Boolean(session.revokedAt) || new Date(session.expiresAt).getTime() <= Date.now();
              return (
                <View key={session.id} style={[styles.sessionRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <IconSymbol name={isCurrent ? "person.badge.shield.checkmark.fill" : "lock.fill"} size={20} color={inactive ? colors.muted : colors.primary} />
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionNameRow}>
                      <Text style={[styles.sessionName, { color: colors.foreground }]} numberOfLines={1}>{isCurrent ? t("security.currentDevice") : t("security.signedInDevice")}</Text>
                      {isCurrent ? <Text style={[styles.currentBadge, { color: colors.primary, backgroundColor: `${colors.primary}18` }]}>{t("security.active")}</Text> : null}
                    </View>
                    <Text style={[styles.sessionMeta, { color: colors.muted }]} numberOfLines={1}>{session.userAgent || t("security.deviceMissing")}</Text>
                    <Text style={[styles.sessionMeta, { color: colors.muted }]}>{inactive ? t("security.closed") : t("security.lastActivity", { date: formatSessionDate(session.lastSeenAt, language) })}</Text>
                  </View>
                  {!inactive ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={isCurrent ? t("security.revokeCurrentTitle") : t("security.revokeDeviceTitle")}
                      disabled={revokeSession.isPending}
                      onPress={() => confirmRevoke(session.id, isCurrent)}
                      style={({ pressed }) => [styles.sessionAction, (pressed || revokeSession.isPending) && styles.pressed]}
                    >
                      <Text style={[styles.sessionActionText, { color: colors.error }]}>{isCurrent ? t("security.signOut") : t("security.close")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="lock.fill" size={22} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("security.noSessions")}</Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>{t("security.noSessionsBody")}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, lineHeight: 22, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 36, gap: 18 },
  notice: { borderWidth: 1, borderRadius: 16, padding: 15, flexDirection: "row", gap: 12 },
  noticeText: { flex: 1, gap: 3 },
  noticeTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
  noticeBody: { fontSize: 13, lineHeight: 19 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  revokeOthers: { minHeight: 34, borderRadius: 10, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1 },
  revokeOthersText: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
  center: { paddingVertical: 48, alignItems: "center" },
  emptyCard: { alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 16, padding: 22 },
  emptyTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700", textAlign: "center" },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  retry: { minHeight: 38, borderRadius: 10, paddingHorizontal: 14, justifyContent: "center", marginTop: 3 },
  retryText: { color: "#FFFFFF", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  sessionCard: { overflow: "hidden", borderRadius: 16, borderWidth: 1 },
  sessionRow: { minHeight: 90, flexDirection: "row", alignItems: "center", gap: 12, padding: 15 },
  sessionInfo: { flex: 1, gap: 2 },
  sessionNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sessionName: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  currentBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, lineHeight: 14, fontWeight: "700" },
  sessionMeta: { fontSize: 12, lineHeight: 17 },
  sessionAction: { minHeight: 32, paddingHorizontal: 6, justifyContent: "center" },
  sessionActionText: { fontSize: 12, lineHeight: 17, fontWeight: "700" },
  pressed: { opacity: 0.62 },
});
