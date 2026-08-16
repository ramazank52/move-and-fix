import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const CLAIM_TYPES = [
  { value: "property_damage", label: "Maddi hasar" },
  { value: "injury", label: "Yaralanma" },
  { value: "theft", label: "Kayıp / hırsızlık" },
  { value: "liability", label: "Üçüncü kişi" },
  { value: "other", label: "Diğer" },
] as const;

type ClaimType = (typeof CLAIM_TYPES)[number]["value"];

export default function NewClaimScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = Number(params.requestId);
  const requestIsValid = Number.isInteger(requestId) && requestId > 0;
  const [category, setCategory] = useState<ClaimType>("property_damage");
  const [description, setDescription] = useState("");
  const [evidenceMediaIds, setEvidenceMediaIds] = useState<number[]>([]);
  const createClaim = trpc.insuranceClaims.create.useMutation();
  const uploadEvidence = trpc.requests.uploadMedia.useMutation();

  const addEvidenceImage = async () => {
    if (!requestIsValid || evidenceMediaIds.length >= 8 || uploadEvidence.isPending) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Fotoğraf izni gerekli", "Claim kanıtı eklemek için fotoğraf kitaplığı izni vermelisiniz.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif" = asset.mimeType && ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(asset.mimeType)
      ? asset.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif"
      : "image/jpeg";
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const uploaded = await uploadEvidence.mutateAsync({
        requestId,
        purpose: "claim",
        originalName: asset.fileName || `claim-evidence-${Date.now()}.jpg`,
        mimeType,
        base64,
      });
      setEvidenceMediaIds((current) => [...current, uploaded.id]);
    } catch (error) {
      Alert.alert("Kanıt eklenemedi", error instanceof Error ? error.message : "Görsel güvenli biçimde yüklenemedi.");
    }
  };

  const submit = async () => {
    if (!requestIsValid) {
      Alert.alert("Geçersiz iş", "Claim yalnız geçerli bir iş kaydından başlatılabilir.");
      return;
    }
    const normalized = description.trim();
    if (normalized.length < 20) {
      Alert.alert("Daha fazla bilgi gerekli", "Lütfen olayın ne olduğunu en az 20 karakterle açıklayın.");
      return;
    }

    try {
      await createClaim.mutateAsync({
        requestId,
        claimantRole: "customer",
        category,
        description: normalized,
        incidentAt: new Date(),
        mediaIds: evidenceMediaIds.length ? evidenceMediaIds : undefined,
      });
      Alert.alert(
        "İnceleme talebi kaydedildi",
        "Bu kayıt otomatik iade veya ödeme oluşturmaz. Yetkili ekip kanıt ve iş dosyasını inceleyerek karar verecektir.",
        [{ text: "Tamam", onPress: () => router.back() }],
      );
    } catch {
      Alert.alert("Claim kaydedilemedi", "Bu iş için claim oluşturma yetkiniz olmayabilir veya bağlantı kurulamadı. Lütfen yeniden deneyin.");
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Geri dön" onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Hasar / Claim Bildir</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.notice, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}45` }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.warning} />
          <Text style={[styles.noticeText, { color: colors.foreground }]}>Claim kaydı ödeme veya iade başlatmaz. İnceleme, kanıt ve iş dosyası üzerinden yetkili ekip tarafından yapılır.</Text>
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>Olay türü</Text>
        <View style={styles.chips}>
          {CLAIM_TYPES.map((item) => {
            const selected = item.value === category;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
                onPress={() => setCategory(item.value)}
                style={({ pressed }) => [styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}16` : colors.surface }, pressed && styles.pressed]}
              >
                <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: selected ? "600" : "400" }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>Olay açıklaması</Text>
        <TextInput
          accessibilityLabel="Claim olay açıklaması"
          value={description}
          onChangeText={setDescription}
          maxLength={8_000}
          multiline
          textAlignVertical="top"
          placeholder="Olayı, gerçekleşme zamanını ve görünen hasarı açıklayın. Hassas kişisel verileri yalnız zorunluysa ekleyin."
          placeholderTextColor={colors.muted}
          style={[styles.description, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
        />
        <Text style={[styles.counter, { color: colors.muted }]}>{description.length}/8000</Text>

        <View style={[styles.evidenceBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.evidenceCopy}>
            <Text style={[styles.evidenceTitle, { color: colors.foreground }]}>Kanıt görselleri</Text>
            <Text style={[styles.evidenceDescription, { color: colors.muted }]}>En fazla 8 görsel ekleyebilirsiniz. Yalnız olay için gerekli içerikleri paylaşın.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Claim kanıt görseli ekle"
            disabled={!requestIsValid || evidenceMediaIds.length >= 8 || uploadEvidence.isPending}
            onPress={addEvidenceImage}
            style={({ pressed }) => [styles.evidenceButton, { borderColor: colors.primary }, (pressed || uploadEvidence.isPending || evidenceMediaIds.length >= 8) && styles.pressed]}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>{uploadEvidence.isPending ? "Ekleniyor…" : "Görsel Ekle"}</Text>
          </Pressable>
          {evidenceMediaIds.length > 0 ? <Text style={[styles.evidenceCount, { color: colors.success }]}>{evidenceMediaIds.length} kanıt görseli güvenli olarak eklendi</Text> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Claim inceleme talebi gönder"
          disabled={!requestIsValid || createClaim.isPending}
          onPress={submit}
          style={({ pressed }) => [styles.submit, { backgroundColor: colors.primary }, (!requestIsValid || createClaim.isPending || pressed) && styles.pressed]}
        >
          <Text style={styles.submitText}>{createClaim.isPending ? "Kaydediliyor…" : "İnceleme Talebi Oluştur"}</Text>
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
  notice: { flexDirection: "row", gap: 10, borderRadius: 12, borderWidth: 1, padding: 13 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 9, marginTop: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  description: { minHeight: 172, borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15 },
  counter: { alignSelf: "flex-end", fontSize: 12, marginTop: 6 },
  evidenceBox: { borderWidth: 1, borderRadius: 12, marginTop: 24, padding: 13 },
  evidenceCopy: { gap: 4 },
  evidenceTitle: { fontSize: 14, fontWeight: "700" },
  evidenceDescription: { fontSize: 12, lineHeight: 17 },
  evidenceButton: { alignItems: "center", alignSelf: "flex-start", borderWidth: 1, borderRadius: 10, marginTop: 12, paddingHorizontal: 12, paddingVertical: 9 },
  evidenceCount: { fontSize: 12, fontWeight: "600", marginTop: 10 },
  submit: { alignItems: "center", borderRadius: 12, marginTop: 28, paddingVertical: 15 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.75 },
});
