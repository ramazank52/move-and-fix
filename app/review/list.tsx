import { Text, View, FlatList, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  tags: string[];
  helpful: number;
}

const SAMPLE_REVIEWS: Review[] = [
  {
    id: "1",
    userName: "Ayşe K.",
    rating: 5,
    comment: "Harika bir usta! Zamanında geldi, işini çok temiz yaptı. Kesinlikle tavsiye ederim. Fiyatı da çok makul.",
    date: "2026-08-01",
    tags: ["Çok profesyonel", "Zamanında geldi", "Temiz iş"],
    helpful: 12,
  },
  {
    id: "2",
    userName: "Mehmet A.",
    rating: 4,
    comment: "Genel olarak memnun kaldım. İş kalitesi iyi ama biraz geç geldi. İletişim konusunda iyileştirme yapabilir.",
    date: "2026-07-28",
    tags: ["İyi iletişim", "Uygun fiyat"],
    helpful: 8,
  },
  {
    id: "3",
    userName: "Fatma S.",
    rating: 5,
    comment: "Mükemmel hizmet! Sorunumu hemen çözdü. Çok güler yüzlü ve profesyonel birisi. Tekrar çalışmak isterim.",
    date: "2026-07-25",
    tags: ["Hızlı çözüm", "Tavsiye ederim", "Tekrar çalışırım"],
    helpful: 15,
  },
  {
    id: "4",
    userName: "Ali B.",
    rating: 3,
    comment: "İş yapıldı ama beklentimin altında kaldı. Fiyat biraz yüksek geldi.",
    date: "2026-07-20",
    tags: [],
    helpful: 3,
  },
  {
    id: "5",
    userName: "Zeynep D.",
    rating: 5,
    comment: "10 numara! Her şey mükemmeldi. Evimi tertemiz bıraktı. Kesinlikle herkese öneririm.",
    date: "2026-07-15",
    tags: ["Temiz iş", "Çok profesyonel", "Tavsiye ederim"],
    helpful: 20,
  },
];

export default function ReviewListScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ providerId?: string; providerName?: string }>();

  const averageRating = SAMPLE_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / SAMPLE_REVIEWS.length;

  const renderStars = (rating: number) => {
    return (
      <View style={{ flexDirection: "row" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text key={star} style={{ fontSize: 14, color: star <= rating ? "#F59E0B" : colors.border }}>
            {star <= rating ? "★" : "☆"}
          </Text>
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
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          Değerlendirmeler
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Summary */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ alignItems: "center", marginRight: 20 }}>
          <Text style={{ fontSize: 36, fontWeight: "bold", color: "#F59E0B" }}>
            {averageRating.toFixed(1)}
          </Text>
          {renderStars(Math.round(averageRating))}
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {SAMPLE_REVIEWS.length} değerlendirme
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = SAMPLE_REVIEWS.filter((r) => r.rating === star).length;
            const percentage = (count / SAMPLE_REVIEWS.length) * 100;
            return (
              <View key={star} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                <Text style={{ fontSize: 12, color: colors.muted, width: 14 }}>{star}</Text>
                <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, marginHorizontal: 6 }}>
                  <View style={{ width: `${percentage}%`, height: 6, backgroundColor: "#F59E0B", borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 11, color: colors.muted, width: 20 }}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Reviews List */}
      <FlatList
        data={SAMPLE_REVIEWS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.primary + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: colors.primary }}>
                    {item.userName.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{item.userName}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    {new Date(item.date).toLocaleDateString("tr-TR")}
                  </Text>
                </View>
              </View>
              {renderStars(item.rating)}
            </View>

            <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20, marginBottom: 8 }}>
              {item.comment}
            </Text>

            {item.tags.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {item.tags.map((tag) => (
                  <View
                    key={tag}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                      backgroundColor: colors.primary + "10",
                    }}
                  >
                    <Text style={{ fontSize: 11, color: colors.primary }}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>👍 {item.helpful} kişi faydalı buldu</Text>
            </Pressable>
          </View>
        )}
      />
    </ScreenContainer>
  );
}
