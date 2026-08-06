import { Text, View, ScrollView, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MEDIATION_DECLARATION } from "@/lib/data/legal";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function MediationDeclarationScreen() {
  const colors = useColors();
  const router = useRouter();
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);

  const allChecked = checks.every(Boolean);

  const toggleCheck = (index: number) => {
    const newChecks = [...checks];
    newChecks[index] = !newChecks[index];
    setChecks(newChecks);
  };

  const handleAccept = async () => {
    await AsyncStorage.setItem("mediation_accepted", "true");
    await AsyncStorage.setItem("mediation_accepted_at", new Date().toISOString());
    router.back();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Title */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: colors.primary + "15",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 28 }}>⚖️</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, textAlign: "center" }}>
            {MEDIATION_DECLARATION.title}
          </Text>
        </View>

        {/* Content */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>
            {MEDIATION_DECLARATION.content}
          </Text>
        </View>

        {/* Checkboxes */}
        <View style={{ gap: 12 }}>
          {MEDIATION_DECLARATION.checkboxes.map((label, index) => (
            <Pressable
              key={label}
              onPress={() => toggleCheck(index)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: checks[index] ? colors.primary + "08" : colors.surface,
                  borderWidth: 1.5,
                  borderColor: checks[index] ? colors.primary : colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: checks[index] ? colors.primary : colors.muted,
                  backgroundColor: checks[index] ? colors.primary : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {checks[index] && <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "bold" }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 15, fontWeight: "500", color: colors.foreground }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          paddingBottom: 30,
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          onPress={handleAccept}
          disabled={!allChecked}
          style={({ pressed }) => [
            {
              backgroundColor: allChecked ? colors.primary : colors.muted,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed && allChecked ? 0.9 : allChecked ? 1 : 0.5,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>
            Devam Et
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
