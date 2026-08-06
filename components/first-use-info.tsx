import { Text, View, Pressable, Modal } from "react-native";
import { useState, useEffect } from "react";
import { useColors } from "@/hooks/use-colors";
import { FIRST_USE_INFO } from "@/lib/data/legal";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function FirstUseInfoModal() {
  const colors = useColors();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkFirstUse();
  }, []);

  const checkFirstUse = async () => {
    const seen = await AsyncStorage.getItem("first_use_info_seen");
    if (!seen) {
      setVisible(true);
    }
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem("first_use_info_seen", "true");
    await AsyncStorage.setItem("first_use_info_seen_at", new Date().toISOString());
    setVisible(false);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: 20,
            padding: 24,
            width: "100%",
            maxWidth: 360,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Icon */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.primary + "15",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 30 }}>ℹ️</Text>
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: colors.foreground,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {FIRST_USE_INFO.title}
          </Text>

          {/* Message */}
          <Text
            style={{
              fontSize: 14,
              color: colors.muted,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            {FIRST_USE_INFO.message}
          </Text>

          {/* Accept Button */}
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600" }}>Anladım, Devam Et</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

