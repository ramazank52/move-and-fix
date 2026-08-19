import { useRouter } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function FavoritesScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const favoritesQuery = trpc.provider.favoriteList.useQuery();
  const removeMutation = trpc.provider.favoriteRemove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.provider.favoriteList.invalidate(),
        utils.provider.favoriteStatus.invalidate(),
      ]);
    },
    onError: (error) => Alert.alert("Favori güncellenemedi", error.message),
  });

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityLabel="Geri dön"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Favorilerim</Text>
        <View style={styles.headerSpacer} />
      </View>

      {favoritesQuery.isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateDescription, { color: colors.muted }]}>Favorilerin yükleniyor…</Text>
        </View>
      ) : favoritesQuery.isError ? (
        <View style={styles.stateContainer}>
          <IconSymbol name="wifi.exclamationmark" size={42} color={colors.error} />
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>Favoriler yüklenemedi</Text>
          <Text style={[styles.stateDescription, { color: colors.muted }]}>
            Bağlantını kontrol edip yeniden deneyebilirsin.
          </Text>
          <Pressable
            onPress={() => favoritesQuery.refetch()}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Yeniden Dene</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={favoritesQuery.data ?? []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            (favoritesQuery.data?.length ?? 0) === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.stateContainer}>
              <IconSymbol name="heart.fill" size={42} color={colors.muted} />
              <Text style={[styles.stateTitle, { color: colors.foreground }]}>Henüz favorin yok</Text>
              <Text style={[styles.stateDescription, { color: colors.muted }]}>
                Beğendiğin profesyonelleri kaydederek daha sonra hızla ulaşabilirsin.
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/explore")}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Profesyonelleri Keşfet</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.displayName} profilini aç`}
                onPress={() => router.push(`/provider/${item.id}` as never)}
                style={({ pressed }) => [styles.providerContent, pressed && styles.pressed]}
              >
                <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {item.displayName.charAt(0).toLocaleUpperCase("tr-TR")}
                  </Text>
                </View>
                <View style={styles.providerInfo}>
                  <View style={styles.nameRow}>
                    <Text numberOfLines={1} style={[styles.providerName, { color: colors.foreground }]}>
                      {item.displayName}
                    </Text>
                    {item.isVerified === 1 ? (
                      <IconSymbol name="checkmark.seal.fill" size={16} color={colors.primary} />
                    ) : null}
                  </View>
                  <Text style={[styles.providerMeta, { color: colors.muted }]}>
                    {item.rating ? `★ ${Number(item.rating).toFixed(1)}` : "Yeni profesyonel"}
                    {item.completedJobs ? ` • ${item.completedJobs} tamamlanan iş` : ""}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityLabel={`${item.displayName} profesyonelini favorilerden çıkar`}
                disabled={removeMutation.isPending}
                onPress={() => removeMutation.mutate({ providerId: item.id })}
                style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}
              >
                <IconSymbol name="heart.fill" size={22} color={colors.error} />
              </Pressable>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomWidth: 0.5,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
  headerSpacer: { width: 32 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", lineHeight: 22, textAlign: "center" },
  listContent: { gap: 12, padding: 16 },
  emptyListContent: { flexGrow: 1 },
  card: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 76,
    overflow: "hidden",
  },
  providerContent: { alignItems: "center", flex: 1, flexDirection: "row", padding: 14 },
  avatar: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  avatarText: { fontSize: 18, fontWeight: "700", lineHeight: 23 },
  providerInfo: { flex: 1, marginLeft: 12 },
  nameRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  providerName: { flexShrink: 1, fontSize: 15, fontWeight: "600", lineHeight: 20 },
  providerMeta: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  favoriteButton: { alignItems: "center", justifyContent: "center", minHeight: 48, paddingHorizontal: 16 },
  stateContainer: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  stateTitle: { fontSize: 18, fontWeight: "700", lineHeight: 24, marginTop: 14, textAlign: "center" },
  stateDescription: { fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
  primaryButton: { borderRadius: 12, marginTop: 18, minHeight: 48, paddingHorizontal: 20, justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", lineHeight: 20, textAlign: "center" },
  pressed: { opacity: 0.72 },
});
