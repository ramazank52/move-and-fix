import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useLocalization } from "@/lib/i18n";
import { useThemeContext } from "@/lib/theme-provider";

export default function GeneralSettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { logout } = useAuth();
  const { colorScheme, setColorScheme } = useThemeContext();
  const { language, currency, setCurrency, translate } = useLocalization();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    Alert.alert(translate("logoutConfirmTitle"), translate("logoutConfirmBody"), [
      { text: translate("cancel"), style: "cancel" },
      {
        text: translate("logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/" as never);
        },
      },
    ]);
  };

  const chooseCurrency = () => {
    Alert.alert(translate("currency"), translate("currencySettlementNotice"), [
      { text: translate("currencyTry"), onPress: () => void setCurrency("TRY") },
      {
        text: translate("currencyUsd"),
        onPress: () => Alert.alert(translate("currencyUnavailableTitle"), translate("currencyUnavailableBody", { currency: "USD" })),
      },
      {
        text: translate("currencyEur"),
        onPress: () => Alert.alert(translate("currencyUnavailableTitle"), translate("currencyUnavailableBody", { currency: "EUR" })),
      },
      { text: translate("cancel"), style: "cancel" },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>{translate("settingsSecurity")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <LinkRow label={translate("language")} value={language === "tr" ? "Türkçe" : language.toUpperCase()} onPress={() => router.push("/settings/language" as never)} styles={styles} colors={colors} />
          <View style={[styles.row, styles.divider]}>
            <Text style={styles.rowLabel}>{translate("darkMode")}</Text>
            <Switch
              accessibilityLabel={translate("darkMode")}
              value={colorScheme === "dark"}
              onValueChange={(enabled) => setColorScheme(enabled ? "dark" : "light")}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={[styles.row, styles.divider]}>
            <Text style={styles.rowLabel}>{translate("notifications")}</Text>
            <Switch
              accessibilityLabel={translate("notifications")}
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <LinkRow
            label={translate("currency")}
            value={currency === "TRY" ? translate("currencyTry") : currency}
            onPress={chooseCurrency}
            styles={styles}
            colors={colors}
            isLast
          />
        </View>

        <View style={styles.card}>
          <LinkRow label={translate("activeDevices")} onPress={() => router.push("/settings/security" as never)} styles={styles} colors={colors} />
          <LinkRow label={translate("about")} onPress={() => router.push("/settings/help" as never)} styles={styles} colors={colors} />
          <LinkRow label={translate("privacyPolicy")} onPress={() => router.push("/legal" as never)} styles={styles} colors={colors} />
          <LinkRow label={translate("terms")} onPress={() => router.push("/legal" as never)} styles={styles} colors={colors} isLast />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
        >
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={19} color={colors.error} />
          <Text style={styles.logoutText}>{translate("logout")}</Text>
        </Pressable>

        <Text style={styles.version}>{translate("version")}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function LinkRow({
  label,
  value,
  onPress,
  styles,
  colors,
  isLast = false,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useColors>;
  isLast?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.divider, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <IconSymbol name="chevron.right" size={16} color={colors.muted} />
      </View>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, color: colors.foreground, textAlign: "center", fontSize: 17, lineHeight: 22, fontWeight: "700" },
    headerSpacer: { width: 36 },
    content: { padding: 20, paddingBottom: 36, gap: 18 },
    card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    row: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    rowLabel: { color: colors.foreground, fontSize: 15, lineHeight: 20, fontWeight: "500" },
    rowValue: { color: colors.primary, fontSize: 14, lineHeight: 20, fontWeight: "600" },
    logoutButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${colors.error}45`,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
    },
    logoutText: { color: colors.error, fontSize: 15, lineHeight: 20, fontWeight: "700" },
    version: { color: colors.muted, textAlign: "center", fontSize: 12, lineHeight: 18 },
    pressed: { opacity: 0.68 },
  });
}
