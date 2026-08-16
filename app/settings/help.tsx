import { Text, View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function HelpScreen() {
  const colors = useColors();
  const router = useRouter();

  const faqItems = [
    { q: "Nasıl hizmet talep edebilirim?", a: "Ana sayfadan 'Hizmet Talebi' butonuna tıklayarak adım adım talebinizi oluşturabilirsiniz." },
    { q: "Ödeme güvenli mi?", a: "Evet, emanet ödeme sistemi ile paranız hizmet tamamlanana kadar güvende tutulur." },
    { q: "Ustayı nasıl değerlendirebilirim?", a: "İş tamamlandıktan sonra size bir değerlendirme formu gönderilir." },
    { q: "İptal ve iade politikası nedir?", a: "Hizmet başlamadan önce ücretsiz iptal edebilirsiniz. Başladıktan sonra kısmi iade yapılabilir." },
  ];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
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
          Yardım & Destek
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground, marginBottom: 16 }}>
          Sıkça Sorulan Sorular
        </Text>
        {faqItems.map((item, i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 6 }}>
              {item.q}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>{item.a}</Text>
          </View>
        ))}

        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground, marginTop: 20, marginBottom: 12 }}>
          İletişim
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Destek talebi oluştur"
          onPress={() => router.push("/settings/support-request")}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 10,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <IconSymbol name="message.fill" size={20} color={colors.primary} />
          <Text style={{ marginLeft: 12, fontSize: 14, color: colors.foreground }}>Destek Talebi Oluştur</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <IconSymbol name="phone.fill" size={20} color={colors.primary} />
          <Text style={{ marginLeft: 12, fontSize: 14, color: colors.foreground }}>0850 123 4567</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
