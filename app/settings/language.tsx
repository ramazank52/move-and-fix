import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { LANGUAGES, useLocalization } from "@/lib/i18n";

export default function LanguageSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { language, isRTL, ready, setLanguage, translate } = useLocalization();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel={translate("back")}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "center" }]}>{translate("language")}</Text>
        <View style={styles.backButton} />
      </View>
      {!ready ? (
        <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.description, { color: colors.muted, textAlign: isRTL ? "right" : "left" }]}>{translate("languageSelectionHelp")}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {LANGUAGES.map((item, index) => {
              const selected = item.code === language;
              return (
                <Pressable
                  key={item.code}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => void setLanguage(item.code)}
                  style={({ pressed }) => [styles.row, index < LANGUAGES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pressed && styles.pressed]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600", textAlign: item.isRTL ? "right" : "left" }}>{item.nativeName}</Text>
                    <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2, textAlign: item.isRTL ? "right" : "left" }}>{item.name}</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View>
                </Pressable>
              );
            })}
          </View>
          {isRTL ? <Text style={[styles.rtlNote, { color: colors.warning, textAlign: "right" }]}>{translate("restartRequired")}</Text> : null}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: "700" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 14 },
  description: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  row: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  rtlNote: { fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.65 },
});
