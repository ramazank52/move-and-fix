import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";

type MenuIcon = Parameters<typeof IconSymbol>[0]["name"];

const PROFILE_MENU: {
  labelKey: "profile.personalInfo" | "profile.addresses" | "profile.paymentMethods" | "wallet" | "profile.favorites" | "profile.pastJobs" | "profile.settingsSecurity";
  icon: MenuIcon;
  color: string;
  route: string;
}[] = [
  { labelKey: "profile.personalInfo", icon: "person.fill", color: "#8B5CF6", route: "/settings/profile-edit" },
  { labelKey: "profile.addresses", icon: "location.fill", color: "#3B82F6", route: "/settings/addresses" },
  { labelKey: "profile.paymentMethods", icon: "creditcard.fill", color: "#10B981", route: "/settings/payments" },
  { labelKey: "wallet", icon: "wallet.pass.fill", color: "#A855F7", route: "/(tabs)/wallet" },
  { labelKey: "profile.favorites", icon: "heart.fill", color: "#EF4444", route: "/settings/favorites" },
  { labelKey: "profile.pastJobs", icon: "briefcase.fill", color: "#F59E0B", route: "/my-jobs" },
  { labelKey: "profile.settingsSecurity", icon: "gearshape.fill", color: "#64748B", route: "/settings/general" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const providerQuery = trpc.providers.myProfile.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
  });

  const displayName = user?.name?.trim() || t("profile.defaultName");
  const initial = displayName.charAt(0).toLocaleUpperCase(locale);
  const provider = providerQuery.data;
  const rawRating = Number(provider?.rating ?? 0);
  const rating = rawRating > 5 ? rawRating / 10 : rawRating;
  const reviewCount = Number(provider?.reviewCount ?? 0);

  return (
    <ScreenContainer className="flex-1" safeAreaClassName="flex-1" style={styles.screen}>
      <FlatList
        data={PROFILE_MENU}
        keyExtractor={(item) => item.labelKey}
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <>
            <Text style={styles.title}>{t("profile")}</Text>
            <View style={styles.identityCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.identityText}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={styles.name}>{displayName}</Text>
                  {provider?.isVerified === 1 ? (
                    <IconSymbol name="checkmark.seal.fill" size={17} color={colors.primary} />
                  ) : null}
                </View>
                {provider ? (
                  <View style={styles.ratingRow}>
                    <IconSymbol name="star.fill" size={15} color="#FBBF24" />
                    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                    <Text style={styles.secondaryText}>({t("profile.reviewCount", { count: reviewCount })})</Text>
                  </View>
                ) : (
                  <Text numberOfLines={1} style={styles.secondaryText}>
                    {user?.email || t("profile.defaultMember")}
                  </Text>
                )}
              </View>
            </View>
          </>
        )}
        renderItem={({ item, index }) => (
          <View style={[styles.menuCard, index === 0 && styles.menuCardTop, index === PROFILE_MENU.length - 1 && styles.menuCardBottom]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(item.labelKey)}
              onPress={() => router.push(item.route as never)}
              style={({ pressed }) => [
                styles.menuRow,
                index < PROFILE_MENU.length - 1 && styles.menuDivider,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: `${item.color}1A` }]}>
                <IconSymbol name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 104 },
    title: { color: colors.foreground, fontSize: 25, lineHeight: 31, fontWeight: "800", marginBottom: 14 },
    identityCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 0.5,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    avatarText: { color: "#FFFFFF", fontSize: 26, lineHeight: 32, fontWeight: "800" },
    identityText: { flex: 1, marginLeft: 14, minWidth: 0 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: { flexShrink: 1, color: colors.foreground, fontSize: 18, lineHeight: 24, fontWeight: "800" },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
    ratingText: { color: colors.foreground, fontSize: 13, lineHeight: 18, fontWeight: "700" },
    secondaryText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
    menuCard: {
      backgroundColor: colors.card,
      borderLeftWidth: 0.5,
      borderRightWidth: 0.5,
      borderColor: colors.border,
      overflow: "hidden",
    },
    menuCardTop: { borderTopWidth: 0.5, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
    menuCardBottom: { borderBottomWidth: 0.5, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
    menuRow: { minHeight: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
    menuDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    iconBox: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    menuLabel: { flex: 1, color: colors.foreground, fontSize: 15, lineHeight: 20, fontWeight: "600", marginLeft: 13 },
    pressed: { opacity: 0.68 },
  });
}
