import { Head } from "expo-router/build/head";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { PRIVACY_POLICY_TRANSLATIONS } from "@/lib/data/legal";
import { t } from "@/lib/i18n-core";

type PolicyLanguage = "tr" | "en";

const POLICY_LANGUAGE_LABELS: Record<PolicyLanguage, string> = {
  tr: "Türkçe",
  en: "English",
};

/**
 * Public, unauthenticated privacy-policy route for store crawlers and direct links.
 * The legal policy body is deliberately sourced only from the existing approved
 * legal document catalog; review state is never hidden from the public.
 */
export default function PrivacyPolicyScreen() {
  const colors = useColors();
  const [language, setLanguage] = useState<PolicyLanguage>("tr");
  const policy = PRIVACY_POLICY_TRANSLATIONS[language];

  const pageTitle = t("privacy.title", language);
  const updatedLabel = t("privacy.updated", language);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={
            t("privacy.publicDescription", language)
          }
        />
        <meta name="robots" content="index,follow" />
      </Head>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 40,
        }}
        accessibilityLabel={pageTitle}
      >
        <View style={{ width: "100%", maxWidth: 760, alignSelf: "center" }}>
          <View style={{ gap: 8, marginBottom: 24 }}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 0.5 }}>
              MOVE&FIX
            </Text>
            <Text
              accessibilityRole="header"
              style={{ color: colors.foreground, fontSize: 28, fontWeight: "800", lineHeight: 36 }}
            >
              {pageTitle}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
              {t("privacy.publicNotice", language)}
            </Text>
          </View>

          <View
            accessibilityRole="tablist"
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              padding: 4,
              borderRadius: 12,
              backgroundColor: colors.surface,
              marginBottom: 20,
            }}
          >
            {(["tr", "en"] as PolicyLanguage[]).map((policyLanguage) => {
              const selected = language === policyLanguage;
              return (
                <Pressable
                  key={policyLanguage}
                  onPress={() => setLanguage(policyLanguage)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t("privacy.tabAccessibility", language, { language: POLICY_LANGUAGE_LABELS[policyLanguage] })}
                  accessibilityHint={t("privacy.tabHint", language)}
                  style={({ pressed }) => ({
                    minHeight: 40,
                    justifyContent: "center",
                    paddingHorizontal: 16,
                    borderRadius: 9,
                    backgroundColor: selected ? colors.background : "transparent",
                    opacity: pressed ? 0.72 : 1,
                  })}
                >
                  <Text style={{ color: selected ? colors.foreground : colors.muted, fontSize: 14, fontWeight: "700" }}>
                    {POLICY_LANGUAGE_LABELS[policyLanguage]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            accessibilityRole={policy.reviewStatus === "approved" ? undefined : "alert"}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: policy.reviewStatus === "approved" ? colors.border : colors.warning,
              backgroundColor: colors.surface,
              padding: 14,
              marginBottom: 14,
              gap: 4,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800" }}>
              {policy.authoritative
                ? t("privacy.approvedText", language)
                : t("privacy.pendingLegalReviewTitle", language)}
            </Text>
            {!policy.authoritative ? (
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
                {t("privacy.pendingLegalReviewBody", language)}
              </Text>
            ) : null}
          </View>

          {policy ? (
            <View
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                padding: 20,
                gap: 18,
              }}
            >
              <View style={{ gap: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>{policy.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {updatedLabel}: {policy.lastUpdated} · {policy.version}
                </Text>
              </View>
              <Text selectable style={{ color: colors.foreground, fontSize: 15, lineHeight: 24 }}>
                {policy.content}
              </Text>
            </View>
          ) : (
            <View
              accessibilityRole="alert"
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.warning,
                backgroundColor: colors.surface,
                padding: 20,
                gap: 10,
              }}
            >
              <Text accessibilityRole="header" style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>Policy unavailable</Text>
              <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 24 }}>The requested policy version is not available.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
