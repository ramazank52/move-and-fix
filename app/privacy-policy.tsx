import { Head } from "expo-router/build/head";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { LEGAL_DOCUMENTS } from "@/lib/data/legal";

type PolicyLanguage = "tr" | "en";

const POLICY_LANGUAGE_LABELS: Record<PolicyLanguage, string> = {
  tr: "Türkçe",
  en: "English",
};

/**
 * Public, unauthenticated privacy-policy route for store crawlers and direct links.
 * The legal policy body is deliberately sourced only from the existing approved
 * legal document catalog; no legal wording is generated in this screen.
 */
export default function PrivacyPolicyScreen() {
  const colors = useColors();
  const [language, setLanguage] = useState<PolicyLanguage>("tr");
  const turkishPolicy = useMemo(
    () => LEGAL_DOCUMENTS.find((document) => document.id === "privacy"),
    [],
  );
  const hasApprovedEnglishPolicy = false;
  const isTurkish = language === "tr";

  const pageTitle = isTurkish ? "Move&Fix Gizlilik Politikası" : "Move&Fix Privacy Policy";
  const updatedLabel = isTurkish ? "Son güncelleme" : "Last updated";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={
            isTurkish
              ? "Move&Fix gizlilik politikası ve kişisel veri işleme bilgileri."
              : "Move&Fix privacy policy and personal data processing information."
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
              {isTurkish
                ? "Bu sayfa giriş gerektirmeden herkese açıktır."
                : "This page is publicly available without sign-in."}
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
                  accessibilityLabel={`${POLICY_LANGUAGE_LABELS[policyLanguage]} gizlilik politikası`}
                  accessibilityHint="Gizlilik politikası görüntüleme dilini değiştirir"
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

          {isTurkish && turkishPolicy ? (
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
                <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>{turkishPolicy.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {updatedLabel}: {turkishPolicy.lastUpdated} · {turkishPolicy.version}
                </Text>
              </View>
              <Text selectable style={{ color: colors.foreground, fontSize: 15, lineHeight: 24 }}>
                {turkishPolicy.content}
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
              <Text accessibilityRole="header" style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>
                Privacy Policy
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 24 }}>
                {hasApprovedEnglishPolicy
                  ? ""
                  : "The approved English privacy policy text is not included in the current legal document catalog. The Turkish policy remains available while the approved English text is supplied."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
