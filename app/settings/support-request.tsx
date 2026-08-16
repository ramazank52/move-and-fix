import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const CATEGORIES = [
  { value: "technical", label: "Teknik sorun" },
  { value: "payment", label: "Ödeme" },
  { value: "safety", label: "Güvenlik" },
  { value: "service", label: "Hizmet" },
  { value: "account", label: "Hesap" },
  { value: "other", label: "Diğer" },
] as const;

type SupportCategory = (typeof CATEGORIES)[number]["value"];

export default function SupportRequestScreen() {
  const colors = useColors();
  const router = useRouter();
  const [category, setCategory] = useState<SupportCategory>("other");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const createTicket = trpc.support.create.useMutation();

  const submit = async () => {
    const normalizedSubject = subject.trim();
    const normalizedDescription = description.trim();
    if (!normalizedSubject || !normalizedDescription) {
      Alert.alert("Eksik bilgi", "Konu ve açıklama alanlarını doldurun.");
      return;
    }

    try {
      await createTicket.mutateAsync({
        category,
        subject: normalizedSubject,
        description: normalizedDescription,
        priority: category === "safety" ? "urgent" : "normal",
      });
      Alert.alert("Talebiniz kaydedildi", "Destek ekibi talebinizi inceleyecek. Uygulama içi bildirimlerden durumunu takip edebilirsiniz.", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Talep gönderilemedi", "Talebiniz şu anda kaydedilemedi. Lütfen bağlantınızı kontrol edip yeniden deneyin.");
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Geri dön" onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Destek Talebi</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, { color: colors.muted }]}>Talebinizi mümkün olduğunca açık yazın. Ödeme veya güvenlik konularında iş veya işlem numarasını ekleyin.</Text>

        <Text style={[styles.label, { color: colors.foreground }]}>Konu türü</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((item) => {
            const selected = item.value === category;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
                onPress={() => setCategory(item.value)}
                style={({ pressed }) => [
                  styles.chip,
                  { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}16` : colors.surface },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: selected ? "600" : "400" }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>Konu</Text>
        <TextInput
          accessibilityLabel="Destek talebi konusu"
          value={subject}
          onChangeText={setSubject}
          maxLength={180}
          placeholder="Örn. Ödeme durumum güncellenmedi"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
        />

        <Text style={[styles.label, { color: colors.foreground }]}>Açıklama</Text>
        <TextInput
          accessibilityLabel="Destek talebi açıklaması"
          value={description}
          onChangeText={setDescription}
          maxLength={8_000}
          multiline
          textAlignVertical="top"
          placeholder="Neler olduğunu, ne zaman başladığını ve varsa ilgili iş/işlem numarasını yazın."
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.description, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
        />
        <Text style={[styles.counter, { color: colors.muted }]}>{description.length}/8000</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Destek talebini gönder"
          disabled={createTicket.isPending}
          onPress={submit}
          style={({ pressed }) => [styles.submit, { backgroundColor: colors.primary }, (pressed || createTicket.isPending) && styles.pressed]}
        >
          <Text style={styles.submitText}>{createTicket.isPending ? "Gönderiliyor…" : "Talebi Gönder"}</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600" },
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 22 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 9, marginTop: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 15 },
  description: { minHeight: 148, paddingTop: 13 },
  counter: { alignSelf: "flex-end", fontSize: 12, marginTop: 6 },
  submit: { alignItems: "center", borderRadius: 12, marginTop: 28, paddingVertical: 15 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.78 },
});
