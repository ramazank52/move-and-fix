import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { readUriAsBase64 } from "@/lib/file-to-base64";
import { useTranslation } from "@/lib/i18n";
import type { TranslationKey, TranslationValues } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";

const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

type AuthoritativeRequirement = {
  requirementId: number;
  credentialType: string;
  requirementState: "required" | "conditional" | "not_required" | "prohibited" | "unknown";
  minimumAssurance: string;
  requiresHumanReview: boolean;
  sourceVersion: string;
  ruleVersion: string;
  countryCode: string;
  capabilityName: string;
  providerType: string;
  currentDocumentStatus: "missing" | "pending_scan" | "pending_review" | "approved" | "rejected" | "blocked";
  currentCredentialStatus: "missing" | "pending" | "verified" | "rejected" | "expired" | "revoked";
  action: "upload" | "not_required" | "blocked" | "review_required";
};

type RequirementProjection = {
  status: "RESOLVED" | "REVIEW_REQUIRED" | "BLOCKED_UNKNOWN";
  requirements: AuthoritativeRequirement[];
};

function CredentialChecklist({ colors, projection, t }: { colors: ReturnType<typeof useColors>; projection?: RequirementProjection; t: (key: TranslationKey, values?: TranslationValues) => string }) {
  if (!projection) return null;
  if (projection.status !== "RESOLVED") {
    return <View accessibilityRole="alert" style={{ backgroundColor: colors.warning + "14", borderRadius: 14, padding: 13, borderWidth: 1, borderColor: colors.warning + "42" }}><Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>{t("provider.documents.scopeReviewTitle")}</Text><Text style={{ color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 18 }}>{t("provider.documents.scopeReviewBody")}</Text></View>;
  }
  return <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, gap: 10 }}><Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>{t("provider.documents.scopeCapabilitiesTitle")}</Text><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{t("provider.documents.scopeCapabilitiesBody")}</Text>{projection.requirements.map((requirement) => { const stateKey = requirement.requirementState === "required" ? "provider.documents.statusRequired" : requirement.requirementState === "conditional" ? "provider.documents.statusConditional" : requirement.requirementState === "prohibited" ? "provider.documents.statusProhibited" : requirement.requirementState === "not_required" ? "provider.documents.statusNotRequired" : "provider.documents.statusLegalReview"; return <View key={requirement.requirementId} style={{ borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 10, gap: 4 }}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800" }}>{requirement.credentialType} · {requirement.capabilityName} · {requirement.countryCode}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{t("provider.documents.workingModel")}: {requirement.providerType} · {t("provider.documents.assurance")}: {requirement.minimumAssurance}</Text><Text style={{ color: requirement.action === "upload" ? colors.foreground : colors.muted, fontSize: 12, lineHeight: 18 }}>{t("provider.documents.status")}: {t(stateKey)}{requirement.requiresHumanReview ? ` · ${t("provider.documents.humanReview")}` : ""}</Text></View>; })}</View>;
}

export default function ProviderDocumentsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [uploadingRequirementId, setUploadingRequirementId] = useState<number | null>(null);
  const documents = trpc.provider.getDocuments.useQuery();
  const requirements = trpc.provider.getDocumentRequirements.useQuery();
  const upload = trpc.provider.uploadDocument.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.provider.getDocuments.invalidate(), utils.provider.getDocumentRequirements.invalidate()]);
      Alert.alert(t("provider.documents.receivedTitle"), t("provider.documents.receivedBody"));
    },
    onError: () => Alert.alert(t("provider.documents.uploadFailedTitle"), t("provider.documents.readFailedBody")),
    onSettled: () => setUploadingRequirementId(null),
  });

  const uploadDocument = async (requirement: AuthoritativeRequirement) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: [...supportedTypes], copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || !asset.mimeType || !supportedTypes.includes(asset.mimeType as (typeof supportedTypes)[number])) {
        Alert.alert(t("provider.documents.unsupportedTitle"), t("provider.documents.unsupportedBody"));
        return;
      }
      if (asset.size != null && asset.size > 10 * 1024 * 1024) {
        Alert.alert(t("provider.documents.fileTooLargeTitle"), t("provider.documents.fileTooLargeBody"));
        return;
      }
      setUploadingRequirementId(requirement.requirementId);
      const base64 = await readUriAsBase64(asset.uri);
      await upload.mutateAsync({
        requirementId: requirement.requirementId,
        credentialType: requirement.credentialType,
        fileName: asset.name || `${requirement.credentialType}.${asset.mimeType.split("/")[1]}`,
        mimeType: asset.mimeType as (typeof supportedTypes)[number],
        base64,
      });
    } catch {
      setUploadingRequirementId(null);
      Alert.alert(t("provider.documents.readFailedTitle"), t("provider.documents.readFailedBody"));
    }
  };

  const statusStyle = (status?: string) => status === "approved" ? colors.success : status === "rejected" || status === "blocked" ? colors.error : colors.warning;
  const projection = requirements.data as RequirementProjection | undefined;
  const requirementList = projection?.status === "RESOLVED" ? projection.requirements.filter((item) => item.action === "upload") : [];
  const isLoading = documents.isLoading || requirements.isLoading;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}><Pressable accessibilityRole="button" accessibilityLabel={t("provider.documents.backAccessibility")} onPress={() => router.back()} style={{ padding: 5 }}><IconSymbol name="chevron.left" size={23} color={colors.foreground} /></Pressable><Text style={{ marginLeft: 10, color: colors.foreground, fontSize: 17, fontWeight: "800" }}>{t("provider.documents.title")}</Text></View><ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}><View style={{ backgroundColor: colors.primary + "12", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.primary + "35" }}><Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>{t("provider.documents.secureUploadTitle")}</Text><Text style={{ color: colors.muted, marginTop: 5, fontSize: 13, lineHeight: 19 }}>{t("provider.documents.secureUploadBody")}</Text></View><CredentialChecklist colors={colors} projection={projection} t={t} />{isLoading ? <ActivityIndicator accessibilityLabel={t("provider.documents.requirementsLoading")} color={colors.primary} /> : requirements.isError ? <View style={{ backgroundColor: colors.error + "12", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.error + "35" }}><Text accessibilityRole="alert" style={{ color: colors.error, fontWeight: "800" }}>{t("provider.documents.requirementsUnavailable")}</Text><Text style={{ color: colors.muted, marginTop: 5, fontSize: 13 }}>{t("provider.documents.requirementsUnavailableBody")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("provider.documents.retry")} onPress={() => requirements.refetch()} style={({ pressed }) => ({ marginTop: 12, minHeight: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 })}><Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{t("provider.documents.retry")}</Text></Pressable></View> : projection?.status !== "RESOLVED" ? <View accessibilityRole="alert" style={{ backgroundColor: colors.warning + "14", borderRadius: 14, padding: 13, borderWidth: 1, borderColor: colors.warning + "42" }}><Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>{t("provider.documents.uploadDisabled")}</Text><Text style={{ color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 18 }}>{t("provider.documents.uploadDisabledBody")}</Text></View> : requirementList.map((item) => { const document = documents.data?.find((value) => value.requirementId === item.requirementId); const loading = uploadingRequirementId === item.requirementId; return <View key={item.requirementId} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border }}><View style={{ flexDirection: "row", alignItems: "flex-start" }}><View style={{ width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary + "18" }}><IconSymbol name="doc.text.fill" size={21} color={colors.primary} /></View><View style={{ flex: 1, marginLeft: 11 }}><Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "800" }}>{item.credentialType}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{item.capabilityName} · {item.countryCode} · {item.ruleVersion}</Text>{document ? <Text style={{ color: statusStyle(document.status), fontWeight: "700", fontSize: 12, marginTop: 7 }}>{document.status === "approved" ? t("provider.documents.approved") : document.status === "rejected" ? t("provider.documents.rejected") : t("provider.documents.pendingReview")}</Text> : <Text style={{ color: colors.muted, fontSize: 12, marginTop: 7 }}>{t("provider.documents.notUploaded")}</Text>}</View></View><Pressable accessibilityRole="button" accessibilityLabel={`${item.credentialType}: ${document ? t("provider.documents.update") : t("provider.documents.upload")}`} accessibilityState={{ disabled: loading || upload.isPending, busy: loading || upload.isPending }} disabled={loading || upload.isPending} onPress={() => uploadDocument(item)} style={({ pressed }) => ({ marginTop: 13, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: document ? colors.surface : colors.primary, opacity: pressed ? 0.82 : 1 })}>{loading ? <ActivityIndicator accessibilityLabel={`${item.credentialType}: ${t("provider.documents.uploading")}`} color={document ? colors.primary : "#fff"} /> : <Text style={{ color: document ? colors.primary : "#fff", fontWeight: "800", fontSize: 13 }}>{document ? t("provider.documents.update") : t("provider.documents.upload")}</Text>}</Pressable></View>; })}</ScrollView></ScreenContainer>;
}
