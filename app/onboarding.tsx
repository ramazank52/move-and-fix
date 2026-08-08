import { Text, View, Pressable, Dimensions } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";

const { width } = Dimensions.get("window");

const slides = [
  {
    emoji: "🔧",
    title: "Güvenilir Ustalar",
    description: "Doğrulanmış ve puanlanmış hizmet sağlayıcılarla tanışın. Güvenli ve kaliteli hizmet alın.",
  },
  {
    emoji: "🤖",
    title: "Yapay Zekâ Desteği",
    description: "MoveAI ile ihtiyacınıza en uygun ustayı bulun, fiyat tahmini alın ve hızlıca hizmet talep edin.",
  },
  {
    emoji: "🔒",
    title: "Güvenli Ödeme",
    description: "Emanet ödeme sistemi ile paranız hizmet tamamlanana kadar güvende. İtiraz hakkınız saklıdır.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.replace("/login" as any);
    }
  };

  const slide = slides[currentSlide];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
        <Text style={{ fontSize: 80, marginBottom: 30 }}>{slide.emoji}</Text>
        <Text style={{ fontSize: 26, fontWeight: "bold", color: colors.foreground, textAlign: "center", marginBottom: 14 }}>
          {slide.title}
        </Text>
        <Text style={{ fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22 }}>
          {slide.description}
        </Text>
      </View>

      {/* Dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 30 }}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === currentSlide ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === currentSlide ? colors.primary : colors.border,
              marginHorizontal: 4,
            }}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 50 }}>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            {
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>
            {currentSlide < slides.length - 1 ? "Devam" : "Başla"}
          </Text>
        </Pressable>
        {currentSlide < slides.length - 1 && (
          <Pressable
            onPress={() => router.replace("/login" as any)}
            style={{ marginTop: 14, alignItems: "center" }}
          >
            <Text style={{ color: colors.muted, fontSize: 14 }}>Atla</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
