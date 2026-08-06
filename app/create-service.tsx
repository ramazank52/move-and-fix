import { Text, View, ScrollView, TextInput, Pressable, Platform } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CATEGORIES } from "@/lib/data/categories";
import { useRouter } from "expo-router";

export default function CreateServiceScreen() {
  const colors = useColors();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState("");

  const totalSteps = 4;

  const handleSubmit = () => {
    // In a real app, this would submit to the backend
    router.back();
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
        <Pressable onPress={() => (step > 1 ? setStep(step - 1) : router.back())} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          Hizmet Talebi Oluştur
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>{step}/{totalSteps}</Text>
      </View>

      {/* Progress Bar */}
      <View style={{ height: 3, backgroundColor: colors.border }}>
        <View
          style={{
            height: 3,
            backgroundColor: colors.primary,
            width: `${(step / totalSteps) * 100}%`,
          }}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {step === 1 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 6 }}>
              Hizmet Kategorisi Seçin
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 20 }}>
              Hangi tür hizmete ihtiyacınız var?
            </Text>
            <View style={{ gap: 10 }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: selectedCategory === cat.id ? colors.primary : colors.border,
                      backgroundColor: selectedCategory === cat.id ? colors.primary + "10" : colors.surface,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{cat.icon}</Text>
                  <Text style={{ fontSize: 15, fontWeight: "500", color: colors.foreground }}>{cat.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 6 }}>
              Sorunu Açıklayın
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 20 }}>
              Detaylı açıklama yapmanız daha doğru teklifler almanızı sağlar.
            </Text>
            <TextInput
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
              placeholder="Örn: 3 adet split klima bakım ve temizliği yapılacak. Klimalar salon, yatak odası ve çocuk odasında..."
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 140,
                textAlignVertical: "top",
              }}
            />
            <Pressable
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <IconSymbol name="camera.fill" size={20} color={colors.primary} />
              <Text style={{ marginLeft: 10, color: colors.primary, fontWeight: "500" }}>
                Fotoğraf Ekle
              </Text>
            </Pressable>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 6 }}>
              Konum Bilgisi
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 20 }}>
              Hizmetin yapılacağı adresi girin.
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Adres girin veya haritadan seçin..."
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            <Pressable
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <IconSymbol name="location.fill" size={20} color={colors.primary} />
              <Text style={{ marginLeft: 10, color: colors.primary, fontWeight: "500" }}>
                Mevcut Konumu Kullan
              </Text>
            </Pressable>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 6 }}>
              Bütçe ve Tarih
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 20 }}>
              Tahmini bütçenizi belirleyin veya teklif isteyin.
            </Text>
            <TextInput
              value={budget}
              onChangeText={setBudget}
              placeholder="Tahmini bütçe (₺)"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>
              Boş bırakırsanız ustalardan teklif istenir.
            </Text>

            {/* Summary */}
            <View
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 10 }}>
                Özet
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>
                Kategori: {CATEGORIES.find((c) => c.id === selectedCategory)?.name || "-"}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>
                Açıklama: {description.substring(0, 50) || "-"}...
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>
                Adres: {address || "-"}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: Platform.OS === "web" ? 20 : 34,
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => (step < totalSteps ? setStep(step + 1) : handleSubmit())}
          style={({ pressed }) => [
            {
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>
            {step < totalSteps ? "Devam Et" : "Talebi Gönder"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
