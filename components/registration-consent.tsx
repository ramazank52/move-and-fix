import { Text, View, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { REGISTRATION_CONSENTS } from "@/lib/data/legal";

interface RegistrationConsentProps {
  onAllAccepted: () => void;
}

export function RegistrationConsent({ onAllAccepted }: RegistrationConsentProps) {
  const colors = useColors();
  const router = useRouter();
  const [consents, setConsents] = useState<Record<string, boolean>>(
    Object.fromEntries(REGISTRATION_CONSENTS.map((c) => [c.id, false]))
  );

  const allAccepted = REGISTRATION_CONSENTS.filter((c) => c.required).every((c) => consents[c.id]);

  const toggleConsent = (id: string) => {
    setConsents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
        Yasal Onaylar
      </Text>
      <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
        Devam etmek için aşağıdaki tüm maddeleri onaylamanız gerekmektedir.
      </Text>

      {REGISTRATION_CONSENTS.map((consent) => (
        <Pressable
          key={consent.id}
          onPress={() => toggleConsent(consent.id)}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "flex-start",
              padding: 12,
              borderRadius: 10,
              backgroundColor: consents[consent.id] ? colors.success + "08" : colors.surface,
              borderWidth: 1,
              borderColor: consents[consent.id] ? colors.success + "40" : colors.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: consents[consent.id] ? colors.success : colors.muted,
              backgroundColor: consents[consent.id] ? colors.success : "transparent",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
              marginTop: 1,
            }}
          >
            {consents[consent.id] && (
              <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "bold" }}>✓</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 18 }}>
              {consent.label}
            </Text>
            {consent.documentId && (
              <Pressable
                onPress={() => router.push(`/legal/${consent.documentId}` as any)}
                style={{ marginTop: 4 }}
              >
                <Text style={{ fontSize: 12, color: colors.primary, textDecorationLine: "underline" }}>
                  Metni oku →
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      ))}

      <Pressable
        onPress={allAccepted ? onAllAccepted : undefined}
        disabled={!allAccepted}
        style={({ pressed }) => [
          {
            marginTop: 12,
            backgroundColor: allAccepted ? colors.primary : colors.muted,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            opacity: pressed && allAccepted ? 0.9 : allAccepted ? 1 : 0.5,
          },
        ]}
      >
        <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600" }}>
          {allAccepted ? "Hesap Oluştur" : "Tüm maddeleri onaylayın"}
        </Text>
      </Pressable>
    </View>
  );
}
