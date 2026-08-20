import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { readUriAsBase64 } from "@/lib/file-to-base64";

const CATEGORIES = [
  ["fuel", "expense.category.fuel"], ["toll", "expense.category.toll"], ["parking", "expense.category.parking"], ["material", "expense.category.material"],
  ["part", "expense.category.part"], ["paint", "expense.category.paint"], ["equipment", "expense.category.equipment"], ["transport", "expense.category.transport"],
  ["packaging", "expense.category.packaging"], ["other", "expense.category.other"],
] as const;

type ExpenseCategory = (typeof CATEGORIES)[number][0];
type ExpenseMediaMime = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";
type ExpenseMediaRole = "receipt" | "invoice" | "product" | "material" | "video" | "other";
const ALLOWED_EXPENSE_MIME_TYPES = new Set<ExpenseMediaMime>(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const EVIDENCE_ROLES: readonly ExpenseMediaRole[] = ["receipt", "invoice", "product", "material", "other"];

export default function JobExpensesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t, formatMoney, isRTL } = useTranslation();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = Number(params.requestId);
  const isProvider = user?.accountType === "provider";
  const utils = trpc.useUtils();

  const [category, setCategory] = useState<ExpenseCategory>("material");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [evidenceRole, setEvidenceRole] = useState<ExpenseMediaRole>("receipt");
  const [receipt, setReceipt] = useState<{ uri: string; originalName: string; mimeType: ExpenseMediaMime } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const expenses = trpc.agreements.expenses.useQuery({ requestId }, { enabled: Number.isInteger(requestId) && requestId > 0 });
  const refundRequests = trpc.agreements.expenseRefunds.useQuery({ requestId }, { enabled: Number.isInteger(requestId) && requestId > 0 });
  const uploadMedia = trpc.requests.uploadMedia.useMutation();
  const createExpense = trpc.agreements.createExpense.useMutation({
    onSuccess: async () => {
      await utils.agreements.expenses.invalidate({ requestId });
      setAmount(""); setDescription(""); setVendorName(""); setBrand(""); setModel(""); setQuantity(""); setLocationUrl(""); setEvidenceRole("receipt"); setReceipt(null); setExpanded(false);
      Alert.alert(t("expense.alert.savedTitle"), t("expense.alert.savedBody"));
    },
  });
  const submitRefund = trpc.agreements.submitExpenseRefund.useMutation({
    onSuccess: async () => {
      await utils.agreements.expenses.invalidate({ requestId });
      await utils.agreements.expenseRefunds.invalidate({ requestId });
      Alert.alert(t("expense.alert.refundSubmittedTitle"), t("expense.alert.refundSubmittedBody"));
    },
  });
  const resolveRefund = trpc.agreements.resolveExpenseRefund.useMutation({
    onSuccess: async (result) => {
      await utils.agreements.expenseRefunds.invalidate({ requestId });
      Alert.alert(result.status === "approved" ? t("expense.alert.refundApprovedTitle") : t("expense.alert.refundRejectedTitle"), t("expense.alert.refundResolvedBody"));
    },
  });

  const total = useMemo(
    () => (expenses.data ?? []).reduce((sum, item) => sum + item.amount, 0),
    [expenses.data],
  );
  const refundByExpenseId = useMemo(
    () => new Map((refundRequests.data ?? []).map((refund) => [refund.expenseId, refund])),
    [refundRequests.data],
  );

  const requestRefundDecision = (refundRequestId: number, decision: "approved" | "rejected") => {
    Alert.alert(
      decision === "approved" ? t("expense.alert.confirmApproveTitle") : t("expense.alert.confirmRejectTitle"),
      decision === "approved"
        ? t("expense.alert.confirmApproveBody")
        : t("expense.alert.confirmRejectBody"),
      [
        { text: t("expense.cancel"), style: "cancel" },
        {
          text: decision === "approved" ? t("expense.refund.approve") : t("expense.refund.reject"),
          style: decision === "approved" ? "default" : "destructive",
          onPress: () => resolveRefund.mutate({ refundRequestId, decision }),
        },
      ],
    );
  };

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("expense.alert.galleryPermissionTitle"), t("expense.alert.galleryPermissionBody"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    if (!ALLOWED_EXPENSE_MIME_TYPES.has(mimeType as ExpenseMediaMime) || (asset.fileSize != null && asset.fileSize > 10 * 1024 * 1024)) {
      Alert.alert(t("expense.alert.receiptRejectedTitle"), t("expense.alert.receiptRejectedBody"));
      return;
    }
    setReceipt({ uri: asset.uri, mimeType: mimeType as ExpenseMediaMime, originalName: asset.fileName ?? `masraf-${Date.now()}.jpg` });
  };

  const saveExpense = async () => {
    const normalizedAmount = Number(amount.replace(/[^0-9]/g, ""));
    if (!Number.isInteger(normalizedAmount) || normalizedAmount <= 0) {
      Alert.alert(t("expense.alert.amountRequiredTitle"), t("expense.alert.amountRequiredBody"));
      return;
    }
    if (description.trim().length < 3) {
      Alert.alert(t("expense.alert.descriptionRequiredTitle"), t("expense.alert.descriptionRequiredBody"));
      return;
    }
    const normalizedQuantity = quantity.trim() ? Number(quantity.replace(/[^0-9]/g, "")) : undefined;
    if (normalizedQuantity !== undefined && (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0)) {
      Alert.alert(t("expense.alert.amountRequiredTitle"), t("expense.alert.amountRequiredBody"));
      return;
    }
    const normalizedLocationUrl = locationUrl.trim() || undefined;
    if (normalizedLocationUrl && !/^https:\/\/.+/i.test(normalizedLocationUrl)) {
      Alert.alert(t("expense.alert.saveFailedTitle"), t("expense.locationHint"));
      return;
    }
    try {
      const mediaIds: number[] = [];
      if (receipt) {
        const uploaded = await uploadMedia.mutateAsync({
          requestId,
          originalName: receipt.originalName,
          mimeType: receipt.mimeType,
          base64: await readUriAsBase64(receipt.uri),
          purpose: "expense",
        });
        mediaIds.push(uploaded.id);
      }
      await createExpense.mutateAsync({
        requestId,
        category,
        amount: normalizedAmount,
        description: description.trim(),
        purchasedAt: new Date(),
        vendorName: vendorName.trim() || undefined,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        quantity: normalizedQuantity,
        locationUrl: normalizedLocationUrl,
        media: mediaIds.map((mediaId) => ({ mediaId, mediaRole: evidenceRole })),
      });
    } catch (error) {
      Alert.alert(t("expense.alert.saveFailedTitle"), error instanceof Error ? error.message : t("expense.alert.safeFailure"));
    }
  };

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return <ScreenContainer className="items-center justify-center p-6"><Text className="text-center text-muted">{t("expense.invalidRequest")}</Text></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("expense.backAccessibility")} accessibilityHint={t("expense.backHint")} onPress={() => router.back()} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}>
            <IconSymbol name="chevron.left" size={25} color={colors.foreground} />
          </Pressable>
          <Text className="text-lg font-extrabold text-foreground">{t("expense.title")}</Text>
          <View style={{ width: 41 }} />
        </View>

        <View style={{ marginTop: 18, borderRadius: 18, padding: 16, backgroundColor: `${colors.primary}12`, borderWidth: 1, borderColor: `${colors.primary}30` }}>
          <Text className="text-xs font-bold text-muted">{t("expense.totalLabel")}</Text>
          <Text style={{ marginTop: 4, color: colors.primary, fontSize: 27, fontWeight: "800" }}>{formatMoney(total)}</Text>
          <Text className="mt-2 text-xs leading-5 text-muted">{t("expense.totalNotice")}</Text>
        </View>

        {isProvider ? (
          <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("expense.add")} accessibilityHint={expanded ? t("expense.close") : t("expense.open")} accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={({ pressed }) => ({ minHeight: 54, paddingHorizontal: 16, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", opacity: pressed ? 0.75 : 1 })}>
              <Text className="text-base font-bold text-foreground">{t("expense.add")}</Text>
              <Text style={{ color: colors.primary, fontWeight: "800" }}>{expanded ? t("expense.close") : t("expense.open")}</Text>
            </Pressable>
            {expanded ? <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 16 }}>
              <Text className="mb-2 text-xs font-bold text-muted">{t("expense.category")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(([value, labelKey]) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(labelKey)} accessibilityState={{ selected: category === value }} onPress={() => setCategory(value)} style={({ pressed }) => ({ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: category === value ? colors.primary : colors.background, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: category === value ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "700" }}>{t(labelKey)}</Text></Pressable>)}
              </View>
              <TextInput accessibilityLabel={t("expense.amountAccessibility")} accessibilityHint={t("expense.amountHint")} value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder={t("expense.amountPlaceholder")} placeholderTextColor={colors.muted} style={{ marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.foreground, minHeight: 48, paddingHorizontal: 12, textAlign: isRTL ? "right" : "left" }} />
              <TextInput accessibilityLabel={t("expense.descriptionAccessibility")} value={description} onChangeText={setDescription} placeholder={t("expense.descriptionPlaceholder")} placeholderTextColor={colors.muted} multiline style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.foreground, minHeight: 72, padding: 12, textAlignVertical: "top", textAlign: isRTL ? "right" : "left" }} />
              <TextInput accessibilityLabel={t("expense.vendorAccessibility")} accessibilityHint={t("expense.vendorHint")} value={vendorName} onChangeText={setVendorName} placeholder={t("expense.vendorPlaceholder")} placeholderTextColor={colors.muted} style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.foreground, minHeight: 48, paddingHorizontal: 12, textAlign: isRTL ? "right" : "left" }} />
              <TextInput accessibilityLabel={t("expense.brandAccessibility")} value={brand} onChangeText={setBrand} placeholder={t("expense.brandPlaceholder")} placeholderTextColor={colors.muted} style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.foreground, minHeight: 48, paddingHorizontal: 12, textAlign: isRTL ? "right" : "left" }} />
              <TextInput accessibilityLabel={t("expense.modelAccessibility")} value={model} onChangeText={setModel} placeholder={t("expense.modelPlaceholder")} placeholderTextColor={colors.muted} style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.foreground, minHeight: 48, paddingHorizontal: 12, textAlign: isRTL ? "right" : "left" }} />
              <TextInput accessibilityLabel={t("expense.quantityAccessibility")} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder={t("expense.quantityPlaceholder")} placeholderTextColor={colors.muted} style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.foreground, minHeight: 48, paddingHorizontal: 12, textAlign: isRTL ? "right" : "left" }} />
              <TextInput accessibilityLabel={t("expense.locationAccessibility")} accessibilityHint={t("expense.locationHint")} value={locationUrl} onChangeText={setLocationUrl} keyboardType="url" autoCapitalize="none" placeholder={t("expense.locationPlaceholder")} placeholderTextColor={colors.muted} style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.foreground, minHeight: 48, paddingHorizontal: 12, textAlign: isRTL ? "right" : "left" }} />
              <Text className="mt-4 text-xs font-bold text-muted">{t("expense.evidenceRole")}</Text>
              <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {EVIDENCE_ROLES.map((role) => <Pressable key={role} accessibilityRole="radio" accessibilityLabel={t(`expense.evidenceRole.${role}`)} accessibilityState={{ selected: evidenceRole === role }} onPress={() => setEvidenceRole(role)} style={({ pressed }) => ({ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: evidenceRole === role ? colors.primary : colors.background, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: evidenceRole === role ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "700" }}>{t(`expense.evidenceRole.${role}`)}</Text></Pressable>)}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={receipt ? t("expense.receiptSelectedAccessibility") : t("expense.receiptAddAccessibility")} accessibilityHint={t("expense.receiptHint")} onPress={pickReceipt} style={({ pressed }) => ({ marginTop: 12, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: colors.primary, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.primary, fontWeight: "800" }}>{receipt ? t("expense.receiptSelected") : t("expense.receiptAdd")}</Text></Pressable>
              <Text className="mt-2 text-xs leading-5 text-muted" style={{ textAlign: isRTL ? "right" : "left" }}>{t("expense.evidenceScanNotice")}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t("expense.saveAccessibility")} accessibilityHint={t("expense.saveHint")} disabled={createExpense.isPending || uploadMedia.isPending} onPress={saveExpense} style={({ pressed }) => ({ marginTop: 12, minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", opacity: pressed || createExpense.isPending || uploadMedia.isPending ? 0.7 : 1 })}><Text className="font-bold text-white">{createExpense.isPending || uploadMedia.isPending ? t("expense.saving") : t("expense.save")}</Text></Pressable>
            </View> : null}
          </View>
        ) : null}

        <Text className="mt-6 text-base font-extrabold text-foreground">{t("expense.records")}</Text>
        {expenses.isLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} /> : null}
        {expenses.isError ? <Text className="mt-3 text-sm text-error">{t("expense.loadFailed")}</Text> : null}
        {!expenses.isLoading && !expenses.isError && expenses.data?.length === 0 ? <Text className="mt-3 text-sm text-muted">{t("expense.empty")}</Text> : null}
        {(expenses.data ?? []).map((expense) => {
          const refund = refundByExpenseId.get(expense.id);
          const pendingRefund = refund?.status === "submitted" || refund?.status === "under_review";
          const refundLabel = refund?.status === "approved" ? t("expense.refund.approved") : refund?.status === "rejected" ? t("expense.refund.rejected") : pendingRefund ? t("expense.refund.pending") : null;
          return <View key={expense.id} style={{ marginTop: 12, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-start", justifyContent: "space-between" }}><View style={{ flex: 1 }}><Text className="text-sm font-bold text-foreground" style={{ textAlign: isRTL ? "right" : "left" }}>{expense.description}</Text><Text className="mt-1 text-xs text-muted" style={{ textAlign: isRTL ? "right" : "left" }}>{t(CATEGORIES.find(([key]) => key === expense.category)?.[1] ?? "expense.defaultCategory")}{expense.vendorName ? ` · ${expense.vendorName}` : ""}</Text></View><Text style={{ color: colors.primary, fontWeight: "800" }}>{formatMoney(expense.amount)}</Text></View>
            {refundLabel ? <Text style={{ marginTop: 10, color: refund?.status === "approved" ? colors.success : refund?.status === "rejected" ? colors.error : colors.muted, fontSize: 12, fontWeight: "800", textAlign: isRTL ? "right" : "left" }}>{refundLabel}{refund ? ` · ${formatMoney(refund.requestedAmount)}` : ""}</Text> : null}
            {isProvider && !refund ? <Pressable accessibilityRole="button" accessibilityLabel={t("expense.refund.requestAccessibility")} accessibilityHint={t("expense.refund.requestHint")} disabled={submitRefund.isPending} onPress={() => submitRefund.mutate({ expenseId: expense.id, requestedAmount: expense.amount, materialAssessmentJson: JSON.stringify({ source: "provider_expense_screen", expenseId: expense.id }) })} style={({ pressed }) => ({ marginTop: 12, alignSelf: isRTL ? "flex-end" : "flex-start", opacity: pressed || submitRefund.isPending ? 0.65 : 1 })}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{t("expense.refund.request")}</Text></Pressable> : null}
            {!isProvider && refund && pendingRefund ? <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, marginTop: 13 }}><Pressable accessibilityRole="button" accessibilityLabel={t("expense.refund.approveAccessibility")} accessibilityHint={t("expense.refund.approveHint")} disabled={resolveRefund.isPending} onPress={() => requestRefundDecision(refund.id, "approved")} style={({ pressed }) => ({ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.primary, opacity: pressed || resolveRefund.isPending ? 0.65 : 1 })}><Text className="text-xs font-bold text-white">{t("expense.refund.approve")}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("expense.refund.rejectAccessibility")} disabled={resolveRefund.isPending} onPress={() => requestRefundDecision(refund.id, "rejected")} style={({ pressed }) => ({ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.error, opacity: pressed || resolveRefund.isPending ? 0.65 : 1 })}><Text style={{ color: colors.error, fontSize: 12, fontWeight: "800" }}>{t("expense.refund.reject")}</Text></Pressable></View> : null}
          </View>;
        })}
      </ScrollView>
    </ScreenContainer>
  );
}
