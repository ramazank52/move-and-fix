import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { CATEGORIES } from "@/lib/data/categories";

const STEPS = ["Hizmet", "Detay", "Zaman", "Konum", "Onay"] as const;
const URGENCY_OPTIONS = [
  { id: "emergency", label: "Acil", icon: "bolt.fill", color: "#EF4444" },
  { id: "today", label: "Bugün", icon: "clock.fill", color: "#F59E0B" },
  { id: "scheduled", label: "Planlı", icon: "calendar", color: "#10B981" },
] as const;

export default function CreateServiceScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string; categoryLabel?: string }>();

  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState(params.categoryId ? parseInt(params.categoryId, 10) : 0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<string>("today");
  const [address, setAddress] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const createRequestMutation = trpc.requests.create.useMutation({
    onSuccess: (data: any) => {
      Alert.alert(
        "Talep Oluşturuldu",
        "Hizmet talebiniz başarıyla oluşturuldu. Ustalardan teklif geldiğinde size bildirim göndereceğiz.",
        [{ text: "Tamam", onPress: () => router.replace("/(tabs)/my-jobs" as any) }]
      );
    },
    onError: (err: any) => {
      Alert.alert(
        "Hata",
        err.message || "Talep oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        [{ text: "Tamam" }]
      );
    },
  });

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return categoryId > 0;
      case 1: return title.trim().length >= 3;
      case 2: return urgency.length > 0;
      case 3: return address.trim().length >= 5;
      case 4: return true;
      default: return false;
    }
  }, [step, categoryId, title, urgency, address]);

  const handleSubmit = () => {
    createRequestMutation.mutate({
      categoryId,
      title: title.trim(),
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      budgetMin: budgetMin ? parseInt(budgetMin, 10) : undefined,
      budgetMax: budgetMax ? parseInt(budgetMax, 10) : undefined,
    });
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const selectedCategory = CATEGORIES.find((c) => {
    return c.id === params.categoryId || c.id === String(categoryId);
  });

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={handleBack} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: colors.foreground }}>
          Hizmet Talebi
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Step Indicator */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {STEPS.map((label, i) => (
            <View key={label} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: i <= step ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: i <= step ? colors.primary : colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: i <= step ? "#FFF" : colors.muted,
                  }}
                >
                  {i + 1}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: i < step ? colors.primary : colors.border,
                    marginHorizontal: 4,
                  }}
                />
              )}
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, textAlign: "center", marginTop: 8 }}>
          Adım {step + 1}: {STEPS[step]}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        {/* Step 0: Hizmet Seç */}
        {step === 0 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              Hangi hizmete ihtiyacınız var?
            </Text>
            {params.categoryId && selectedCategory && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.primary + "10",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.primary + "30",
                }}
              >
                <Text style={{ fontSize: 24 }}>{selectedCategory.icon}</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary, marginLeft: 10 }}>
                  {selectedCategory.name}
                </Text>
              </View>
            )}
            {!params.categoryId && (
              <View style={{ gap: 8 }}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategoryId(parseInt(cat.id, 10) || 0)}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: categoryId === parseInt(cat.id, 10) ? colors.primary + "10" : colors.card,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1.5,
                        borderColor: categoryId === parseInt(cat.id, 10) ? colors.primary : colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>{cat.icon}</Text>
                    <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                      {cat.name}
                    </Text>
                    {categoryId === parseInt(cat.id, 10) && (
                      <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Step 1: Detay */}
        {step === 1 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              Sorunu detaylı açıklayın
            </Text>
            <View style={{ gap: 14 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>Başlık</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Örn: Mutfak musluğu su akıyor"
                  placeholderTextColor={colors.muted}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: colors.foreground,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                  }}
                />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>Açıklama (opsiyonel)</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Sorununuzu daha detaylı açıklayın..."
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: colors.foreground,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                    textAlignVertical: "top",
                    minHeight: 100,
                  }}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>Min Bütçe (₺)</Text>
                  <TextInput
                    value={budgetMin}
                    onChangeText={setBudgetMin}
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 15,
                      color: colors.foreground,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>Max Bütçe (₺)</Text>
                  <TextInput
                    value={budgetMax}
                    onChangeText={setBudgetMax}
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 15,
                      color: colors.foreground,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Zaman */}
        {step === 2 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              Ne zaman ihtiyacınız var?
            </Text>
            <View style={{ gap: 10 }}>
              {URGENCY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setUrgency(opt.id)}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: urgency === opt.id ? opt.color + "10" : colors.card,
                      borderRadius: 16,
                      padding: 18,
                      borderWidth: 1.5,
                      borderColor: urgency === opt.id ? opt.color : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: opt.color + "15",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol name={opt.icon as any} size={22} color={opt.color} />
                  </View>
                  <Text style={{ flex: 1, marginLeft: 14, fontSize: 16, fontWeight: "700", color: colors.foreground }}>
                    {opt.label}
                  </Text>
                  {urgency === opt.id && (
                    <IconSymbol name="checkmark.circle.fill" size={22} color={opt.color} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Konum */}
        {step === 3 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              Hizmet nerede verilecek?
            </Text>
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>Adres</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Örn: Bağdat Cad. No:123 Kadıköy, İstanbul"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: colors.foreground,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  textAlignVertical: "top",
                  minHeight: 80,
                }}
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  paddingVertical: 14,
                  marginTop: 12,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: colors.primary + "50",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <IconSymbol name="location.fill" size={18} color={colors.primary} />
              <Text style={{ marginLeft: 8, color: colors.primary, fontWeight: "600", fontSize: 14 }}>
                Konumumu Kullan
              </Text>
            </Pressable>
          </View>
        )}

        {/* Step 4: Onay */}
        {step === 4 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 14 }}>
              Talep Özeti
            </Text>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                padding: 20,
                borderWidth: 0.5,
                borderColor: colors.border,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>Hizmet</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                  {selectedCategory?.name || CATEGORIES.find((c) => c.id === String(categoryId))?.name || "Seçilmedi"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>Başlık</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, maxWidth: 200 }} numberOfLines={2}>
                  {title || "—"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>Aciliyet</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                  {URGENCY_OPTIONS.find((u) => u.id === urgency)?.label || "—"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>Adres</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, maxWidth: 200 }} numberOfLines={2}>
                  {address || "—"}
                </Text>
              </View>
              {(budgetMin || budgetMax) && (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 14, color: colors.muted }}>Bütçe</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                    {budgetMin && `₺${budgetMin}`}
                    {budgetMin && budgetMax && " - "}
                    {budgetMax && `₺${budgetMax}`}
                  </Text>
                </View>
              )}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.primary + "08",
                borderRadius: 14,
                padding: 14,
                marginTop: 14,
                borderWidth: 0.5,
                borderColor: colors.primary + "20",
              }}
            >
              <IconSymbol name="info.circle.fill" size={18} color={colors.primary} />
              <Text style={{ flex: 1, marginLeft: 8, fontSize: 12, color: colors.muted, lineHeight: 18 }}>
                Talebiniz oluşturulduktan sonra size uygun ustalar teklif gönderecektir. Teklifleri “İşlerim” ekranından takip edebilirsiniz.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
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
          onPress={handleNext}
          disabled={!canProceed() || createRequestMutation.isPending}
          style={({ pressed }) => [
            {
              backgroundColor: !canProceed() || createRequestMutation.isPending ? colors.muted : colors.primary,
              borderRadius: 16,
              paddingVertical: 17,
              alignItems: "center",
              opacity: pressed && canProceed() ? 0.9 : 1,
            },
          ]}
        >
          {createRequestMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
              {step < 4 ? "Devam" : "Talep Oluştur"}
            </Text>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
