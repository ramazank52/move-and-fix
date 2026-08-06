import { Text, View, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const REVIEW_CRITERIA = [
  { id: "quality", label: "Hizmet Kalitesi", description: "İşin ne kadar iyi yapıldığı" },
  { id: "communication", label: "İletişim", description: "Usta ile iletişim kolaylığı" },
  { id: "punctuality", label: "Dakiklik", description: "Zamanında gelme ve bitirme" },
  { id: "price", label: "Fiyat/Performans", description: "Ödenen ücrete göre kalite" },
  { id: "cleanliness", label: "Temizlik", description: "İş sonrası temizlik ve düzen" },
];

const QUICK_TAGS = [
  "Çok profesyonel", "Zamanında geldi", "Temiz iş", "İyi iletişim",
  "Uygun fiyat", "Tavsiye ederim", "Tekrar çalışırım", "Hızlı çözüm",
];

export default function CreateReviewScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ providerId?: string; providerName?: string; jobTitle?: string }>();

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const overallRating = REVIEW_CRITERIA.length > 0
    ? Object.values(ratings).reduce((a, b) => a + b, 0) / Math.max(Object.values(ratings).length, 1)
    : 0;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (Object.keys(ratings).length < REVIEW_CRITERIA.length) {
      Alert.alert("Eksik Değerlendirme", "Lütfen tüm kriterleri puanlayın.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        "Teşekkürler!",
        "Değerlendirmeniz başarıyla kaydedildi. Diğer kullanıcılara yardımcı oluyorsunuz!",
        [{ text: "Tamam", onPress: () => router.back() }]
      );
    }, 1500);
  };

  const renderStars = (criteriaId: string) => {
    const currentRating = ratings[criteriaId] || 0;
    return (
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => setRatings({ ...ratings, [criteriaId]: star })}
          >
            <Text style={{ fontSize: 28, color: star <= currentRating ? "#F59E0B" : colors.border }}>
              {star <= currentRating ? "★" : "☆"}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="xmark" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          Değerlendirme Yap
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Provider Info */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: colors.primary + "15",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary }}>
              {(params.providerName || "U").charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
              {params.providerName || "Usta"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              {params.jobTitle || "Hizmet"}
            </Text>
          </View>
          {overallRating > 0 && (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: "#F59E0B" }}>
                {overallRating.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>Ortalama</Text>
            </View>
          )}
        </View>

        {/* Rating Criteria */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 14 }}>
          Puanlama
        </Text>
        <View style={{ gap: 16, marginBottom: 24 }}>
          {REVIEW_CRITERIA.map((criteria) => (
            <View
              key={criteria.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                  {criteria.label}
                </Text>
                {ratings[criteria.id] && (
                  <Text style={{ fontSize: 13, color: "#F59E0B", fontWeight: "600" }}>
                    {ratings[criteria.id]}/5
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
                {criteria.description}
              </Text>
              {renderStars(criteria.id)}
            </View>
          ))}
        </View>

        {/* Quick Tags */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 10 }}>
          Hızlı Etiketler
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {QUICK_TAGS.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: selectedTags.includes(tag) ? colors.primary : colors.border,
                  backgroundColor: selectedTags.includes(tag) ? colors.primary + "10" : colors.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: selectedTags.includes(tag) ? colors.primary : colors.muted,
                  fontWeight: selectedTags.includes(tag) ? "600" : "400",
                }}
              >
                {tag}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Comment */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 10 }}>
          Yorumunuz
        </Text>
        <TextInput
          multiline
          numberOfLines={5}
          value={comment}
          onChangeText={setComment}
          placeholder="Deneyiminizi paylaşın... (İsteğe bağlı)"
          placeholderTextColor={colors.muted}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 14,
            fontSize: 15,
            color: colors.foreground,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 120,
            textAlignVertical: "top",
          }}
        />
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>
          {comment.length}/500 karakter
        </Text>
      </ScrollView>

      {/* Submit Button */}
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
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            {
              backgroundColor: submitting ? colors.muted : colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed && !submitting ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>
            {submitting ? "Gönderiliyor..." : "Değerlendirmeyi Gönder"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
