import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { readUriAsBase64 } from "@/lib/file-to-base64";

const CATEGORIES = [
  ["fuel", "Yakıt"], ["toll", "Otoyol / köprü"], ["parking", "Otopark"], ["material", "Malzeme"],
  ["part", "Yedek parça"], ["paint", "Boya"], ["equipment", "Ekipman"], ["transport", "Taşıma"],
  ["packaging", "Ambalaj"], ["other", "Diğer"],
] as const;

type ExpenseCategory = (typeof CATEGORIES)[number][0];
type ExpenseMediaMime = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";
const ALLOWED_EXPENSE_MIME_TYPES = new Set<ExpenseMediaMime>(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function money(value: number) {
  return `${value.toLocaleString("tr-TR")} ₺`;
}

export default function JobExpensesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = Number(params.requestId);
  const isProvider = user?.accountType === "provider";
  const utils = trpc.useUtils();

  const [category, setCategory] = useState<ExpenseCategory>("material");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [receipt, setReceipt] = useState<{ uri: string; originalName: string; mimeType: ExpenseMediaMime } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const expenses = trpc.agreements.expenses.useQuery({ requestId }, { enabled: Number.isInteger(requestId) && requestId > 0 });
  const refundRequests = trpc.agreements.expenseRefunds.useQuery({ requestId }, { enabled: Number.isInteger(requestId) && requestId > 0 });
  const uploadMedia = trpc.requests.uploadMedia.useMutation();
  const createExpense = trpc.agreements.createExpense.useMutation({
    onSuccess: async () => {
      await utils.agreements.expenses.invalidate({ requestId });
      setAmount(""); setDescription(""); setVendorName(""); setReceipt(null); setExpanded(false);
      Alert.alert("Masraf kaydedildi", "Masraf otomatik olarak müşteriye borçlandırılmadı. Gerekirse ayrı iade talebi oluşturabilirsiniz.");
    },
  });
  const submitRefund = trpc.agreements.submitExpenseRefund.useMutation({
    onSuccess: async () => {
      await utils.agreements.expenses.invalidate({ requestId });
      await utils.agreements.expenseRefunds.invalidate({ requestId });
      Alert.alert("İade talebi gönderildi", "Talep kayıt altına alındı; müşteriden ayrıca onay alınmadan tahsilat yapılmaz.");
    },
  });
  const resolveRefund = trpc.agreements.resolveExpenseRefund.useMutation({
    onSuccess: async (result) => {
      await utils.agreements.expenseRefunds.invalidate({ requestId });
      Alert.alert(result.status === "approved" ? "Talep onaylandı" : "Talep reddedildi", "Bu karar yalnız masraf talebini kaydeder; hesabınızdan otomatik tahsilat yapılmaz.");
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
      decision === "approved" ? "İade talebini onayla" : "İade talebini reddet",
      decision === "approved"
        ? "Bu işlem otomatik tahsilat oluşturmaz; yalnız talebin onay kaydını tutar."
        : "Talep reddedilir ve bu masraf için yeni bir talep otomatik oluşturulmaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: decision === "approved" ? "Onayla" : "Reddet",
          style: decision === "approved" ? "default" : "destructive",
          onPress: () => resolveRefund.mutate({ refundRequestId, decision }),
        },
      ],
    );
  };

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Galeri izni gerekli", "Masraf belgesi eklemek için fotoğraf arşivinize erişim izni vermelisiniz.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    if (!ALLOWED_EXPENSE_MIME_TYPES.has(mimeType as ExpenseMediaMime) || (asset.fileSize != null && asset.fileSize > 10 * 1024 * 1024)) {
      Alert.alert("Belge eklenemedi", "Yalnız en fazla 10 MB boyutunda görsel kanıt ekleyebilirsiniz.");
      return;
    }
    setReceipt({ uri: asset.uri, mimeType: mimeType as ExpenseMediaMime, originalName: asset.fileName ?? `masraf-${Date.now()}.jpg` });
  };

  const saveExpense = async () => {
    const normalizedAmount = Number(amount.replace(/[^0-9]/g, ""));
    if (!Number.isInteger(normalizedAmount) || normalizedAmount <= 0) {
      Alert.alert("Tutar gerekli", "Masraf tutarını tam Türk lirası olarak girin.");
      return;
    }
    if (description.trim().length < 3) {
      Alert.alert("Açıklama gerekli", "Masraf için en az 3 karakter açıklama girin.");
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
        mediaIds,
      });
    } catch (error) {
      Alert.alert("Masraf kaydedilemedi", error instanceof Error ? error.message : "İşlem güvenli biçimde tamamlanamadı.");
    }
  };

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return <ScreenContainer className="items-center justify-center p-6"><Text className="text-center text-muted">Geçerli bir iş seçilmedi.</Text></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between">
          <Pressable accessibilityRole="button" accessibilityLabel="Geri" accessibilityHint="Önceki ekrana döner" onPress={() => router.back()} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}>
            <IconSymbol name="chevron.left" size={25} color={colors.foreground} />
          </Pressable>
          <Text className="text-lg font-extrabold text-foreground">İş masrafları</Text>
          <View style={{ width: 41 }} />
        </View>

        <View style={{ marginTop: 18, borderRadius: 18, padding: 16, backgroundColor: `${colors.primary}12`, borderWidth: 1, borderColor: `${colors.primary}30` }}>
          <Text className="text-xs font-bold text-muted">TOPLAM KAYITLI MASRAF</Text>
          <Text style={{ marginTop: 4, color: colors.primary, fontSize: 27, fontWeight: "800" }}>{money(total)}</Text>
          <Text className="mt-2 text-xs leading-5 text-muted">Kayıtlı masraf, müşteri hesabına otomatik borç oluşturmaz. İade talebi ayrı onay sürecidir.</Text>
        </View>

        {isProvider ? (
          <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Masraf ekle" accessibilityHint="Masraf kayıt formunu açar veya kapatır" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={({ pressed }) => ({ minHeight: 54, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: pressed ? 0.75 : 1 })}>
              <Text className="text-base font-bold text-foreground">Masraf ekle</Text>
              <Text style={{ color: colors.primary, fontWeight: "800" }}>{expanded ? "Kapat" : "Aç"}</Text>
            </Pressable>
            {expanded ? <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 16 }}>
              <Text className="mb-2 text-xs font-bold text-muted">KATEGORİ</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected: category === value }} onPress={() => setCategory(value)} style={({ pressed }) => ({ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: category === value ? colors.primary : colors.background, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: category === value ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "700" }}>{label}</Text></Pressable>)}
              </View>
              <TextInput accessibilityLabel="Masraf tutarı" accessibilityHint="Türk lirası cinsinden masraf tutarını girin" value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="Tutar (TL)" placeholderTextColor={colors.muted} style={{ marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.foreground, minHeight: 48, paddingHorizontal: 12 }} />
              <TextInput accessibilityLabel="Masraf açıklaması" value={description} onChangeText={setDescription} placeholder="Masraf açıklaması" placeholderTextColor={colors.muted} multiline style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.foreground, minHeight: 72, padding: 12, textAlignVertical: "top" }} />
              <TextInput accessibilityLabel="Satıcı veya mağaza adı" accessibilityHint="İsteğe bağlı" value={vendorName} onChangeText={setVendorName} placeholder="Satıcı / mağaza (opsiyonel)" placeholderTextColor={colors.muted} style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.foreground, minHeight: 48, paddingHorizontal: 12 }} />
              <Pressable accessibilityRole="button" accessibilityLabel={receipt ? "Masraf belgesi seçildi" : "Fiş veya belge görseli ekle"} accessibilityHint="Masraf kanıtı olarak bir görsel seçer" onPress={pickReceipt} style={({ pressed }) => ({ marginTop: 12, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: colors.primary, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.primary, fontWeight: "800" }}>{receipt ? "Belge seçildi" : "Fiş / belge görseli ekle"}</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Masrafı kaydet" accessibilityHint="Masraf kaydını güvenli olarak oluşturur" disabled={createExpense.isPending || uploadMedia.isPending} onPress={saveExpense} style={({ pressed }) => ({ marginTop: 12, minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", opacity: pressed || createExpense.isPending || uploadMedia.isPending ? 0.7 : 1 })}><Text className="font-bold text-white">{createExpense.isPending || uploadMedia.isPending ? "Kaydediliyor…" : "Masrafı kaydet"}</Text></Pressable>
            </View> : null}
          </View>
        ) : null}

        <Text className="mt-6 text-base font-extrabold text-foreground">Kayıtlar</Text>
        {expenses.isLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} /> : null}
        {expenses.isError ? <Text className="mt-3 text-sm text-error">Masraflar yüklenemedi. Lütfen tekrar deneyin.</Text> : null}
        {!expenses.isLoading && !expenses.isError && expenses.data?.length === 0 ? <Text className="mt-3 text-sm text-muted">Bu iş için henüz masraf kaydı bulunmuyor.</Text> : null}
        {(expenses.data ?? []).map((expense) => {
          const refund = refundByExpenseId.get(expense.id);
          const pendingRefund = refund?.status === "submitted" || refund?.status === "under_review";
          const refundLabel = refund?.status === "approved" ? "İade talebi onaylandı" : refund?.status === "rejected" ? "İade talebi reddedildi" : pendingRefund ? "İade talebi müşteri onayında" : null;
          return <View key={expense.id} style={{ marginTop: 12, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
            <View className="flex-row items-start justify-between"><View className="flex-1"><Text className="text-sm font-bold text-foreground">{expense.description}</Text><Text className="mt-1 text-xs text-muted">{CATEGORIES.find(([key]) => key === expense.category)?.[1] ?? "Masraf"}{expense.vendorName ? ` · ${expense.vendorName}` : ""}</Text></View><Text style={{ color: colors.primary, fontWeight: "800" }}>{money(expense.amount)}</Text></View>
            {refundLabel ? <Text style={{ marginTop: 10, color: refund?.status === "approved" ? colors.success : refund?.status === "rejected" ? colors.error : colors.muted, fontSize: 12, fontWeight: "800" }}>{refundLabel}{refund ? ` · ${money(refund.requestedAmount)}` : ""}</Text> : null}
            {isProvider && !refund ? <Pressable accessibilityRole="button" accessibilityLabel="Bu masraf için iade talep et" accessibilityHint="Müşteri onayına sunulan geri ödeme talebi oluşturur" disabled={submitRefund.isPending} onPress={() => submitRefund.mutate({ expenseId: expense.id, requestedAmount: expense.amount, materialAssessmentJson: JSON.stringify({ source: "provider_expense_screen", expenseId: expense.id }) })} style={({ pressed }) => ({ marginTop: 12, alignSelf: "flex-start", opacity: pressed || submitRefund.isPending ? 0.65 : 1 })}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>Bu masraf için iade talep et</Text></Pressable> : null}
            {!isProvider && refund && pendingRefund ? <View style={{ flexDirection: "row", gap: 10, marginTop: 13 }}><Pressable accessibilityRole="button" accessibilityLabel="İade talebini onayla" accessibilityHint="Talebi onaylar; otomatik tahsilat başlatmaz" disabled={resolveRefund.isPending} onPress={() => requestRefundDecision(refund.id, "approved")} style={({ pressed }) => ({ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.primary, opacity: pressed || resolveRefund.isPending ? 0.65 : 1 })}><Text className="text-xs font-bold text-white">Onayla</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="İade talebini reddet" disabled={resolveRefund.isPending} onPress={() => requestRefundDecision(refund.id, "rejected")} style={({ pressed }) => ({ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.error, opacity: pressed || resolveRefund.isPending ? 0.65 : 1 })}><Text style={{ color: colors.error, fontSize: 12, fontWeight: "800" }}>Reddet</Text></Pressable></View> : null}
          </View>;
        })}
      </ScrollView>
    </ScreenContainer>
  );
}
