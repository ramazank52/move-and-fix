import { Text, View, Pressable, Modal } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";

interface ReviewPromptProps {
  visible: boolean;
  onDismiss: () => void;
  providerId: string;
  providerName: string;
  jobTitle: string;
}

export function ReviewPrompt({ visible, onDismiss, providerId, providerName, jobTitle }: ReviewPromptProps) {
  const colors = useColors();
  const router = useRouter();
  const [quickRating, setQuickRating] = useState(0);

  const handleRate = () => {
    onDismiss();
    router.push(`/review/create?providerId=${providerId}&providerName=${providerName}&jobTitle=${jobTitle}` as any);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
          }}
        >
          {/* Handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 20 }} />

          <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, textAlign: "center", marginBottom: 6 }}>
            Hizmet Nasıldı?
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 20 }}>
            {providerName} ile {jobTitle} deneyiminizi değerlendirin
          </Text>

          {/* Quick Stars */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 24 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setQuickRating(star)}>
                <Text style={{ fontSize: 40, color: star <= quickRating ? "#F59E0B" : colors.border }}>
                  {star <= quickRating ? "★" : "☆"}
                </Text>
              </Pressable>
            ))}
          </View>

          {quickRating > 0 && (
            <Text style={{ textAlign: "center", fontSize: 14, color: "#F59E0B", fontWeight: "600", marginBottom: 16 }}>
              {quickRating === 5 ? "Mükemmel!" : quickRating === 4 ? "Çok İyi!" : quickRating === 3 ? "İyi" : quickRating === 2 ? "Orta" : "Kötü"}
            </Text>
          )}

          {/* Buttons */}
          <Pressable
            onPress={handleRate}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 15,
                alignItems: "center",
                marginBottom: 10,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>Detaylı Değerlendir</Text>
          </Pressable>

          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              {
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingVertical: 15,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.muted, fontSize: 16, fontWeight: "500" }}>Daha Sonra</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
