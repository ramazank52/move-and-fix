import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { readUriAsBase64 } from "@/lib/file-to-base64";
import { trpc } from "@/lib/trpc";

type DocumentType = string;
const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export default function ProviderDocumentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const documents = trpc.providers.getDocuments.useQuery();
  const requirements = trpc.providers.getDocumentRequirements.useQuery();
  const upload = trpc.providers.uploadDocument.useMutation({ onSuccess: async () => { await utils.providers.getDocuments.invalidate(); Alert.alert("Belge alındı", "Belgeniz incelenmek üzere güvenli biçimde kaydedildi."); }, onError: (error) => Alert.alert("Belge yüklenemedi", error.message), onSettled: () => setUploadingType(null) });
  const uploadDocument = async (type: DocumentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: [...supportedTypes], copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || !asset.mimeType || !supportedTypes.includes(asset.mimeType as (typeof supportedTypes)[number])) { Alert.alert("Desteklenmeyen dosya", "PDF, JPG, PNG veya WEBP türünde belge seçin."); return; }
      if (asset.size != null && asset.size > 10 * 1024 * 1024) { Alert.alert("Dosya büyük", "Belge en fazla 10 MB olabilir."); return; }
      setUploadingType(type);
      const base64 = await readUriAsBase64(asset.uri);
      await upload.mutateAsync({ type, fileName: asset.name || `${type}.${asset.mimeType.split("/")[1]}`, mimeType: asset.mimeType as (typeof supportedTypes)[number], base64 });
    } catch (error) { setUploadingType(null); Alert.alert("Belge okunamadı", error instanceof Error ? error.message : "Seçilen dosya okunamadı"); }
  };
  const statusStyle = (status?: string) => status === "approved" ? colors.success : status === "rejected" ? colors.error : colors.warning;
  const isLoading = documents.isLoading || requirements.isLoading;
  const requirementList = requirements.data?.required ?? [];
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}><Pressable accessibilityRole="button" accessibilityLabel="Geri dön" onPress={() => router.back()} style={{ padding: 5 }}><IconSymbol name="chevron.left" size={23} color={colors.foreground} /></Pressable><Text style={{ marginLeft: 10, color: colors.foreground, fontSize: 17, fontWeight: "800" }}>Profesyonel belgelerim</Text></View><ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}><View style={{ backgroundColor: colors.primary + "12", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.primary + "35" }}><Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>Doğrulama için güvenli belge yükleyin</Text><Text style={{ color: colors.muted, marginTop: 5, fontSize: 13, lineHeight: 19 }}>Belge gereksinimleri hizmet kapsamınıza göre sunucudan alınır. Dosyalar 10 MB ile sınırlandırılır; içerik türü ve imzası sunucuda doğrulanır.</Text></View>{requirements.data?.legalReviewRequired ? <View accessibilityRole="alert" style={{ backgroundColor: colors.warning + "14", borderRadius: 14, padding: 13, borderWidth: 1, borderColor: colors.warning + "42" }}><Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>Hukuki/uyum incelemesi gerekli</Text><Text style={{ color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 18 }}>Bu liste otomatik çalışma yetkisi vermez. Hizmet kapsamı ve kaynak doğrulaması insan incelemesiyle tamamlanır.</Text></View> : null}{isLoading ? <ActivityIndicator accessibilityLabel="Belge gereksinimleri yükleniyor" color={colors.primary} /> : requirements.isError ? <View style={{ backgroundColor: colors.error + "12", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.error + "35" }}><Text accessibilityRole="alert" style={{ color: colors.error, fontWeight: "800" }}>Belge gereksinimleri alınamadı</Text><Text style={{ color: colors.muted, marginTop: 5, fontSize: 13 }}>Güvenli liste yüklenmeden belge yükleme açılamaz.</Text><Pressable accessibilityRole="button" accessibilityLabel="Belge gereksinimlerini tekrar dene" onPress={() => requirements.refetch()} style={({ pressed }) => ({ marginTop: 12, minHeight: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 })}><Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Tekrar dene</Text></Pressable></View> : requirementList.map((item) => { const document = documents.data?.find((value) => value.type === item.type); const loading = uploadingType === item.type; return <View key={item.type} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border }}><View style={{ flexDirection: "row", alignItems: "flex-start" }}><View style={{ width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary + "18" }}><IconSymbol name="doc.text.fill" size={21} color={colors.primary} /></View><View style={{ flex: 1, marginLeft: 11 }}><Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "800" }}>{item.title}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{item.description}</Text>{document ? <Text style={{ color: statusStyle(document.status), fontWeight: "700", fontSize: 12, marginTop: 7 }}>{document.status === "approved" ? "Onaylandı" : document.status === "rejected" ? `Reddedildi${document.rejectionReason ? `: ${document.rejectionReason}` : ""}` : "İnceleme bekliyor"}</Text> : <Text style={{ color: colors.muted, fontSize: 12, marginTop: 7 }}>Henüz yüklenmedi</Text>}</View></View><Pressable accessibilityRole="button" accessibilityLabel={`${item.title} için ${document ? "belgeyi güncelle" : "belge yükle"}`} accessibilityState={{ disabled: loading || upload.isPending, busy: loading || upload.isPending }} disabled={loading || upload.isPending} onPress={() => uploadDocument(item.type)} style={({ pressed }) => ({ marginTop: 13, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: document ? colors.surface : colors.primary, opacity: pressed ? 0.82 : 1 })}>{loading ? <ActivityIndicator accessibilityLabel={`${item.title} belgesi yükleniyor`} color={document ? colors.primary : "#fff"} /> : <Text style={{ color: document ? colors.primary : "#fff", fontWeight: "800", fontSize: 13 }}>{document ? "Belgeyi güncelle" : "Belge yükle"}</Text>}</Pressable></View>; })}</ScrollView></ScreenContainer>;
}
