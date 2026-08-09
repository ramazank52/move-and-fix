import { useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { ESCROW_FLOW_STEPS } from "@/lib/payment";
import { useStripePaymentSheet } from "@/lib/stripe-sdk";
import { trpc } from "@/lib/trpc";

type CheckoutProvider = "iyzico" | "stripe";
type IyzicoBuyer = {
  gsmNumber: string;
  identityNumber: string;
  address: string;
  city: string;
  zipCode: string;
};

const PAYMENT_RETURN_URL = Linking.createURL("payment/return", {
  scheme: "moveandfix",
});
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
const STRIPE_CLIENT_READY =
  /^pk_(test|live)_/.test(STRIPE_PUBLISHABLE_KEY) &&
  !STRIPE_PUBLISHABLE_KEY.toLowerCase().includes("placeholder");
const EMPTY_BUYER: IyzicoBuyer = {
  gsmNumber: "",
  identityNumber: "",
  address: "",
  city: "",
  zipCode: "",
};

function createIdempotencyKey(requestId: number) {
  return `checkout-${requestId}-${Crypto.randomUUID()}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Ödeme işlemi başlatılırken beklenmeyen bir hata oluştu.";
}

function isConfigurationBlocker(message: string) {
  return /yapılandırılmamış|anahtar|credential|callback|publishable|precondition/i.test(
    message,
  );
}

function normalizeBuyer(form: IyzicoBuyer) {
  return {
    gsmNumber: form.gsmNumber.replace(/[^+\d]/g, ""),
    identityNumber: form.identityNumber.replace(/\D/g, ""),
    address: form.address.trim(),
    city: form.city.trim(),
    zipCode: form.zipCode.replace(/\D/g, ""),
  };
}

function validateBuyer(form: IyzicoBuyer) {
  const buyer = normalizeBuyer(form);
  if (!/^(?:\+?90|0)?5\d{9}$/.test(buyer.gsmNumber)) {
    return "Geçerli bir Türkiye cep telefonu numarası girin.";
  }
  if (!/^\d{11}$/.test(buyer.identityNumber)) {
    return "Kimlik numarası 11 rakam olmalıdır.";
  }
  if (buyer.address.length < 10) {
    return "Fatura adresi en az 10 karakter olmalıdır.";
  }
  if (buyer.city.length < 2) return "Geçerli bir şehir adı girin.";
  if (buyer.zipCode && !/^\d{5}$/.test(buyer.zipCode)) {
    return "Posta kodu 5 rakam olmalıdır.";
  }
  return null;
}

export default function CheckoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripePaymentSheet();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = Number(params.requestId ?? 0);
  const idempotencyKey = useRef(createIdempotencyKey(requestId));
  const [processing, setProcessing] = useState(false);
  const [provider, setProvider] = useState<CheckoutProvider>("iyzico");
  const [buyerForm, setBuyerForm] = useState<IyzicoBuyer>(EMPTY_BUYER);

  const quoteQuery = trpc.payments.quote.useQuery(
    { requestId },
    { enabled: Number.isInteger(requestId) && requestId > 0, retry: 1 },
  );
  const walletSummaryQuery = trpc.wallet.summary.useQuery();
  const createPayment = trpc.payments.create.useMutation();
  const initializeGateway = trpc.payments.initializeGateway.useMutation();

  const jobsRoute = () => router.replace("/(tabs)/my-jobs");

  const presentStripe = async (paymentId: number) => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Native Cihaz Gerekli",
        "Stripe PaymentSheet Android veya iOS uygulamasında açılır. Web önizlemede tahsilat yapılmadı.",
      );
      return;
    }
    if (!STRIPE_CLIENT_READY) {
      Alert.alert(
        "Canlı Ödeme BLOCKER",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY yapılandırılmadı. Ödeme niyeti kaydedildi ancak Stripe açılmadı ve tahsilat yapılmadı.",
      );
      return;
    }

    const checkout = await initializeGateway.mutateAsync({
      paymentId,
      provider: "stripe",
      buyer: {},
    });
    if (checkout.provider !== "stripe" || !checkout.clientSecret) {
      throw new Error("Stripe ödeme oturumu eksik yanıt döndürdü.");
    }
    const initialized = await initPaymentSheet({
      merchantDisplayName: "Move&Fix",
      paymentIntentClientSecret: checkout.clientSecret,
      returnURL: PAYMENT_RETURN_URL,
      allowsDelayedPaymentMethods: false,
      style: "automatic",
    });
    if (initialized.error) throw new Error(initialized.error.message);

    const result = await presentPaymentSheet();
    if (result.error) {
      const code = result.error.code?.toLowerCase();
      if (code === "canceled" || code === "cancelled") {
        Alert.alert(
          "Ödeme İptal Edildi",
          "PaymentSheet kapatıldı. Karttan başarılı tahsilat onayı alınmadı.",
        );
        return;
      }
      throw new Error(result.error.message || "Stripe ödemesi tamamlanamadı.");
    }
    Alert.alert(
      "Ödeme Gönderildi",
      "Emanet bakiyesi yalnızca imzalı Stripe webhook’u sunucuda doğrulandıktan sonra güncellenir.",
      [
        { text: "Bu Ekranda Kal", style: "cancel" },
        { text: "İşlerime Dön", onPress: jobsRoute },
      ],
    );
  };

  const presentIyzico = async (paymentId: number) => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Native Cihaz Gerekli",
        "iyzico hosted checkout dönüşü Android veya iOS deep-link oturumunda doğrulanır. Web önizlemede tahsilat yapılmadı.",
      );
      return;
    }
    const validationError = validateBuyer(buyerForm);
    if (validationError) {
      Alert.alert("Bilgileri Kontrol Edin", validationError);
      return;
    }
    const buyer = normalizeBuyer(buyerForm);
    const checkout = await initializeGateway.mutateAsync({
      paymentId,
      provider: "iyzico",
      buyer: { ...buyer, zipCode: buyer.zipCode || undefined },
    });
    if (checkout.provider !== "iyzico" || !checkout.paymentPageUrl) {
      throw new Error("iyzico ödeme oturumu eksik yanıt döndürdü.");
    }

    const result = await WebBrowser.openAuthSessionAsync(
      checkout.paymentPageUrl,
      PAYMENT_RETURN_URL,
    );
    if (result.type === "cancel" || result.type === "dismiss") {
      Alert.alert(
        "Ödeme İptal Edildi",
        "iyzico sayfası tamamlanmadan kapatıldı. Başarılı tahsilat onayı alınmadı.",
      );
      return;
    }
    if (result.type !== "success") {
      throw new Error("iyzico sayfasından doğrulanmış dönüş alınamadı.");
    }
    const rawStatus = Linking.parse(result.url).queryParams?.status;
    const status = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
    if (status !== "success") {
      Alert.alert(
        "Ödeme Tamamlanamadı",
        "iyzico dönüşü başarısız veya belirsiz. Emanet bakiyesi güncellenmedi; tekrar denemeden önce ödeme geçmişini kontrol edin.",
      );
      return;
    }
    Alert.alert(
      "Ödeme Doğrulandı",
      "iyzico dönüşü sunucuda doğrulandı. Emanet durumunu İşlerim ekranından takip edebilirsiniz.",
      [
        { text: "Bu Ekranda Kal", style: "cancel" },
        { text: "İşlerime Dön", onPress: jobsRoute },
      ],
    );
  };

  const handlePayment = async () => {
    if (!quoteQuery.data || processing) return;
    setProcessing(true);
    try {
      const prefix = `checkout-${requestId}-`;
      if (!idempotencyKey.current.startsWith(prefix)) {
        idempotencyKey.current = createIdempotencyKey(requestId);
      }
      const created = await createPayment.mutateAsync({
        requestId: quoteQuery.data.requestId,
        idempotencyKey: idempotencyKey.current,
      });
      if (provider === "stripe") await presentStripe(created.payment.id);
      else await presentIyzico(created.payment.id);
    } catch (error) {
      const message = getErrorMessage(error);
      Alert.alert(
        isConfigurationBlocker(message)
          ? "Canlı Ödeme BLOCKER"
          : "Ödeme Başlatılamadı",
        `${message}\n\nDoğrulanmış gateway sonucu alınmadığı için başarılı ödeme veya emanet bakiyesi oluşturulmadı.`,
      );
    } finally {
      setProcessing(false);
    }
  };

  const updateBuyer = (field: keyof IyzicoBuyer, value: string) => {
    setBuyerForm((current) => ({ ...current, [field]: value }));
  };

  const showWalletStatus = () => {
    const availableBalance = walletSummaryQuery.data?.availableBalance;
    const balanceText =
      typeof availableBalance === "number"
        ? `Kullanılabilir bakiyeniz ₺${availableBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. `
        : "MoveWallet bakiyesi şu anda doğrulanamadı. ";
    Alert.alert(
      "MoveWallet Ödeme BLOCKER",
      `${balanceText}Mevcut güvenli ödeme sözleşmesi yalnızca imzalı Stripe veya iyzico sonucu ile emanet bakiyesi oluşturur. Sunucu tarafı cüzdandan tahsilat ve iade muhasebesi tamamlanmadan sahte ödeme başarısı üretilmez.`,
      [
        { text: "Kapat", style: "cancel" },
        { text: "MoveWallet’a Git", onPress: () => router.push("/(tabs)/wallet") },
      ],
    );
  };

  const renderContent = () => {
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return (
        <StateView
          title="Geçersiz ödeme bağlantısı"
          body="İş numarası eksik veya hatalı."
          icon="exclamationmark.triangle.fill"
          iconColor={colors.error}
          actionLabel="Geri Dön"
          onAction={() => router.back()}
          colors={colors}
        />
      );
    }
    if (quoteQuery.isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stateBody, { color: colors.muted }]}>Güvenli ödeme özeti hazırlanıyor…</Text>
        </View>
      );
    }
    if (quoteQuery.isError || !quoteQuery.data) {
      return (
        <StateView
          title="Ödeme özeti alınamadı"
          body={quoteQuery.error?.message ?? "Lütfen tekrar deneyin."}
          icon="wifi.exclamationmark"
          iconColor={colors.error}
          actionLabel="Yeniden Dene"
          onAction={() => quoteQuery.refetch()}
          colors={colors}
          primary
        />
      );
    }

    const quote = quoteQuery.data;
    const commissionPercent = quote.commissionRateBps / 100;
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Hizmet Özeti</Text>
          <View style={[styles.infoHeader, { marginBottom: 12 }]}> 
            <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}18` }]}> 
              <IconSymbol name="wrench.and.screwdriver.fill" size={18} color={colors.primary} />
            </View>
            <View style={styles.flowCopy}>
              <Text style={[styles.flowTitle, { color: colors.foreground }]}>{quote.requestTitle}</Text>
              <Text style={[styles.flowDescription, { color: colors.muted }]}>Profesyonel: {quote.providerName}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Toplam</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>₺{quote.amount.toLocaleString("tr-TR")}</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <View style={styles.infoHeader}>
            <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}18` }]}>
              <IconSymbol name="shield.fill" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>Move&Fix Emanet Güvencesi</Text>
          </View>
          {ESCROW_FLOW_STEPS.map((step) => (
            <View key={step.step} style={styles.flowRow}>
              <View style={[styles.stepBadge, { backgroundColor: `${colors.primary}18` }]}>
                <Text style={[styles.stepText, { color: colors.primary }]}>{step.step}</Text>
              </View>
              <View style={styles.flowCopy}>
                <Text style={[styles.flowTitle, { color: colors.foreground }]}>{step.title}</Text>
                <Text style={[styles.flowDescription, { color: colors.muted }]}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ücret Dökümü</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <SummaryRow label="Hizmet bedeli" value={`₺${quote.amount.toLocaleString("tr-TR")}`} colors={colors} />
          <SummaryRow label={`Platform komisyonu (%${commissionPercent})`} value={`₺${quote.commissionAmount.toLocaleString("tr-TR")}`} colors={colors} />
          <Text style={[styles.helperText, { color: colors.muted }]}>Komisyon hizmet bedelinden kesilir; müşteriye ayrıca yansıtılmaz.</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Ödenecek Toplam</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>₺{quote.amount.toLocaleString("tr-TR")}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ödeme Yöntemi</Text>
        <ProviderOption
          title="MoveWallet"
          subtitle={
            walletSummaryQuery.isLoading
              ? "Bakiye doğrulanıyor…"
              : walletSummaryQuery.isError || !walletSummaryQuery.data
                ? "Bakiye alınamadı · Ödeme BLOCKER"
                : `Kullanılabilir: ₺${walletSummaryQuery.data.availableBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Ödeme BLOCKER`
          }
          icon="wallet.pass.fill"
          selected={false}
          disabled={processing}
          onPress={showWalletStatus}
          colors={colors}
          warning
        />
        <ProviderOption
          title="iyzico"
          subtitle="Türkiye için güvenli hosted checkout"
          icon="creditcard.fill"
          selected={provider === "iyzico"}
          disabled={processing}
          onPress={() => setProvider("iyzico")}
          colors={colors}
        />
        <ProviderOption
          title="Stripe"
          subtitle={STRIPE_CLIENT_READY ? "Uluslararası kart · PaymentSheet" : "Publishable key BLOCKER"}
          icon="globe"
          selected={provider === "stripe"}
          disabled={processing}
          onPress={() => setProvider("stripe")}
          colors={colors}
          warning={!STRIPE_CLIENT_READY}
        />

        {provider === "iyzico" ? (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fatura Bilgileri</Text>
            <Text style={[styles.helperText, { color: colors.muted }]}>Kart bilgileri Move&Fix’e girilmez. Bu bilgiler iyzico oturumunu açmak için şifreli bağlantıyla sunucuya gönderilir.</Text>
            <CheckoutInput value={buyerForm.gsmNumber} onChangeText={(value) => updateBuyer("gsmNumber", value)} placeholder="Cep telefonu (05xx xxx xx xx)" keyboardType="phone-pad" maxLength={16} colors={colors} />
            <CheckoutInput value={buyerForm.identityNumber} onChangeText={(value) => updateBuyer("identityNumber", value.replace(/\D/g, ""))} placeholder="T.C. kimlik numarası" keyboardType="number-pad" maxLength={11} colors={colors} />
            <CheckoutInput value={buyerForm.address} onChangeText={(value) => updateBuyer("address", value)} placeholder="Fatura adresi" multiline maxLength={500} colors={colors} />
            <View style={styles.formRow}>
              <CheckoutInput value={buyerForm.city} onChangeText={(value) => updateBuyer("city", value)} placeholder="Şehir" maxLength={100} colors={colors} flex />
              <CheckoutInput value={buyerForm.zipCode} onChangeText={(value) => updateBuyer("zipCode", value.replace(/\D/g, ""))} placeholder="Posta kodu" keyboardType="number-pad" maxLength={5} colors={colors} compact />
            </View>
          </View>
        ) : null}

        <View style={[styles.securityNotice, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
          <IconSymbol name="lock.shield.fill" size={17} color={colors.success} />
          <Text style={[styles.securityText, { color: colors.muted }]}>Tutar ve komisyon yalnızca sunucudaki kabul edilmiş tekliften hesaplanır. Emanet durumu sadece doğrulanmış webhook ile değişir.</Text>
        </View>
      </ScrollView>
    );
  };

  const canSubmit = Boolean(quoteQuery.data) && !processing;
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Güvenli Ödeme</Text>
        <View style={styles.headerSpacer} />
      </View>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={54}>
        {renderContent()}
      </KeyboardAvoidingView>
      {quoteQuery.data ? (
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable onPress={handlePayment} disabled={!canSubmit} style={({ pressed }) => [styles.payButton, { backgroundColor: canSubmit ? colors.primary : colors.muted }, pressed && canSubmit && styles.pressed]}>
            {processing ? (
              <View style={styles.processingRow}><ActivityIndicator color="#FFFFFF" /><Text style={styles.processingText}>Güvenli oturum hazırlanıyor…</Text></View>
            ) : (
              <Text style={styles.primaryButtonText}>
                {provider === "iyzico" ? "iyzico" : "Stripe"} ile ₺{quoteQuery.data.amount.toLocaleString("tr-TR")} Öde
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function SummaryRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.summaryRow}><Text style={[styles.label, { color: colors.muted }]}>{label}</Text><Text style={[styles.value, { color: colors.foreground }]}>{value}</Text></View>;
}

function ProviderOption({ title, subtitle, icon, selected, disabled, onPress, colors, warning = false }: { title: string; subtitle: string; icon: Parameters<typeof IconSymbol>[0]["name"]; selected: boolean; disabled: boolean; onPress: () => void; colors: ReturnType<typeof useColors>; warning?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.methodCard, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }, pressed && styles.pressed]}>
      <View style={[styles.methodIcon, { backgroundColor: `${colors.primary}18` }]}><IconSymbol name={icon} size={22} color={colors.primary} /></View>
      <View style={styles.methodCopy}><Text style={[styles.methodTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.methodStatus, { color: warning ? colors.warning : colors.muted }]}>{subtitle}</Text></View>
      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View>
    </Pressable>
  );
}

function CheckoutInput({ value, onChangeText, placeholder, colors, keyboardType = "default", maxLength, multiline = false, flex = false, compact = false }: { value: string; onChangeText: (value: string) => void; placeholder: string; colors: ReturnType<typeof useColors>; keyboardType?: "default" | "phone-pad" | "number-pad"; maxLength?: number; multiline?: boolean; flex?: boolean; compact?: boolean }) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} maxLength={maxLength} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} style={[styles.input, multiline && styles.addressInput, flex && styles.flexInput, compact && styles.compactInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} />;
}

function StateView({ title, body, icon, iconColor, actionLabel, onAction, colors, primary = false }: { title: string; body: string; icon: Parameters<typeof IconSymbol>[0]["name"]; iconColor: string; actionLabel: string; onAction: () => void; colors: ReturnType<typeof useColors>; primary?: boolean }) {
  return <View style={styles.centerState}><IconSymbol name={icon} size={34} color={iconColor} /><Text style={[styles.stateTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.stateBody, { color: colors.muted }]}>{body}</Text><Pressable onPress={onAction} style={[primary ? styles.primaryButton : styles.secondaryButton, { backgroundColor: primary ? colors.primary : "transparent", borderColor: colors.border }]}><Text style={primary ? styles.primaryButtonText : [styles.secondaryButtonText, { color: colors.foreground }]}>{actionLabel}</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  content: { flex: 1 }, header: { height: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth }, headerButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" }, headerTitle: { flex: 1, textAlign: "center", fontSize: 17, lineHeight: 22, fontWeight: "700" }, headerSpacer: { width: 36 },
  scrollContent: { padding: 20, paddingBottom: 132, gap: 16 }, card: { borderRadius: 18, padding: 18, borderWidth: StyleSheet.hairlineWidth, gap: 12 }, sectionTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" }, summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }, label: { flex: 1, fontSize: 14, lineHeight: 20 }, value: { maxWidth: "50%", textAlign: "right", fontSize: 14, lineHeight: 20, fontWeight: "600" }, divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 }, totalLabel: { fontSize: 16, lineHeight: 22, fontWeight: "800" }, totalValue: { fontSize: 18, lineHeight: 22, fontWeight: "800" },
  infoCard: { borderRadius: 18, padding: 18, borderWidth: StyleSheet.hairlineWidth }, infoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 }, infoIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" }, infoTitle: { marginLeft: 10, fontSize: 15, lineHeight: 20, fontWeight: "700" }, flowRow: { flexDirection: "row", marginBottom: 10 }, stepBadge: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 1 }, stepText: { fontSize: 11, lineHeight: 15, fontWeight: "800" }, flowCopy: { flex: 1 }, flowTitle: { fontSize: 13, lineHeight: 18, fontWeight: "600" }, flowDescription: { marginTop: 2, fontSize: 12, lineHeight: 17 }, helperText: { fontSize: 12, lineHeight: 17 },
  methodCard: { minHeight: 76, flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 14 }, methodIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, methodCopy: { flex: 1, marginLeft: 12 }, methodTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" }, methodStatus: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: "600" }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", marginLeft: 8 }, radioDot: { width: 10, height: 10, borderRadius: 5 },
  formCard: { borderRadius: 18, padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12 }, input: { minHeight: 48, borderRadius: 13, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, lineHeight: 20 }, addressInput: { minHeight: 88 }, formRow: { flexDirection: "row", gap: 10 }, flexInput: { flex: 1 }, compactInput: { width: 122 },
  securityNotice: { flexDirection: "row", alignItems: "flex-start", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14 }, securityText: { flex: 1, marginLeft: 8, fontSize: 12, lineHeight: 18 }, centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 }, stateTitle: { marginTop: 4, textAlign: "center", fontSize: 18, lineHeight: 24, fontWeight: "700" }, stateBody: { textAlign: "center", fontSize: 14, lineHeight: 20 }, primaryButton: { minHeight: 46, minWidth: 150, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }, secondaryButton: { minHeight: 46, minWidth: 140, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }, secondaryButtonText: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, borderTopWidth: StyleSheet.hairlineWidth }, payButton: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" }, primaryButtonText: { color: "#FFFFFF", fontSize: 16, lineHeight: 21, fontWeight: "700" }, processingRow: { flexDirection: "row", alignItems: "center", gap: 10 }, processingText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20, fontWeight: "700" }, pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
});
